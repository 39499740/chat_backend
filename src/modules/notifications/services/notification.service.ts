import { Injectable, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';
import { Inject } from '@nestjs/common';
import { ChatGateway } from '../../websocket/chat.gateway';
import { RedisService } from '../../../common/services/redis.service';

export enum NotificationType {
  FRIEND_REQUEST = 'friend_request',
  FRIEND_ACCEPTED = 'friend_accepted',
  FRIEND_DECLINED = 'friend_declined',
  POST_LIKE = 'post_like',
  POST_COMMENT = 'post_comment',
  COMMENT_LIKE = 'comment_like',
  MENTION = 'mention',
  MESSAGE = 'message',
  CALL_REQUEST = 'call_request',
  CALL_MISSED = 'call_missed',
  SYSTEM = 'system',
}

export interface NotificationPayload {
  type: NotificationType;
  userId: string;
  title: string;
  content: string;
  data?: any;
  relatedId?: string; // 关联的实体ID（如消息ID、帖子ID等）
  relatedType?: string; // 关联的实体类型（如message、post等）
  metadata?: any; // 额外的元数据
}

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);
  private readonly NOTIFICATION_TTL = 30 * 24 * 60 * 60; // 30天（秒）

  constructor(
    private db: DatabaseService,
    @Inject(ChatGateway) private chatGateway: ChatGateway,
    private redisService: RedisService,
  ) {}

  /**
   * 创建并发送通知
   */
  async createNotification(payload: NotificationPayload): Promise<void> {
    try {
      // 保存到数据库
      const result = await this.db.query(
        `INSERT INTO notifications (user_id, type, title, content, data, related_id, related_type, metadata, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE, NOW())
         RETURNING *`,
        [
          payload.userId,
          payload.type,
          payload.title,
          payload.content,
          JSON.stringify(payload.data || {}),
          payload.relatedId || null,
          payload.relatedType || null,
          JSON.stringify(payload.metadata || {}),
        ],
      );

      const notification = result.rows[0];

      // 缓存到Redis（用于快速获取）
      await this.cacheNotification(notification);

      // 通过WebSocket推送
      await this.pushNotificationToUser(notification);

      this.logger.log(`Notification created for user ${payload.userId}: ${payload.type}`);
    } catch (error) {
      this.logger.error(`Error creating notification: ${error.message}`, error.stack);
    }
  }

  /**
   * 批量创建通知（用于群发场景）
   */
  async createBulkNotifications(
    userIds: string[],
    payload: Omit<NotificationPayload, 'userId'>,
  ): Promise<void> {
    try {
      for (const userId of userIds) {
        await this.createNotification({
          ...payload,
          userId,
        });
      }

      this.logger.log(`Bulk notifications created for ${userIds.length} users`);
    } catch (error) {
      this.logger.error(`Error creating bulk notifications: ${error.message}`, error.stack);
    }
  }

  /**
   * 获取用户的通知列表
   */
  async getUserNotifications(
    userId: string,
    options: {
      page?: number;
      limit?: number;
      type?: NotificationType;
      onlyUnread?: boolean;
    } = {},
  ): Promise<{ notifications: any[]; total: number }> {
    const { page = 1, limit = 20, type, onlyUnread } = options;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE user_id = $1';
    const params: any[] = [userId, limit, offset];

    if (type) {
      whereClause += ` AND type = $${params.length + 1}`;
      params.push(type);
    }

    if (onlyUnread) {
      whereClause += ` AND is_read = FALSE`;
    }

    const result = await this.db.query(
      `SELECT * FROM notifications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    // 获取总数
    const countResult = await this.db.query(
      `SELECT COUNT(*) as total FROM notifications ${whereClause}`,
      type ? [userId, type] : [userId],
    );

    return {
      notifications: result.rows,
      total: parseInt((countResult.rows[0] as any).total),
    };
  }

  /**
   * 获取通知详情
   */
  async getNotification(notificationId: string, userId: string): Promise<any> {
    const result = await this.db.query(
      `SELECT * FROM notifications WHERE id = $1 AND user_id = $2`,
      [notificationId, userId],
    );

    if (result.rows.length === 0) {
      throw new Error('通知不存在');
    }

    return result.rows[0];
  }

  /**
   * 标记通知为已读
   */
  async markAsRead(notificationId: string, userId: string): Promise<void> {
    try {
      const result = await this.db.query(
        `UPDATE notifications SET is_read = TRUE, read_at = NOW()
         WHERE id = $1 AND user_id = $2
         RETURNING *`,
        [notificationId, userId],
      );

      if (result.rows.length === 0) {
        throw new Error('通知不存在');
      }

      const notification = result.rows[0];

      // 从Redis缓存中移除
      await this.removeNotificationFromCache(notification);

      this.logger.log(`Notification marked as read: ${notificationId}`);
    } catch (error) {
      this.logger.error(`Error marking notification as read: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 标记所有通知为已读
   */
  async markAllAsRead(userId: string): Promise<number> {
    try {
      const result = await this.db.query(
        `UPDATE notifications SET is_read = TRUE, read_at = NOW()
         WHERE user_id = $1 AND is_read = FALSE
         RETURNING id`,
        [userId],
      );

      const count = result.rows.length;

      // 清除用户的通知缓存
      await this.clearUserNotificationCache(userId);

      this.logger.log(
        `All notifications marked as read for user ${userId}: ${count} notifications`,
      );

      return count;
    } catch (error) {
      this.logger.error(`Error marking all notifications as read: ${error.message}`, error.stack);
      return 0;
    }
  }

  /**
   * 删除通知
   */
  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    try {
      const result = await this.db.query(
        `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
        [notificationId, userId],
      );

      if (result.rows.length === 0) {
        throw new Error('通知不存在');
      }

      // 从Redis缓存中移除
      await this.removeNotificationFromCache({ id: notificationId });

      this.logger.log(`Notification deleted: ${notificationId}`);
    } catch (error) {
      this.logger.error(`Error deleting notification: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * 获取未读通知数量
   */
  async getUnreadCount(userId: string): Promise<number> {
    try {
      const result = await this.db.query(
        `SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE`,
        [userId],
      );

      return parseInt((result.rows[0] as any).count);
    } catch (error) {
      this.logger.error(`Error getting unread count: ${error.message}`, error.stack);
      return 0;
    }
  }

  /**
   * 推送通知给用户（WebSocket）
   */
  private async pushNotificationToUser(notification: any): Promise<void> {
    try {
      if (this.chatGateway && this.chatGateway['server']) {
        const userSocketId = this.getSocketIdByUserId(notification.user_id);

        if (userSocketId) {
          this.chatGateway['server'].to(userSocketId).emit('notification', {
            id: notification.id,
            type: notification.type,
            title: notification.title,
            content: notification.content,
            data: JSON.parse(notification.data),
            relatedId: notification.related_id,
            relatedType: notification.related_type,
            metadata: JSON.parse(notification.metadata),
            createdAt: notification.created_at,
          });

          this.logger.log(
            `Notification pushed to user ${notification.user_id}: ${notification.id}`,
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error pushing notification: ${error.message}`, error.stack);
    }
  }

  /**
   * 缓存通知到Redis
   */
  private async cacheNotification(notification: any): Promise<void> {
    try {
      const key = `notification:${notification.user_id}:${notification.id}`;
      await this.redisService.set(key, JSON.stringify(notification), this.NOTIFICATION_TTL);
    } catch (error) {
      this.logger.error(`Error caching notification: ${error.message}`);
    }
  }

  /**
   * 从Redis缓存中移除通知
   */
  private async removeNotificationFromCache(notification: any): Promise<void> {
    try {
      const key = `notification:${notification.user_id}:${notification.id}`;
      await this.redisService.del(key);
    } catch (error) {
      this.logger.error(`Error removing notification from cache: ${error.message}`);
    }
  }

  /**
   * 清除用户的通知缓存
   */
  private async clearUserNotificationCache(userId: string): Promise<void> {
    try {
      const key = `notifications:${userId}`;
      await this.redisService.del(key);
    } catch (error) {
      this.logger.error(`Error clearing user notification cache: ${error.message}`);
    }
  }

  /**
   * 根据用户ID获取Socket ID
   */
  private getSocketIdByUserId(userId: string): string | null {
    // TODO: 实现从ChatGateway获取用户Socket ID的逻辑
    return null;
  }

  /**
   * 好友请求通知
   */
  async notifyFriendRequest(userId: string, requesterId: string, requesterName: string) {
    await this.createNotification({
      type: NotificationType.FRIEND_REQUEST,
      userId,
      title: '好友请求',
      content: `${requesterName} 想要添加你为好友`,
      data: { requesterId, requesterName },
      relatedId: requesterId,
      relatedType: 'friend_request',
    });
  }

  /**
   * 好友接受通知
   */
  async notifyFriendAccepted(userId: string, friendId: string, friendName: string) {
    await this.createNotification({
      type: NotificationType.FRIEND_ACCEPTED,
      userId,
      title: '好友请求已接受',
      content: `${friendName} 已经接受了你的好友请求`,
      data: { friendId, friendName },
      relatedId: friendId,
      relatedType: 'friend',
    });
  }

  /**
   * 帖子被点赞通知
   */
  async notifyPostLiked(userId: string, postId: string, likerName: string) {
    await this.createNotification({
      type: NotificationType.POST_LIKE,
      userId,
      title: '帖子被点赞',
      content: `${likerName} 赞了你的帖子`,
      data: { postId, likerName },
      relatedId: postId,
      relatedType: 'post',
    });
  }

  /**
   * 帖子评论通知
   */
  async notifyPostCommented(
    userId: string,
    postId: string,
    commenterName: string,
    commentContent: string,
  ) {
    await this.createNotification({
      type: NotificationType.POST_COMMENT,
      userId,
      title: '新评论',
      content: `${commenterName} 评论了你的帖子: "${commentContent.substring(0, 50)}..."`,
      data: { postId, commenterName, commentContent },
      relatedId: postId,
      relatedType: 'post',
    });
  }

  /**
   * 评论被点赞通知
   */
  async notifyCommentLiked(userId: string, commentId: string, postId: string, likerName: string) {
    await this.createNotification({
      type: NotificationType.COMMENT_LIKE,
      userId,
      title: '评论被点赞',
      content: `${likerName} 赞了你的评论`,
      data: { commentId, postId, likerName },
      relatedId: commentId,
      relatedType: 'comment',
    });
  }

  /**
   * 新消息通知
   */
  async notifyNewMessage(
    userId: string,
    conversationId: string,
    senderName: string,
    messagePreview: string,
  ) {
    await this.createNotification({
      type: NotificationType.MESSAGE,
      userId,
      title: '新消息',
      content: `${senderName}: ${messagePreview.substring(0, 50)}...`,
      data: { conversationId, senderName, messagePreview },
      relatedId: conversationId,
      relatedType: 'conversation',
    });
  }

  /**
   * 通话请求通知
   */
  async notifyCallRequest(
    userId: string,
    callerId: string,
    callerName: string,
    callType: 'audio' | 'video',
  ) {
    await this.createNotification({
      type: NotificationType.CALL_REQUEST,
      userId,
      title: callType === 'video' ? '视频通话请求' : '语音通话请求',
      content: `${callerName} 正在向你发起${callType === 'video' ? '视频' : '语音'}通话`,
      data: { callerId, callerName, callType },
      relatedId: callerId,
      relatedType: 'call',
    });
  }

  /**
   * 未接来电通知
   */
  async notifyMissedCall(
    userId: string,
    callerId: string,
    callerName: string,
    callType: 'audio' | 'video',
  ) {
    await this.createNotification({
      type: NotificationType.CALL_MISSED,
      userId,
      title: '未接来电',
      content: `${callerName} 向你发起了${callType === 'video' ? '视频' : '语音'}通话`,
      data: { callerId, callerName, callType },
      relatedId: callerId,
      relatedType: 'call',
    });
  }

  /**
   * 系统通知
   */
  async notifySystem(userId: string, title: string, content: string, data?: any) {
    await this.createNotification({
      type: NotificationType.SYSTEM,
      userId,
      title,
      content,
      data,
      relatedType: 'system',
    });
  }
}
