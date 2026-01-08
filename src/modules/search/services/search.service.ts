import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';

export enum SearchType {
  ALL = 'all',
  USERS = 'users',
  POSTS = 'posts',
  MESSAGES = 'messages',
  CONVERSATIONS = 'conversations',
}

export interface SearchResult<T = any> {
  type: string;
  results: T[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class SearchService {
  private readonly logger = new Logger(SearchService.name);

  constructor(private db: DatabaseService) {}

  /**
   * 通用搜索接口
   */
  async search(
    userId: string,
    query: string,
    type: SearchType = SearchType.ALL,
    options: {
      page?: number;
      limit?: number;
    } = {},
  ): Promise<{
    users?: any[];
    posts?: any[];
    messages?: any[];
    conversations?: any[];
  }> {
    const { page = 1, limit = 20 } = options;

    const searchQuery = `%${query.trim()}%`;

    if (!searchQuery || searchQuery.length < 2) {
      throw new BadRequestException('搜索关键词至少需要2个字符');
    }

    const results: any = {};

    if (type === SearchType.ALL || type === SearchType.USERS) {
      results.users = await this.searchUsers(userId, searchQuery, { page, limit });
    }

    if (type === SearchType.ALL || type === SearchType.POSTS) {
      results.posts = await this.searchPosts(userId, searchQuery, { page, limit });
    }

    if (type === SearchType.ALL || type === SearchType.MESSAGES) {
      results.messages = await this.searchMessages(userId, searchQuery, { page, limit });
    }

    if (type === SearchType.ALL || type === SearchType.CONVERSATIONS) {
      results.conversations = await this.searchConversations(userId, searchQuery, { page, limit });
    }

    return results;
  }

  /**
   * 搜索用户
   */
  async searchUsers(
    userId: string,
    query: string,
    options: {
      page?: number;
      limit?: number;
    } = {},
  ): Promise<SearchResult> {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const result = await this.db.query(
      `SELECT id, username, nickname, avatar_url, bio
       FROM users
       WHERE is_active = TRUE
         AND (
           username ILIKE $1
           OR nickname ILIKE $1
         )
         AND id != $2
       ORDER BY
         CASE
           WHEN username ILIKE $1 THEN 1
           WHEN nickname ILIKE $1 THEN 2
           ELSE 3
         END,
         username
       LIMIT $3 OFFSET $4`,
      [query, userId, limit, offset],
    );

    // 获取总数
    const countResult = await this.db.query(
      `SELECT COUNT(*) as total
       FROM users
       WHERE is_active = TRUE
         AND (
           username ILIKE $1
           OR nickname ILIKE $1
         )
         AND id != $2`,
      [query, userId],
    );

    return {
      type: 'users',
      results: result.rows,
      total: parseInt((countResult.rows[0] as any).total),
      page,
      limit,
    };
  }

  /**
   * 搜索帖子
   */
  async searchPosts(
    userId: string,
    query: string,
    options: {
      page?: number;
      limit?: number;
    } = {},
  ): Promise<SearchResult> {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    // 搜索公开的帖子或好友的帖子
    const result = await this.db.query(
      `SELECT p.id, p.user_id, p.content, p.media_urls, p.created_at,
              u.username, u.nickname, u.avatar_url,
              (SELECT COUNT(*) FROM post_likes WHERE post_id = p.id) as like_count,
              (SELECT COUNT(*) FROM comments WHERE post_id = p.id) as comment_count,
              CASE WHEN pl.id IS NOT NULL THEN TRUE ELSE FALSE END as is_liked
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN post_likes pl ON pl.post_id = p.id AND pl.user_id = $2
       WHERE p.is_deleted = FALSE
         AND (
           p.privacy = 0  -- 公开
           OR p.user_id = $2  -- 自己的帖子
           OR EXISTS (
             SELECT 1 FROM friendships
             WHERE ((user_a_id = p.user_id AND user_b_id = $2)
                OR (user_a_id = $2 AND user_b_id = p.user_id))
               AND status = 0
           )  -- 好友的帖子
         )
         AND (
           p.content ILIKE $1
         )
       ORDER BY p.created_at DESC
       LIMIT $3 OFFSET $4`,
      [query, userId, limit, offset],
    );

    // 获取总数
    const countResult = await this.db.query(
      `SELECT COUNT(*) as total
       FROM posts p
       WHERE p.is_deleted = FALSE
         AND (
           p.privacy = 0
           OR p.user_id = $2
           OR EXISTS (
             SELECT 1 FROM friendships
             WHERE ((user_a_id = p.user_id AND user_b_id = $2)
                OR (user_a_id = $2 AND user_b_id = p.user_id))
               AND status = 0
           )
         )
         AND p.content ILIKE $1`,
      [query, userId],
    );

    return {
      type: 'posts',
      results: result.rows,
      total: parseInt((countResult.rows[0] as any).total),
      page,
      limit,
    };
  }

  /**
   * 搜索消息
   */
  async searchMessages(
    userId: string,
    query: string,
    options: {
      page?: number;
      limit?: number;
    } = {},
  ): Promise<SearchResult> {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const result = await this.db.query(
      `SELECT m.id, m.conversation_id, m.sender_id, m.type, m.content, m.media_urls, m.created_at,
              u.username, u.nickname, u.avatar_url,
              c.type as conversation_type,
              c.name as conversation_name
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       JOIN conversation_members cm ON m.conversation_id = cm.conversation_id
       JOIN conversations c ON m.conversation_id = c.id
       WHERE cm.user_id = $2
         AND m.is_deleted = FALSE
         AND m.type = 0  -- 只搜索文本消息
         AND m.content ILIKE $1
       ORDER BY m.created_at DESC
       LIMIT $3 OFFSET $4`,
      [query, userId, limit, offset],
    );

    // 获取总数
    const countResult = await this.db.query(
      `SELECT COUNT(*) as total
       FROM messages m
       JOIN conversation_members cm ON m.conversation_id = cm.conversation_id
       WHERE cm.user_id = $2
         AND m.is_deleted = FALSE
         AND m.type = 0
         AND m.content ILIKE $1`,
      [query, userId],
    );

    return {
      type: 'messages',
      results: result.rows,
      total: parseInt((countResult.rows[0] as any).total),
      page,
      limit,
    };
  }

  /**
   * 搜索会话
   */
  async searchConversations(
    userId: string,
    query: string,
    options: {
      page?: number;
      limit?: number;
    } = {},
  ): Promise<SearchResult> {
    const { page = 1, limit = 20 } = options;
    const offset = (page - 1) * limit;

    const result = await this.db.query(
      `SELECT DISTINCT c.id, c.type, c.name, c.avatar_url, c.updated_at,
              cm.role as user_role,
              (SELECT COUNT(*)
                 FROM messages m
                 WHERE m.conversation_id = c.id
                   AND m.is_deleted = FALSE) as message_count
       FROM conversations c
       JOIN conversation_members cm ON c.id = cm.conversation_id
       LEFT JOIN messages m ON c.id = m.conversation_id
       WHERE cm.user_id = $1
         AND (
           c.name ILIKE $2
           OR EXISTS (
             SELECT 1 FROM messages m2
             WHERE m2.conversation_id = c.id
               AND m2.type = 0
               AND m2.content ILIKE $2
           )
         )
       ORDER BY c.updated_at DESC
       LIMIT $3 OFFSET $4`,
      [userId, query, limit, offset],
    );

    // 获取总数
    const countResult = await this.db.query(
      `SELECT COUNT(DISTINCT c.id) as total
       FROM conversations c
       JOIN conversation_members cm ON c.id = cm.conversation_id
       WHERE cm.user_id = $1
         AND (
           c.name ILIKE $2
           OR EXISTS (
             SELECT 1 FROM messages m
             WHERE m.conversation_id = c.id
               AND m.type = 0
               AND m.content ILIKE $2
           )
         )`,
      [userId, query],
    );

    return {
      type: 'conversations',
      results: result.rows,
      total: parseInt((countResult.rows[0] as any).total),
      page,
      limit,
    };
  }

  /**
   * 获取搜索建议（自动补全）
   */
  async getSearchSuggestions(
    userId: string,
    query: string,
    limit = 10,
  ): Promise<{
    users: any[];
    hashtags: string[];
  }> {
    if (!query || query.length < 2) {
      return { users: [], hashtags: [] };
    }

    const searchQuery = `%${query.trim()}%`;

    // 获取用户建议
    const usersResult = await this.db.query(
      `SELECT id, username, nickname, avatar_url
       FROM users
       WHERE is_active = TRUE
         AND id != $1
         AND (
           username ILIKE $2
           OR nickname ILIKE $2
         )
       LIMIT $3`,
      [userId, searchQuery, limit],
    );

    // TODO: 获取话题标签建议
    // const hashtagsResult = await this.db.query(...);

    return {
      users: usersResult.rows,
      hashtags: [], // 暂时返回空数组
    };
  }
}
