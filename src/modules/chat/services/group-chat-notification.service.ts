import { Injectable, Logger } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { ChatGateway } from '../../websocket/chat.gateway';
import { DatabaseService } from '../../../common/database/database.service';

@Injectable()
export class GroupChatNotificationService {
  private readonly logger = new Logger(GroupChatNotificationService.name);

  constructor(
    private db: DatabaseService,
    @Inject(ChatGateway) private chatGateway: ChatGateway,
  ) {}

  /**
   * 通知群聊成员已添加
   */
  async notifyMemberAdded(conversationId: string, addedUserId: string, addedBy: string) {
    try {
      // 获取添加者信息
      const addedByResult = await this.db.query(
        `SELECT id, username, nickname FROM users WHERE id = $1`,
        [addedBy],
      );

      // 获取被添加者信息
      const addedUserResult = await this.db.query(
        `SELECT id, username, nickname FROM users WHERE id = $1`,
        [addedUserId],
      );

      const notification = {
        type: 'member_added',
        conversationId,
        addedBy: {
          id: addedBy,
          username: addedByResult.rows[0]?.username,
          nickname: addedByResult.rows[0]?.nickname,
        },
        user: {
          id: addedUserId,
          username: addedUserResult.rows[0]?.username,
          nickname: addedUserResult.rows[0]?.nickname,
        },
        timestamp: new Date().toISOString(),
      };

      // 广播到群聊房间
      if (this.chatGateway && this.chatGateway['server']) {
        this.chatGateway['server']
          .to(`conversation:${conversationId}`)
          .emit('group_notification', notification);
      }

      this.logger.log(`Member ${addedUserId} added to conversation ${conversationId}`);
    } catch (error) {
      this.logger.error('Error notifying member added:', error);
    }
  }

  /**
   * 通知群聊成员已移除
   */
  async notifyMemberRemoved(conversationId: string, removedUserId: string, removedBy: string) {
    try {
      // 获取移除者信息
      const removedByResult = await this.db.query(
        `SELECT id, username, nickname FROM users WHERE id = $1`,
        [removedBy],
      );

      // 获取被移除者信息
      const removedUserResult = await this.db.query(
        `SELECT id, username, nickname FROM users WHERE id = $1`,
        [removedUserId],
      );

      const notification = {
        type: 'member_removed',
        conversationId,
        removedBy: {
          id: removedBy,
          username: removedByResult.rows[0]?.username,
          nickname: removedByResult.rows[0]?.nickname,
        },
        user: {
          id: removedUserId,
          username: removedUserResult.rows[0]?.username,
          nickname: removedUserResult.rows[0]?.nickname,
        },
        timestamp: new Date().toISOString(),
      };

      // 广播到群聊房间
      if (this.chatGateway && this.chatGateway['server']) {
        this.chatGateway['server']
          .to(`conversation:${conversationId}`)
          .emit('group_notification', notification);
      }

      this.logger.log(`Member ${removedUserId} removed from conversation ${conversationId}`);
    } catch (error) {
      this.logger.error('Error notifying member removed:', error);
    }
  }

  /**
   * 通知群聊信息已更新
   */
  async notifyGroupUpdated(conversationId: string, updatedBy: string, updates: any) {
    try {
      // 获取更新者信息
      const updatedByResult = await this.db.query(
        `SELECT id, username, nickname FROM users WHERE id = $1`,
        [updatedBy],
      );

      const notification = {
        type: 'group_updated',
        conversationId,
        updatedBy: {
          id: updatedBy,
          username: updatedByResult.rows[0]?.username,
          nickname: updatedByResult.rows[0]?.nickname,
        },
        updates,
        timestamp: new Date().toISOString(),
      };

      // 广播到群聊房间
      if (this.chatGateway && this.chatGateway['server']) {
        this.chatGateway['server']
          .to(`conversation:${conversationId}`)
          .emit('group_notification', notification);
      }

      this.logger.log(`Group ${conversationId} updated by ${updatedBy}`);
    } catch (error) {
      this.logger.error('Error notifying group updated:', error);
    }
  }

  /**
   * 通知成员已离开群聊
   */
  async notifyMemberLeft(conversationId: string, leftUserId: string) {
    try {
      // 获取离开者信息
      const leftUserResult = await this.db.query(
        `SELECT id, username, nickname FROM users WHERE id = $1`,
        [leftUserId],
      );

      const notification = {
        type: 'member_left',
        conversationId,
        user: {
          id: leftUserId,
          username: leftUserResult.rows[0]?.username,
          nickname: leftUserResult.rows[0]?.nickname,
        },
        timestamp: new Date().toISOString(),
      };

      // 广播到群聊房间
      if (this.chatGateway && this.chatGateway['server']) {
        this.chatGateway['server']
          .to(`conversation:${conversationId}`)
          .emit('group_notification', notification);
      }

      this.logger.log(`Member ${leftUserId} left conversation ${conversationId}`);
    } catch (error) {
      this.logger.error('Error notifying member left:', error);
    }
  }

  /**
   * 通知群聊成员变更（批量操作）
   */
  async notifyMembersChanged(
    conversationId: string,
    changes: {
      added?: string[];
      removed?: string[];
      updatedBy: string;
    },
  ) {
    // 分别通知每个添加的成员
    if (changes.added && changes.added.length > 0) {
      for (const userId of changes.added) {
        await this.notifyMemberAdded(conversationId, userId, changes.updatedBy);
      }
    }

    // 分别通知每个移除的成员
    if (changes.removed && changes.removed.length > 0) {
      for (const userId of changes.removed) {
        await this.notifyMemberRemoved(conversationId, userId, changes.updatedBy);
      }
    }
  }
}
