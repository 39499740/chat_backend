import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';
import { Inject } from '@nestjs/common';
import { ChatGateway } from '../../websocket/chat.gateway';
import { MediaMessageService } from './media-message.service';

@Injectable()
export class MessagesService {
  constructor(
    private db: DatabaseService,
    @Inject(ChatGateway) private chatGateway: ChatGateway,
    private mediaMessageService: MediaMessageService,
  ) {}

  async sendMessage(senderId: string, conversationId: string, messageData: any, broadcast = false) {
    const { type, content, media_urls, reply_to_id } = messageData;

    // 验证消息内容
    this.mediaMessageService.validateMessageContent(type, content, media_urls);

    // 检查用户是否在会话中
    const membershipResult = await this.db.query(
      `SELECT * FROM conversation_members
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, senderId],
    );

    if (membershipResult.rows.length === 0) {
      throw new ForbiddenException('不是会话成员');
    }

    // 如果有媒体URL，验证URL
    if (media_urls && media_urls.length > 0) {
      const isValid = await this.mediaMessageService.validateMediaUrls(media_urls);
      if (!isValid) {
        throw new BadRequestException('媒体URL无效');
      }
    }

    await this.db.query(
      `INSERT INTO messages (conversation_id, sender_id, type, content, media_urls, reply_to_id, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [conversationId, senderId, type || 0, content || '', media_urls || [], reply_to_id || null],
    );

    const result = await this.db.query(
      `SELECT * FROM messages
       WHERE conversation_id = $1 AND sender_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [conversationId, senderId],
    );

    const message = result.rows[0];

    // 根据消息类型处理媒体消息
    switch (type) {
      case 1: // IMAGE
        if (media_urls && media_urls.length > 0) {
          await this.mediaMessageService.processImageMessage(message.id, media_urls);
        }
        break;
      case 2: // AUDIO
        if (media_urls && media_urls.length > 0) {
          await this.mediaMessageService.processAudioMessage(message.id, media_urls);
        }
        break;
      case 3: // VIDEO
        if (media_urls && media_urls.length > 0) {
          await this.mediaMessageService.processVideoMessage(message.id, media_urls);
        }
        break;
      case 4: // EMOJI
        if (content) {
          await this.mediaMessageService.processEmojiMessage(message.id, content);
        }
        break;
      case 5: // FILE
        if (media_urls && media_urls.length > 0) {
          await this.mediaMessageService.processFileMessage(message.id, media_urls);
        }
        break;
    }

    // 更新会话的最后活动时间
    await this.db.query(`UPDATE conversations SET updated_at = NOW() WHERE id = $1`, [
      conversationId,
    ]);

    // 如果需要广播消息，通过WebSocket推送
    if (broadcast) {
      // 获取发送者信息
      const userResult = await this.db.query(
        `SELECT id, username, nickname, avatar_url FROM users WHERE id = $1`,
        [senderId],
      );

      const sender = userResult.rows[0];

      // 广播消息到会话中的所有用户
      if (this.chatGateway && this.chatGateway['server']) {
        this.chatGateway['server'].to(`conversation:${conversationId}`).emit('message', {
          ...message,
          sender: {
            id: sender.id,
            username: sender.username,
            nickname: sender.nickname,
            avatar_url: sender.avatar_url,
          },
        });
      }
    }

    return message;
  }

  async getMessages(conversationId: string, userId: string, query: any) {
    const { page = 1, limit = 20, type = undefined } = query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE conversation_id = $1 AND is_deleted = false';
    const params: any[] = [limit, offset];

    if (type !== undefined) {
      whereClause += ` AND type = $${params.length + 1}`;
      params.push(type);
    }

    const result = await this.db.query(
      `SELECT m.*, u.username, u.nickname, u.avatar_url
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       ${whereClause}
       ORDER BY m.created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [conversationId, ...params],
    );

    // 获取总数
    const countResult = await this.db.query(
      `SELECT COUNT(*) as total
       FROM messages m
       ${whereClause}`,
      type !== undefined ? [conversationId, type] : [conversationId],
    );

    return {
      messages: result.rows,
      total: parseInt((countResult.rows[0] as any).total),
      page,
      limit,
    };
  }

  async getMessage(messageId: string, userId: string) {
    const result = await this.db.query(
      `SELECT m.*, u.username, u.nickname, u.avatar_url
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.id = $1 AND m.is_deleted = false`,
      [messageId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('消息不存在');
    }

    void userId;
    return result.rows[0];
  }

  async deleteMessage(messageId: string, userId: string) {
    const messageResult = await this.db.query(
      `SELECT * FROM messages WHERE id = $1 AND sender_id = $2`,
      [messageId, userId],
    );

    if (messageResult.rows.length === 0) {
      throw new NotFoundException('消息不存在或无权限删除');
    }

    if (messageResult.rows[0].sender_id !== userId) {
      throw new ForbiddenException('只能删除自己的消息');
    }

    await this.db.query(`UPDATE messages SET is_deleted = true WHERE id = $1`, [messageId]);

    return { message: '消息删除成功' };
  }

  async markAsRead(messageId: string, userId: string) {
    const messageResult = await this.db.query(
      `SELECT m.*, cm.user_id as is_read
       FROM messages m
       LEFT JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
       WHERE m.id = $1 AND m.is_deleted = false`,
      [messageId, userId],
    );

    if (messageResult.rows.length === 0) {
      throw new NotFoundException('消息不存在');
    }

    // 更新会话成员的阅读时间（如果是自己发的消息，则不需要更新）
    if (messageResult.rows[0].sender_id !== userId) {
      await this.db.query(
        `UPDATE conversation_members SET last_read_at = NOW()
         WHERE conversation_id = (
           SELECT conversation_id
           FROM messages
           WHERE id = $1
         )
           AND user_id = $2`,
        [messageId, userId],
      );
    }

    // TODO: 实现消息回执（receipts）
    // await this.createMessageReceipt(messageId, userId, 'read');

    return { message: '标记已读' };
  }

  async getUnreadCount(conversationId: string, userId: string) {
    const result = await this.db.query(
      `SELECT COUNT(*) as count
       FROM messages m
       JOIN conversation_members cm ON cm.conversation_id = m.conversation_id
       WHERE m.conversation_id = $1
         AND cm.user_id = $2
         AND m.is_deleted = false
         AND (
           cm.last_read_at IS NULL
           OR cm.last_read_at < m.created_at
         )`,
      [conversationId, userId],
    );

    return parseInt((result.rows[0] as any).count);
  }

  async getConversationHistory(conversationId: string, userId: string, lastMessageId?: string) {
    void lastMessageId;
    const result = await this.db.query(
      `SELECT m.*, u.username, u.nickname, u.avatar_url
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = $1
         AND m.is_deleted = false
       ORDER BY m.created_at DESC
       LIMIT 50`,
      [conversationId],
    );

    void userId;
    return result.rows;
  }

  /**
   * 获取消息的媒体信息
   */
  async getMessageMediaInfo(messageId: string, userId: string) {
    void userId;
    await this.getMessage(messageId, userId);
    return await this.mediaMessageService.getMessageMediaInfo(messageId);
  }
}
