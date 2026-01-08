import { Injectable, Logger } from '@nestjs/common';
import {
  WebSocketGateway,
  SubscribeMessage,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import {
  MessagePayload,
  OnlineStatusPayload,
  TypingStatusPayload,
} from '../../common/interfaces/gateway.interfaces';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
@Injectable()
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(ChatGateway.name);

  // 存储在线用户
  private onlineUsers = new Map<string, { socket: any; userId: string }>();

  // 存储用户所在的会话
  private userConversations = new Map<string, Set<string>>();

  async handleConnection(client: any) {
    this.logger.log(`Client connected: ${client.id}`);

    // 验证JWT token
    const token = client.handshake.auth.token;
    if (!token) {
      this.logger.warn(`Client ${client.id} connected without token`);
      client.disconnect(true);
      return;
    }

    try {
      // TODO: 验证JWT token并获取userId
      // const decoded = this.authService.verifyToken(token);
      // const userId = decoded.sub;

      // 暂时使用临时userId（需要集成AuthService）
      const userId = (client.handshake as any).query.userId;

      if (!userId) {
        this.logger.warn(`Client ${client.id} connected without userId`);
        client.disconnect(true);
        return;
      }

      this.onlineUsers.set(userId, { socket: client, userId });

      // 通知所有好友该用户上线
      await this.notifyFriendsStatus(userId, 'online');

      // 发送连接成功消息
      client.emit('connected', { userId, message: '连接成功' });
    } catch (error) {
      this.logger.error(`Authentication failed for client ${client.id}:`, error);
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: any) {
    this.logger.log(`Client disconnected: ${client.id}`);

    // 查找并移除在线用户
    for (const [userId, user] of this.onlineUsers.entries()) {
      if (user.socket.id === client.id) {
        this.onlineUsers.delete(userId);

        // 通知所有好友该用户下线
        await this.notifyFriendsStatus(userId, 'offline');

        break;
      }
    }
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(client: Socket, payload: { conversationId: string }) {
    this.logger.log(`Client ${client.id} joining conversation: ${payload.conversationId}`);

    const userId = this.getUserIdBySocket(client.id);
    if (!userId) return;

    // 加入会话房间
    client.join(`conversation:${payload.conversationId}`);

    // 记录用户所在的会话
    if (!this.userConversations.has(userId)) {
      this.userConversations.set(userId, new Set());
    }
    this.userConversations.get(userId)?.add(payload.conversationId);

    // 通知会话中的其他用户
    client.to(`conversation:${payload.conversationId}`).emit('user_joined', {
      userId,
      conversationId: payload.conversationId,
    });
  }

  @SubscribeMessage('leave_conversation')
  async handleLeaveConversation(client: Socket, payload: { conversationId: string }) {
    this.logger.log(`Client ${client.id} leaving conversation: ${payload.conversationId}`);

    const userId = this.getUserIdBySocket(client.id);
    if (!userId) return;

    // 离开会话房间
    client.leave(`conversation:${payload.conversationId}`);

    // 从记录中移除
    this.userConversations.get(userId)?.delete(payload.conversationId);

    // 通知会话中的其他用户
    client.to(`conversation:${payload.conversationId}`).emit('user_left', {
      userId,
      conversationId: payload.conversationId,
    });
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(client: Socket, payload: MessagePayload) {
    this.logger.log(
      `Client ${client.id} sending message to conversation: ${payload.conversationId}`,
    );

    const userId = this.getUserIdBySocket(client.id);
    if (!userId) return;

    // 添加发送者ID和时间戳
    const message: MessagePayload = {
      ...payload,
      senderId: userId,
      createdAt: new Date().toISOString(),
    };

    // 广播消息到会话中的所有用户
    this.server.to(`conversation:${payload.conversationId}`).emit('message', message);
  }

  @SubscribeMessage('typing_start')
  async handleTypingStart(client: Socket, payload: TypingStatusPayload) {
    const userId = this.getUserIdBySocket(client.id);
    if (!userId) return;

    const status: TypingStatusPayload = {
      ...payload,
      userId,
      typing: true,
    };

    // 通知会话中的其他用户
    client.to(`conversation:${payload.conversationId}`).emit('typing_status', status);
  }

  @SubscribeMessage('typing_stop')
  async handleTypingStop(client: Socket, payload: TypingStatusPayload) {
    const userId = this.getUserIdBySocket(client.id);
    if (!userId) return;

    const status: TypingStatusPayload = {
      ...payload,
      userId,
      typing: false,
    };

    // 通知会话中的其他用户
    client.to(`conversation:${payload.conversationId}`).emit('typing_status', status);
  }

  @SubscribeMessage('mark_as_read')
  async handleMarkAsRead(client: Socket, payload: { conversationId: string; messageId: string }) {
    const userId = this.getUserIdBySocket(client.id);
    if (!userId) return;

    // TODO: 更新数据库中的阅读状态
    // await this.messagesService.markAsRead(conversationId, userId, messageId);

    // 通知发送者消息已读
    this.server.to(`conversation:${payload.conversationId}`).emit('message_read', {
      messageId: payload.messageId,
      readBy: userId,
    });
  }

  private getUserIdBySocket(socketId: string): string | null {
    for (const [userId, user] of this.onlineUsers.entries()) {
      if ((user.socket as any).id === socketId) {
        return userId;
      }
    }
    return null;
  }

  private async notifyFriendsStatus(userId: string, status: 'online' | 'offline') {
    // TODO: 查询用户的好友列表
    // const friends = await this.friendsService.getUserFriendsList(userId);

    const payload: OnlineStatusPayload = {
      userId,
      status,
      lastSeen: new Date().toISOString(),
    };

    // 通知所有在线的好友
    for (const [friendUserId, friend] of this.onlineUsers.entries()) {
      // 暂时通知所有在线用户（后续需要优化为仅通知好友）
      this.server.to(friend.socket.id).emit('friend_status', payload as any);
    }
  }

  // 获取在线用户列表
  @SubscribeMessage('get_online_users')
  handleGetOnlineUsers(client: Socket) {
    const userId = this.getUserIdBySocket(client.id);
    if (!userId) return;

    const onlineUserIds = Array.from(this.onlineUsers.keys());

    client.emit('online_users', {
      users: onlineUserIds,
      currentUserId: userId,
    });
  }

  // 获取会话成员列表
  @SubscribeMessage('get_conversation_members')
  async handleGetConversationMembers(client: Socket, payload: { conversationId: string }) {
    const userId = this.getUserIdBySocket(client.id);
    if (!userId) return;

    // TODO: 查询数据库获取会话成员
    // const members = await this.conversationService.getConversationMembers(payload.conversationId);

    const onlineMembers = [];
    const offlineMembers = [];

    for (const [memberId, member] of this.onlineUsers.entries()) {
      if (member.userId === userId) continue; // 不包含自己

      // 暂时返回所有在线用户（后续需要优化为仅返回会话成员）
      onlineMembers.push(memberId);
    }

    client.emit('conversation_members', {
      conversationId: payload.conversationId,
      onlineMembers,
      offlineMembers,
    });
  }
}
