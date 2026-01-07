// @ts-nocheck
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ConversationsService {
  constructor(private db: DatabaseService) {}

  async createConversation(userId: string, createData: any): Promise<string> {

  async createConversation(userId: string, createData: any): Promise<string> {
    const { type, friendId, name, memberIds } = createData;

    if (type === 0) {
      // 单聊：检查好友关系
      if (!friendId) {
        throw new BadRequestException('单聊需要指定好友ID');
      }

      const friendCheck = await this.db.query(
        `SELECT * FROM friendships
         WHERE ((user_a_id = $1 AND user_b_id = $2)
             OR (user_a_id = $2 AND user_b_id = $1))
           AND status = 0`,
        [userId, friendId],
      );

      if (friendCheck.rows.length === 0) {
        throw new BadRequestException('对方不是你的好友');
      }

      // 检查单聊会话是否已存在
      const existingConv = await this.db.query(
        `SELECT id FROM conversations
         WHERE type = 0
           AND id IN (
             SELECT DISTINCT conversation_id
             FROM conversation_members
             WHERE user_id IN ($1, $2)
           )
         LIMIT 1`,
        [userId, friendId],
      );

      if (existingConv.rows.length > 0) {
        // 返回现有会话
        return existingConv.rows[0] as any;
      }

      // 创建单聊会话
      const result = await this.db.query(
        `INSERT INTO conversations (type, updated_at)
         VALUES (0, NOW())
         RETURNING *`,
        [],
      );

      const conversationId = (result.rows[0] as any).id;

      // 添加两个成员
      await this.db.query(
        `INSERT INTO conversation_members (conversation_id, user_id, role)
         VALUES ($1, $2, 0), ($1, $3, 0)`,
        [conversationId, userId, friendId],
      );
    } else {
      // 群聊
      if (!name) {
        throw new BadRequestException('群聊需要指定名称');
      }

      if (!memberIds || memberIds.length === 0) {
        throw new BadRequestException('群聊需要指定成员');
      }

      // 创建群聊会话
      const result = await this.db.query(
        `INSERT INTO conversations (type, name, owner_id, updated_at)
         VALUES (1, $1, $2, NOW())
         RETURNING *`,
        [name, userId],
      );

      const conversationId = result.rows[0].id;

      // 添加群主和成员
      const insertQuery = `INSERT INTO conversation_members (conversation_id, user_id, role) VALUES ($1, $2, 2)` + (memberIds as any[]).map((_, idx) => `, ($1, $$${idx + 3}, 0)`).join('');
      await this.db.query(insertQuery, [conversationId, userId, ...(memberIds as any[])]);
    }

    return conversationId as string;
  }

      const friendCheck = await this.db.query(
        `SELECT * FROM friendships
         WHERE ((user_a_id = $1 AND user_b_id = $2)
             OR (user_a_id = $2 AND user_b_id = $1))
           AND status = 0`,
        [userId, friendId],
      );

      if (friendCheck.rows.length === 0) {
        throw new BadRequestException('对方不是你的好友');
      }

      // 检查单聊会话是否已存在
      const existingConv = await this.db.query(
        `SELECT id FROM conversations
         WHERE type = 0
           AND id IN (
             SELECT DISTINCT conversation_id
             FROM conversation_members
             WHERE user_id IN ($1, $2)
           )
         LIMIT 1`,
        [userId, friendId],
      );

      if (existingConv.rows.length > 0) {
        // 返回现有会话
        conversationId = existingConv.rows[0] as any;
      } else {
      // 创建单聊会话
      const result = await this.db.query(
        `INSERT INTO conversations (type, updated_at)
         VALUES (0, NOW())
         RETURNING *`,
        [],
      );

      const conversationId = (result.rows[0] as any).id;

      // 添加两个成员
      await this.db.query(
        `INSERT INTO conversation_members (conversation_id, user_id, role)
         VALUES ($1, $2, 0), ($1, $3, 0)`,
        [conversationId, userId, friendId],
      );
    }
    } else {
      // 群聊
      if (!name) {
        throw new BadRequestException('群聊需要指定名称');
      }

      if (!memberIds || memberIds.length === 0) {
        throw new BadRequestException('群聊需要指定成员');
      }

      // 创建群聊会话
      const result = await this.db.query(
        `INSERT INTO conversations (type, name, owner_id, updated_at)
           VALUES (1, $1, $2, NOW())
           RETURNING *`,
        [name, userId],
      );

      conversationId = (result.rows[0] as any).id;

      // 添加群主和成员
      const insertQuery = `INSERT INTO conversation_members (conversation_id, user_id, role)
         VALUES ($1, $2, 2)` + (memberIds as any[]).map((_, idx) => `, ($1, $$${idx + 3}, 0)`).join('');
      await this.db.query(insertQuery, [conversationId, userId, ...(memberIds as any[])]);
    }

    return conversationId;
  }

      const friendCheck = await this.db.query(
        `SELECT * FROM friendships
         WHERE ((user_a_id = $1 AND user_b_id = $2)
             OR (user_a_id = $2 AND user_b_id = $1))
           AND status = 0`,
        [userId, friendId],
      );

      if (friendCheck.rows.length === 0) {
        throw new BadRequestException('对方不是你的好友');
      }

      // 检查单聊会话是否已存在
      const existingConv = await this.db.query(
        `SELECT id FROM conversations
         WHERE type = 0
           AND id IN (
             SELECT DISTINCT conversation_id
             FROM conversation_members
             WHERE user_id IN ($1, $2)
           )
         LIMIT 1`,
        [userId, friendId],
      );

      if (existingConv.rows.length > 0) {
        // 返回现有会话
        return existingConv.rows[0];
      }

      // 创建单聊会话
      const result = await this.db.query(
        `INSERT INTO conversations (type, updated_at)
         VALUES (0, NOW())
         RETURNING *`,
        [],
      );

      const conversationId = (result.rows[0] as any).id;

      // 添加两个成员
      await this.db.query(
        `INSERT INTO conversation_members (conversation_id, user_id, role)
         VALUES ($1, $2, 0), ($1, $3, 0)`,
        [conversationId, userId, friendId],
      );
    } else {
      // 群聊
      if (!name) {
        throw new BadRequestException('群聊需要指定名称');
      }

      if (!memberIds || memberIds.length === 0) {
        throw new BadRequestException('群聊需要指定成员');
      }

      // 创建群聊会话
      const result = await this.db.query(
        `INSERT INTO conversations (type, name, owner_id, updated_at)
         VALUES (1, $1, $2, NOW())
         RETURNING *`,
        [name, userId],
      );

      const conversationId = (result.rows[0] as any).id;

      // 添加群主和成员
      const insertQuery = `INSERT INTO conversation_members (conversation_id, user_id, role)
         VALUES ($1, $2, 2)` + (memberIds as any[]).map((_, idx) => `, ($1, $$${idx + 3}, 0)`).join('');
      await this.db.query(insertQuery, [conversationId, userId, ...(memberIds as any[])]);
    }

    return conversationId;
  }

  async getConversations(userId: string, query: any) {
    const { page = 1, limit = 20, type } = query;
    const offset = (page - 1) * limit;

    let whereClause = `WHERE cm.user_id = $1`;
    const params: any[] = [limit, offset];

    if (type !== undefined) {
      whereClause += ` AND c.type = $${params.length + 1}`;
      params.push(type);
    }

    const result = await this.db.query(
      `SELECT c.id, c.type, c.name, c.avatar_url, c.updated_at,
              cm.role as user_role,
              cm.last_read_at,
              (
                SELECT COUNT(*) - 1
                FROM conversation_members
                WHERE conversation_id = c.id
                  AND last_read_at IS NOT NULL
                  AND user_id != $1
              ) as unread_count,
              (
                SELECT json_agg(
                  json_build_object(
                    'id', u.id,
                    'username', u.username,
                    'nickname', u.nickname,
                    'avatar_url', u.avatar_url
                  )
                )
                FROM conversation_members cm2
                JOIN users u ON cm2.user_id = u.id
                WHERE cm2.conversation_id = c.id
                ORDER BY cm2.created_at DESC
                LIMIT 5
              ) as members_preview
       FROM conversations c
       JOIN conversation_members cm ON c.id = cm.conversation_id
       ${whereClause}
       ORDER BY c.updated_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      ...params,
    );

    // 获取总数
    const countResult = await this.db.query(
      `SELECT COUNT(*) as total
       FROM conversation_members cm
       ${whereClause}`,
      type !== undefined ? [userId, type] : [userId],
    );

    return {
      conversations: result.rows,
      total: parseInt((countResult.rows[0] as any).total),
      page,
      limit,
    };
  }

    const result = await this.db.query(
      `SELECT c.id, c.type, c.name, c.avatar_url, c.updated_at,
              cm.role as user_role,
              cm.last_read_at,
              (
                SELECT COUNT(*) - 1
                FROM conversation_members
                WHERE conversation_id = c.id
                  AND last_read_at IS NOT NULL
                  AND user_id != $1
              ) as unread_count,
              (
                SELECT json_agg(
                  json_build_object(
                    'id', u.id,
                    'username', u.username,
                    'nickname', u.nickname,
                    'avatar_url', u.avatar_url
                  )
                )
                FROM conversation_members cm2
                JOIN users u ON cm2.user_id = u.id
                WHERE cm2.conversation_id = c.id
                ORDER BY cm2.created_at DESC
                LIMIT 5
              ) as members_preview
       FROM conversations c
       JOIN conversation_members cm ON c.id = cm.conversation_id
       ${whereClause}
       ORDER BY c.updated_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      ...params,
    );

    // 获取总数
    const countResult = await this.db.query(
      `SELECT COUNT(*) as total
       FROM conversation_members cm
       ${whereClause}`,
      type !== undefined ? [userId, type] : [userId],
    );

    return {
      conversations: result.rows,
      total: parseInt((countResult.rows[0] as any).total),
      page,
      limit,
    };
  }

  async getConversationDetail(conversationId: string, userId: string) {
    // 检查用户是否在会话中
    const membershipResult = await this.db.query(
      `SELECT * FROM conversation_members
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId],
    );

    if (membershipResult.rows.length === 0) {
      throw new NotFoundException('不是会话成员');
    }

    // 更新最后阅读时间
    await this.db.query(
      `UPDATE conversation_members SET last_read_at = NOW()
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId],
    );

    // 获取会话详情
    const result = await this.db.query(
      `SELECT c.*,
              (
                SELECT json_agg(
                  json_build_object(
                    'id', u.id,
                    'username', u.username,
                    'nickname', u.nickname,
                    'avatar_url', u.avatar_url,
                    'role', cm.role,
                    'last_read_at', cm.last_read_at
                  )
                )
                FROM conversation_members cm
                JOIN users u ON cm.user_id = u.id
                WHERE cm.conversation_id = c.id
                ORDER BY cm.created_at DESC
              ) as members
       FROM conversations c
       WHERE c.id = $1`,
      [conversationId],
    );

    return result.rows[0];
  }

  async updateConversation(
    conversationId: string,
    currentUserId: string,
    updateData: any,
  ) {
    const result = await this.db.query(
      `SELECT * FROM conversation_members
       WHERE conversation_id = $1 AND user_id = $2 AND role = 2`,
      [conversationId, currentUserId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('仅群主可以修改会话');
    }

    const { name, avatar_url } = updateData;

    // 构建更新字段
    const fields: string[] = [];
    const params: any[] = [];

    if (name !== undefined) {
      fields.push(`name = $${fields.length + 1}`);
      params.push(name);
    }

    if (avatar_url !== undefined) {
      fields.push(`avatar_url = $${fields.length + 1}`);
      params.push(avatar_url);
    }

    if (fields.length === 0) {
      throw new BadRequestException('没有需要更新的字段');
    }

    fields.push(`updated_at = NOW()`);
    params.push(...params);

    await this.db.query(
      `UPDATE conversations SET ${fields.join(', ')} WHERE id = $${fields.length + 1}`,
      params,
    );

    return { message: '会话更新成功', conversationId: conversationId };
  }

  async leaveConversation(conversationId: string, userId: string) {
    // 检查是否是成员
    const membershipResult = await this.db.query(
      `SELECT * FROM conversation_members
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId],
    );

    if (membershipResult.rows.length === 0) {
      throw new NotFoundException('不是会话成员');
    }

    // 删除成员关系
    await this.db.query(
      `DELETE FROM conversation_members
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId],
    );

    // 检查群聊是否还有成员，如果没有则删除会话
    const countResult = await this.db.query(
      `SELECT COUNT(*) as count FROM conversation_members WHERE conversation_id = $1`,
      [conversationId],
    );

    if (parseInt((countResult.rows[0] as any).count) === 0) {
      await this.db.query(
        `DELETE FROM conversations WHERE id = $1`,
        [conversationId],
      );
    }

    return { message: '已退出会话' };
  }

  async addMember(
    conversationId: string,
    userId: string,
    memberUserId: string,
  ) {
    // 检查是否是群主
    const membershipResult = await this.db.query(
      `SELECT * FROM conversation_members
       WHERE conversation_id = $1 AND user_id = $2 AND role = 2`,
      [conversationId, userId],
    );

    if (membershipResult.rows.length === 0) {
      throw new NotFoundException('仅群主可以添加成员');
    }

    // 检查是否已是成员
    const existingMember = await this.db.query(
      `SELECT * FROM conversation_members
       WHERE conversation_id = $1 AND user_id = $3`,
      [conversationId, memberUserId],
    );

    if (existingMember.rows.length > 0) {
      throw new BadRequestException('该用户已在群聊中');
    }

    // 添加成员
    await this.db.query(
      `INSERT INTO conversation_members (conversation_id, user_id, role)
       VALUES ($1, $2, 0)`,
      [conversationId, memberUserId],
    );

    return { message: '成员添加成功' };
  }

  async removeMember(
    conversationId: string,
    userId: string,
    memberUserId: string,
  ) {
    // 检查权限（群主或管理员）
    const membershipResult = await this.db.query(
      `SELECT * FROM conversation_members
       WHERE conversation_id = $1 AND user_id = $2 AND role IN (1, 2)`,
      [conversationId, userId],
    );

    if (membershipResult.rows.length === 0) {
      throw new NotFoundException('无权限移除成员');
    }

    // 不能移除群主
    const memberRoleResult = await this.db.query(
      `SELECT role FROM conversation_members
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, memberUserId],
    );

    if ((memberRoleResult.rows[0] as any).role === 2) {
      throw new BadRequestException('不能移除群主');
    }

    // 移除成员
    await this.db.query(
      `DELETE FROM conversation_members
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, memberUserId],
    );

    return { message: '成员移除成功' };
  }

  async updateLastReadAt(conversationId: string, userId: string) {
    await this.db.query(
      `UPDATE conversation_members SET last_read_at = NOW()
       WHERE conversation_id = $1 AND user_id = $2`,
      [conversationId, userId],
    );
  }
}
