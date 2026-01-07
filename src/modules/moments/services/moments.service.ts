import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';

@Injectable()
export class MomentsService {
  constructor(private db: DatabaseService) {}

  async createPost(userId: string, postData: any) {
    const { content, media_urls, location, visibility } = postData;

    if (!content && (!media_urls || media_urls.length === 0)) {
      throw new BadRequestException('动态内容不能为空');
    }

    const result = await this.db.query(
      `INSERT INTO posts (user_id, content, media_urls, location, visibility, is_deleted, like_count, comment_count)
       VALUES ($1, $2, $3, $4, $5, $6, 0, 0)
       RETURNING *`,
      [userId, content, media_urls || [], location, visibility || 0, false],
    );

    return result.rows[0];
  }

  async getFeed(userId: string, feedDto: any) {
    const { page = 1, limit = 20, type = 0 } = feedDto;
    const offset = (page - 1) * limit;

    let whereClause = '';
    let params: any[] = [limit, offset];

    if (type === 1) {
      // 仅好友动态
      whereClause = `WHERE p.is_deleted = false
                    AND p.visibility IN (0, 1)
                    AND (
                      p.visibility = 0
                      OR (p.visibility = 1 AND f.user_id IS NOT NULL)
                    )
                    AND p.user_id = $3
                    AND (f.user_id = p.user_id OR p.visibility = 0)`;
      params.push(userId);
    } else {
      // 所有动态（公开+好友可见）
      whereClause = `WHERE p.is_deleted = false
                    AND (
                      p.visibility = 0
                      OR (p.visibility = 1 AND f.user_id IS NOT NULL)
                    )
                    AND (p.visibility = 0 OR f.user_id IS NOT NULL)`;
    }

    const result = await this.db.query(
      `SELECT p.id, p.user_id, p.content, p.media_urls, p.location, p.visibility,
              p.like_count, p.comment_count, p.created_at, p.updated_at,
              u.username, u.nickname, u.avatar_url
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN friendships f ON (f.user_a_id = $3 AND f.user_b_id = p.user_id)
                                OR (f.user_b_id = $3 AND f.user_a_id = p.user_id)
       ${whereClause}
       ORDER BY p.created_at DESC
       LIMIT $1 OFFSET $2`,
      type === 1 ? [userId, ...params] : params,
    );

    // 获取总数
    const countResult = await this.db.query(
      `SELECT COUNT(*) as total
       FROM posts p
       ${whereClause.replace('LIMIT $1 OFFSET $2', '')}`,
      type === 1 ? [userId] : [],
    );

    return {
      posts: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
    };
  }

  async getUserPosts(userId: string, targetUserId: string, page = 1, limit = 20) {
    const offset = (page - 1) * limit;

    const result = await this.db.query(
      `SELECT p.id, p.user_id, p.content, p.media_urls, p.location, p.visibility,
              p.like_count, p.comment_count, p.created_at, p.updated_at,
              u.username, u.nickname, u.avatar_url
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.user_id = $1
         AND p.is_deleted = false
         AND (
           p.visibility = 0
           OR (p.visibility = 1 AND (
             $1 IN (SELECT user_b_id FROM friendships WHERE user_a_id = $2 AND status = 0)
             OR $1 IN (SELECT user_a_id FROM friendships WHERE user_b_id = $2 AND status = 0)
           ))
         )
       ORDER BY p.created_at DESC
       LIMIT $3 OFFSET $4`,
      [targetUserId, userId, limit, offset],
    );

    const countResult = await this.db.query(
      `SELECT COUNT(*) as total
       FROM posts p
       WHERE p.user_id = $1 AND p.is_deleted = false`,
      [targetUserId],
    );

    return {
      posts: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
    };
  }

  async getPostDetail(postId: string, userId: string) {
    const result = await this.db.query(
      `SELECT p.*, u.username, u.nickname, u.avatar_url,
              CASE WHEN pl.user_id IS NOT NULL THEN true ELSE false END as is_liked
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN post_likes pl ON pl.post_id = p.id AND pl.user_id = $2
       WHERE p.id = $1 AND p.is_deleted = false`,
      [postId, userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('动态不存在');
    }

    // 获取评论
    const commentsResult = await this.db.query(
      `SELECT c.id, c.content, c.parent_id, c.created_at,
              u.username, u.nickname, u.avatar_url,
              CASE WHEN cl.user_id IS NOT NULL THEN true ELSE false END as is_liked
       FROM comments c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN comment_likes cl ON cl.comment_id = c.id AND cl.user_id = $2
       WHERE c.post_id = $1 AND c.is_deleted = false
       ORDER BY c.created_at ASC`,
      [postId, userId],
    );

    return {
      ...result.rows[0],
      comments: commentsResult.rows,
    };
  }

  async deletePost(postId: string, userId: string) {
    const result = await this.db.query(
      `SELECT * FROM posts WHERE id = $1 AND user_id = $2`,
      [postId, userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('动态不存在或无权限删除');
    }

    await this.db.query(
      `UPDATE posts SET is_deleted = true WHERE id = $1`,
      [postId],
    );

    return { message: '动态删除成功' };
  }

  async likePost(postId: string, userId: string) {
    // 检查是否已点赞
    const existing = await this.db.query(
      `SELECT * FROM post_likes WHERE post_id = $1 AND user_id = $2`,
      [postId, userId],
    );

    if (existing.rows.length > 0) {
      // 取消点赞
      await this.db.query(
        `DELETE FROM post_likes WHERE post_id = $1 AND user_id = $2`,
        [postId, userId],
      );

      // 减少点赞数
      await this.db.query(
        `UPDATE posts SET like_count = like_count - 1 WHERE id = $1`,
        [postId],
      );

      return { message: '已取消点赞', liked: false };
    } else {
      // 添加点赞
      await this.db.query(
        `INSERT INTO post_likes (post_id, user_id) VALUES ($1, $2)`,
        [postId, userId],
      );

      // 增加点赞数
      await this.db.query(
        `UPDATE posts SET like_count = like_count + 1 WHERE id = $1`,
        [postId],
      );

      return { message: '点赞成功', liked: true };
    }
  }

  async addComment(postId: string, userId: string, commentData: any) {
    const { content, parent_id } = commentData;

    if (!content || content.trim() === '') {
      throw new BadRequestException('评论内容不能为空');
    }

    const result = await this.db.query(
      `INSERT INTO comments (post_id, user_id, content, parent_id, is_deleted, like_count)
       VALUES ($1, $2, $3, $4, $5, 0)
       RETURNING *`,
      [postId, userId, content, parent_id || null, false],
    );

    // 增加评论数
    await this.db.query(
      `UPDATE posts SET comment_count = comment_count + 1 WHERE id = $1`,
      [postId],
    );

    return result.rows[0];
  }

  async getComments(postId: string, page = 1, limit = 20, userId: string) {
    const offset = (page - 1) * limit;

    const result = await this.db.query(
      `SELECT c.id, c.content, c.parent_id, c.created_at,
              u.username, u.nickname, u.avatar_url,
              CASE WHEN cl.user_id IS NOT NULL THEN true ELSE false END as is_liked
       FROM comments c
       JOIN users u ON c.user_id = u.id
       LEFT JOIN comment_likes cl ON cl.comment_id = c.id AND cl.user_id = $1
       WHERE c.post_id = $2 AND c.is_deleted = false
       ORDER BY c.created_at ASC
       LIMIT $3 OFFSET $4`,
      [userId, postId, limit, offset],
    );

    const countResult = await this.db.query(
      `SELECT COUNT(*) as total
       FROM comments c
       WHERE c.post_id = $1 AND c.is_deleted = false`,
      [postId],
    );

    return {
      comments: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
    };
  }

  async deleteComment(commentId: string, userId: string) {
    const result = await this.db.query(
      `SELECT * FROM comments WHERE id = $1 AND user_id = $2`,
      [commentId, userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('评论不存在或无权限删除');
    }

    await this.db.query(
      `UPDATE comments SET is_deleted = true WHERE id = $1`,
      [commentId],
    );

    // 减少评论数
    await this.db.query(
      `UPDATE posts SET comment_count = comment_count - 1 WHERE id = $1`,
      [result.rows[0].post_id],
    );

    return { message: '评论删除成功' };
  }

  async likeComment(commentId: string, userId: string) {
    // 检查是否已点赞
    const existing = await this.db.query(
      `SELECT * FROM comment_likes WHERE comment_id = $1 AND user_id = $2`,
      [commentId, userId],
    );

    if (existing.rows.length > 0) {
      // 取消点赞
      await this.db.query(
        `DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2`,
        [commentId, userId],
      );

      // 减少点赞数
      await this.db.query(
        `UPDATE comments SET like_count = like_count - 1 WHERE id = $1`,
        [commentId],
      );

      return { message: '已取消点赞', liked: false };
    } else {
      // 添加点赞
      await this.db.query(
        `INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)`,
        [commentId, userId],
      );

      // 增加点赞数
      await this.db.query(
        `UPDATE comments SET like_count = like_count + 1 WHERE id = $1`,
        [commentId],
      );

      return { message: '点赞成功', liked: true };
    }
  }
}
