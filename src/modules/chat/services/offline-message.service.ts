import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../../common/database/database.service';
import { Inject } from '@nestjs/common';
import { ChatGateway } from '../../websocket/chat.gateway';
import { RedisService } from '../../../common/services/redis.service';

@Injectable()
export class OfflineMessageService {
  private readonly logger = new Logger(OfflineMessageService.name);
  private readonly OFFLINE_MESSAGE_TTL = 7 * 24 * 60 * 60; // 7天（秒）

  constructor(
    private db: DatabaseService,
    private configService: ConfigService,
    @Inject(ChatGateway) private chatGateway: ChatGateway,
    private redisService: RedisService,
  ) {}

  /**
   * 存储离线消息到Redis
   */
  async storeOfflineMessage(userId: string, message: any): Promise<void> {
    try {
      const key = `offline:message:${userId}`;
      const offlineMessage = {
        id: message.id,
        conversationId: message.conversation_id,
        senderId: message.sender_id,
        type: message.type,
        content: message.content,
        mediaUrls: message.media_urls,
        createdAt: message.created_at,
        sender: message.sender,
      };

      // 将消息添加到Redis列表（LPUSH，最新的在前面）
      await this.redisService.lPush(key, JSON.stringify(offlineMessage));

      // 设置过期时间（7天）
      await this.redisService.expire(key, this.OFFLINE_MESSAGE_TTL);

      this.logger.log(`Offline message stored for user ${userId}: ${message.id}`);
    } catch (error) {
      this.logger.error(
        `Error storing offline message: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * 获取用户的离线消息
   */
  async getOfflineMessages(userId: string): Promise<any[]> {
    try {
      const key = `offline:message:${userId}`;

      // 获取所有离线消息
      const messages = await this.redisService.lRange(key, 0, -1);

      // 转换为对象并按时间排序
      const parsedMessages = messages
        .map((msg) => JSON.parse(msg))
        .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

      this.logger.log(`Retrieved ${parsedMessages.length} offline messages for user ${userId}`);

      return parsedMessages;
    } catch (error) {
      this.logger.error(
        `Error getting offline messages: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return [];
    }
  }

  /**
   * 清除用户的离线消息
   */
  async clearOfflineMessages(userId: string): Promise<number> {
    try {
      const key = `offline:message:${userId}`;
      const count = await this.redisService.del(key);

      this.logger.log(`Cleared ${count} offline messages for user ${userId}`);

      return count;
    } catch (error) {
      this.logger.error(
        `Error clearing offline messages: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return 0;
    }
  }

  /**
   * 发送离线消息给刚上线的用户
   */
  async sendOfflineMessages(userId: string): Promise<void> {
    try {
      // 获取离线消息
      const offlineMessages = await this.getOfflineMessages(userId);

      if (offlineMessages.length === 0) {
        return;
      }

      // 按会话分组
      const messagesByConversation = this.groupMessagesByConversation(offlineMessages);

      // 通过WebSocket发送离线消息
      if (this.chatGateway && this.chatGateway['server']) {
        const userSocketId = this.getSocketIdByUserId(userId);

        if (userSocketId) {
          // 逐个会话发送消息
          for (const [conversationId, messages] of messagesByConversation.entries()) {
            this.chatGateway['server'].to(userSocketId).emit('offline_messages', {
              conversationId,
              messages,
              total: messages.length,
            });
          }

          this.logger.log(`Sent ${offlineMessages.length} offline messages to user ${userId}`);
        }
      }

      // 清除已发送的离线消息
      await this.clearOfflineMessages(userId);
    } catch (error) {
      this.logger.error(
        `Error sending offline messages: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * 按会话分组消息
   */
  private groupMessagesByConversation(messages: any[]): Map<string, any[]> {
    const grouped = new Map<string, any[]>();

    for (const message of messages) {
      const conversationId = message.conversationId;

      if (!grouped.has(conversationId)) {
        grouped.set(conversationId, []);
      }

      grouped.get(conversationId)!.push(message);
    }

    return grouped;
  }

  /**
   * 获取用户的离线消息统计
   */
  async getOfflineMessageStats(userId: string): Promise<{
    total: number;
    conversations: { conversationId: string; count: number }[];
  }> {
    try {
      const messages = await this.getOfflineMessages(userId);

      // 按会话统计
      const conversationCounts = new Map<string, number>();
      for (const message of messages) {
        const conversationId = message.conversationId;
        conversationCounts.set(conversationId, (conversationCounts.get(conversationId) || 0) + 1);
      }

      const conversations = Array.from(conversationCounts.entries()).map(
        ([conversationId, count]) => ({
          conversationId,
          count,
        }),
      );

      return {
        total: messages.length,
        conversations,
      };
    } catch (error) {
      this.logger.error(
        `Error getting offline message stats: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return {
        total: 0,
        conversations: [],
      };
    }
  }

  /**
   * 标记离线消息为已读（数据库层面）
   */
  async markOfflineMessagesAsRead(userId: string, conversationId: string): Promise<void> {
    try {
      // 更新最后阅读时间
      await this.db.query(
        `UPDATE conversation_members SET last_read_at = NOW()
         WHERE conversation_id = $1 AND user_id = $2`,
        [conversationId, userId],
      );

      this.logger.log(
        `Offline messages marked as read for user ${userId}, conversation ${conversationId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error marking offline messages as read: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * 获取离线消息数量（未读消息）
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      // 从Redis获取离线消息
      const offlineMessages = await this.getOfflineMessages(userId);

      // 从数据库查询未读消息
      const result = await this.db.query(
        `SELECT COUNT(*) as count
         FROM messages m
         JOIN conversation_members cm ON m.conversation_id = cm.conversation_id
         WHERE cm.user_id = $1
           AND m.is_deleted = false
           AND m.sender_id != $1
           AND (
             cm.last_read_at IS NULL
             OR cm.last_read_at < m.created_at
           )`,
        [userId],
      );

      const dbUnreadCount = parseInt((result.rows[0] as any).count);

      return offlineMessages.length + dbUnreadCount;
    } catch (error) {
      this.logger.error(
        `Error getting unread count: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
      return 0;
    }
  }

  /**
   * 根据用户ID获取Socket ID
   */
  private getSocketIdByUserId(userId: string): string | null {
    // TODO: 实现从ChatGateway获取用户Socket ID的逻辑
    void userId;
    return null;
  }

  /**
   * 刷新离线消息的过期时间
   */
  async refreshOfflineMessagesTTL(userId: string): Promise<void> {
    try {
      const key = `offline:message:${userId}`;
      await this.redisService.expire(key, this.OFFLINE_MESSAGE_TTL);
    } catch (error) {
      this.logger.error(
        `Error refreshing offline messages TTL: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
