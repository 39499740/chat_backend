import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ChatGateway } from '../chat.gateway';
import { DatabaseService } from '../../../common/database/database.service';

export interface CallOffer {
  callId: string;
  callerId: string;
  calleeId: string;
  type: 'audio' | 'video';
  conversationId: string;
  sdp: RTCSessionDescriptionInit;
  timestamp: string;
}

export interface CallAnswer {
  callId: string;
  calleeId: string;
  sdp: RTCSessionDescriptionInit;
  timestamp: string;
}

export interface CallIceCandidate {
  callId: string;
  userId: string;
  candidate: RTCIceCandidateInit;
  timestamp: string;
}

export enum CallStatus {
  CALLING = 'calling',
  RINGING = 'ringing',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  ENDED = 'ended',
  FAILED = 'failed',
}

export interface ActiveCall {
  callId: string;
  callerId: string;
  calleeId: string;
  type: 'audio' | 'video';
  status: CallStatus;
  conversationId: string;
  startedAt: Date;
  endedAt?: Date;
}

@Injectable()
export class WebRTCService {
  private readonly logger = new Logger(WebRTCService.name);

  // 存储活跃的通话
  private activeCalls = new Map<string, ActiveCall>();

  // 存储用户的通话状态
  private userCallStatus = new Map<string, string | null>(); // userId -> callId

  constructor(
    private db: DatabaseService,
    @Inject(ChatGateway) private chatGateway: ChatGateway,
  ) {}

  /**
   * 发起通话
   */
  async initiateCall(
    callerId: string,
    calleeId: string,
    conversationId: string,
    type: 'audio' | 'video',
    sdp: RTCSessionDescriptionInit,
  ) {
    // 检查被叫方是否在另一个通话中
    if (this.userCallStatus.has(calleeId)) {
      throw new BadRequestException('对方正在通话中');
    }

    // 检查主叫方是否在另一个通话中
    if (this.userCallStatus.has(callerId)) {
      throw new BadRequestException('你正在通话中');
    }

    // 生成通话ID
    const callId = this.generateCallId();

    // 创建活跃通话记录
    const activeCall: ActiveCall = {
      callId,
      callerId,
      calleeId,
      type,
      status: CallStatus.CALLING,
      conversationId,
      startedAt: new Date(),
    };

    this.activeCalls.set(callId, activeCall);
    this.userCallStatus.set(callerId, callId);

    // 发送呼叫邀请给被叫方
    if (this.chatGateway && this.chatGateway['server']) {
      // 获取被叫方的socket连接
      const calleeSocketId = this.getSocketIdByUserId(calleeId);
      if (calleeSocketId) {
        this.chatGateway['server'].to(calleeSocketId).emit('call_offer', {
          callId,
          callerId,
          type,
          conversationId,
          sdp,
          timestamp: new Date().toISOString(),
        } as CallOffer);

        this.logger.log(`Call initiated: ${callerId} -> ${calleeId} (${callId})`);
      } else {
        // 被叫方不在线
        await this.endCall(callId, CallStatus.FAILED);
        throw new BadRequestException('对方不在线');
      }
    }

    return {
      callId,
      status: CallStatus.CALLING,
    };
  }

  /**
   * 接听通话
   */
  async answerCall(calleeId: string, callId: string, sdp: RTCSessionDescriptionInit) {
    const activeCall = this.activeCalls.get(callId);

    if (!activeCall) {
      throw new BadRequestException('通话不存在');
    }

    if (activeCall.calleeId !== calleeId) {
      throw new BadRequestException('你不是该通话的参与者');
    }

    if (activeCall.status !== CallStatus.CALLING && activeCall.status !== CallStatus.RINGING) {
      throw new BadRequestException('通话已结束');
    }

    // 更新通话状态
    activeCall.status = CallStatus.ACCEPTED;
    this.userCallStatus.set(calleeId, callId);

    // 将应答发送给主叫方
    if (this.chatGateway && this.chatGateway['server']) {
      const callerSocketId = this.getSocketIdByUserId(activeCall.callerId);
      if (callerSocketId) {
        this.chatGateway['server'].to(callerSocketId).emit('call_answer', {
          callId,
          calleeId,
          sdp,
          timestamp: new Date().toISOString(),
        } as CallAnswer);

        this.logger.log(`Call accepted: ${callId}`);
      }
    }

    // 通知会话中的其他用户通话已开始
    await this.notifyCallStatus(activeCall.conversationId, activeCall);

    return {
      callId,
      status: CallStatus.ACCEPTED,
    };
  }

  /**
   * 拒绝通话
   */
  async declineCall(calleeId: string, callId: string) {
    const activeCall = this.activeCalls.get(callId);

    if (!activeCall) {
      throw new BadRequestException('通话不存在');
    }

    if (activeCall.calleeId !== calleeId) {
      throw new BadRequestException('你不是该通话的参与者');
    }

    // 更新通话状态
    activeCall.status = CallStatus.DECLINED;

    // 通知主叫方
    if (this.chatGateway && this.chatGateway['server']) {
      const callerSocketId = this.getSocketIdByUserId(activeCall.callerId);
      if (callerSocketId) {
        this.chatGateway['server'].to(callerSocketId).emit('call_declined', {
          callId,
          calleeId,
          timestamp: new Date().toISOString(),
        });

        this.logger.log(`Call declined: ${callId}`);
      }
    }

    // 清理通话记录
    this.activeCalls.delete(callId);
    this.userCallStatus.delete(activeCall.callerId);

    return {
      callId,
      status: CallStatus.DECLINED,
    };
  }

  /**
   * 结束通话
   */
  async endCall(callId: string, status: CallStatus = CallStatus.ENDED, endedBy?: string) {
    const activeCall = this.activeCalls.get(callId);

    if (!activeCall) {
      throw new BadRequestException('通话不存在');
    }

    // 更新通话状态
    activeCall.status = status;
    activeCall.endedAt = new Date();

    // 清理用户通话状态
    this.userCallStatus.delete(activeCall.callerId);
    this.userCallStatus.delete(activeCall.calleeId);

    // 通知双方通话已结束
    if (this.chatGateway && this.chatGateway['server']) {
      const callerSocketId = this.getSocketIdByUserId(activeCall.callerId);
      const calleeSocketId = this.getSocketIdByUserId(activeCall.calleeId);

      const endPayload = {
        callId,
        status,
        endedBy,
        duration: activeCall.endedAt.getTime() - activeCall.startedAt.getTime(),
        timestamp: new Date().toISOString(),
      };

      if (callerSocketId) {
        this.chatGateway['server'].to(callerSocketId).emit('call_ended', endPayload);
      }

      if (calleeSocketId) {
        this.chatGateway['server'].to(calleeSocketId).emit('call_ended', endPayload);
      }

      this.logger.log(`Call ended: ${callId} (${status})`);
    }

    // 通知会话中的其他用户通话已结束
    if (activeCall.status === CallStatus.ACCEPTED) {
      await this.notifyCallStatus(activeCall.conversationId, activeCall);
    }

    // 从活跃通话列表中删除
    this.activeCalls.delete(callId);

    // TODO: 保存通话记录到数据库
    // await this.saveCallRecord(activeCall);

    return {
      callId,
      status,
      duration: activeCall.endedAt
        ? activeCall.endedAt.getTime() - activeCall.startedAt.getTime()
        : 0,
    };
  }

  /**
   * 发送ICE候选者
   */
  async sendIceCandidate(callId: string, userId: string, candidate: RTCIceCandidateInit) {
    const activeCall = this.activeCalls.get(callId);

    if (!activeCall) {
      throw new BadRequestException('通话不存在');
    }

    if (activeCall.callerId !== userId && activeCall.calleeId !== userId) {
      throw new BadRequestException('你不是该通话的参与者');
    }

    // 确定目标用户
    const targetUserId = userId === activeCall.callerId ? activeCall.calleeId : activeCall.callerId;

    // 发送ICE候选者给目标用户
    if (this.chatGateway && this.chatGateway['server']) {
      const targetSocketId = this.getSocketIdByUserId(targetUserId);
      if (targetSocketId) {
        this.chatGateway['server'].to(targetSocketId).emit('ice_candidate', {
          callId,
          userId,
          candidate,
          timestamp: new Date().toISOString(),
        } as CallIceCandidate);

        this.logger.log(`ICE candidate sent: ${callId} (${userId} -> ${targetUserId})`);
      }
    }

    return {
      success: true,
    };
  }

  /**
   * 获取通话状态
   */
  async getCallStatus(callId: string, userId: string) {
    const activeCall = this.activeCalls.get(callId);

    if (!activeCall) {
      throw new BadRequestException('通话不存在');
    }

    // 验证用户是否是参与者
    if (activeCall.callerId !== userId && activeCall.calleeId !== userId) {
      throw new BadRequestException('你不是该通话的参与者');
    }

    return {
      callId: activeCall.callId,
      status: activeCall.status,
      callerId: activeCall.callerId,
      calleeId: activeCall.calleeId,
      type: activeCall.type,
      conversationId: activeCall.conversationId,
      startedAt: activeCall.startedAt,
      endedAt: activeCall.endedAt,
    };
  }

  /**
   * 获取用户的通话状态
   */
  async getUserCallStatus(userId: string) {
    const callId = this.userCallStatus.get(userId);

    if (!callId) {
      return {
        inCall: false,
        callId: null,
      };
    }

    const activeCall = this.activeCalls.get(callId);

    if (!activeCall) {
      this.userCallStatus.delete(userId);
      return {
        inCall: false,
        callId: null,
      };
    }

    return {
      inCall: true,
      callId,
      status: activeCall.status,
      type: activeCall.type,
      callerId: activeCall.callerId,
      calleeId: activeCall.calleeId,
    };
  }

  /**
   * 通知会话中的用户通话状态
   */
  private async notifyCallStatus(conversationId: string, call: ActiveCall) {
    if (this.chatGateway && this.chatGateway['server']) {
      this.chatGateway['server'].to(`conversation:${conversationId}`).emit('call_status', {
        callId: call.callId,
        status: call.status,
        callerId: call.callerId,
        calleeId: call.calleeId,
        type: call.type,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * 根据用户ID获取Socket ID
   * 注意：这需要在ChatGateway中实现对应的方法
   */
  private getSocketIdByUserId(userId: string): string | null {
    // TODO: 实现从ChatGateway获取用户Socket ID的逻辑
    // 可能需要在ChatGateway中添加一个公开的方法来查询用户的Socket连接
    void userId;
    return null; // 临时返回null，需要集成ChatGateway的在线用户映射
  }

  /**
   * 生成通话ID
   */
  private generateCallId(): string {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 保存通话记录到数据库
   */
  private async saveCallRecord(call: ActiveCall) {
    try {
      await this.db.query(
        `INSERT INTO call_records (caller_id, callee_id, type, status, conversation_id, started_at, ended_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          call.callerId,
          call.calleeId,
          call.type,
          call.status,
          call.conversationId,
          call.startedAt,
          call.endedAt,
        ],
      );

      this.logger.log(`Call record saved: ${call.callId}`);
    } catch (error) {
      this.logger.error('Error saving call record:', error);
    }
  }
}
