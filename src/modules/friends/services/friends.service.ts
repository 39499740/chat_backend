import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';

@Injectable()
export class FriendsService {
  constructor(private db: DatabaseService) {}

  async sendFriendRequest(userId: string, friendId: string, message?: string) {
    if (userId === friendId) {
      throw new BadRequestException('不能添加自己为好友');
    }

    // 检查对方用户是否存在
    const userExists = await this.db.query(
      'SELECT id FROM users WHERE id = $1 AND is_active = true',
      [friendId],
    );

    if (userExists.rows.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    // 检查是否已经是好友
    const existingFriendship = await this.db.query(
      `SELECT * FROM friendships
       WHERE (user_a_id = $1 AND user_b_id = $2)
          OR (user_a_id = $2 AND user_b_id = $1)
         AND status = 0`,
      [userId, friendId],
    );

    if (existingFriendship.rows.length > 0) {
      throw new BadRequestException('已经是好友关系');
    }

    // 检查是否已存在待处理的好友请求
    const existingRequest = await this.db.query(
      `SELECT * FROM friend_requests
       WHERE (requester_id = $1 AND receiver_id = $2)
          OR (requester_id = $2 AND receiver_id = $1)
         AND status = 0`,
      [userId, friendId],
    );

    if (existingRequest.rows.length > 0) {
      throw new BadRequestException('好友请求已存在');
    }

    // 创建好友请求
    const result = await this.db.query(
      `INSERT INTO friend_requests (requester_id, receiver_id, message)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [userId, friendId, message],
    );

    return result.rows[0];
  }

  async acceptFriendRequest(userId: string, requestId: string) {
    // 检查请求是否存在且是发给当前用户的
    const request = await this.db.query(
      `SELECT * FROM friend_requests
       WHERE id = $1 AND receiver_id = $2 AND status = 0`,
      [requestId, userId],
    );

    if (request.rows.length === 0) {
      throw new NotFoundException('好友请求不存在');
    }

    const friendRequest = request.rows[0];

    // 更新请求状态为已接受
    await this.db.query(`UPDATE friend_requests SET status = 1 WHERE id = $1`, [requestId]);

    // 创建好友关系
    await this.db.query(
      `INSERT INTO friendships (user_a_id, user_b_id, status)
       VALUES ($1, $2, 0),
              ($2, $1, 0)`,
      [friendRequest.requester_id, userId],
    );

    return { message: '已接受好友请求' };
  }

  async rejectFriendRequest(userId: string, requestId: string) {
    // 检查请求是否存在且是发给当前用户的
    const request = await this.db.query(
      `SELECT * FROM friend_requests
       WHERE id = $1 AND receiver_id = $2 AND status = 0`,
      [requestId, userId],
    );

    if (request.rows.length === 0) {
      throw new NotFoundException('好友请求不存在');
    }

    // 更新请求状态为已拒绝
    await this.db.query(`UPDATE friend_requests SET status = 2 WHERE id = $1`, [requestId]);

    return { message: '已拒绝好友请求' };
  }

  async deleteFriend(userId: string, friendId: string) {
    // 删除好友关系
    const result = await this.db.query(
      `DELETE FROM friendships
       WHERE (user_a_id = $1 AND user_b_id = $2)
          OR (user_a_id = $2 AND user_b_id = $1)
       RETURNING *`,
      [userId, friendId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('好友关系不存在');
    }

    return { message: '已删除好友' };
  }

  async getFriendsList(userId: string, page: number = 1, limit: number = 20) {
    const offset = (page - 1) * limit;

    const result = await this.db.query(
      `SELECT f.id, f.user_a_id, f.user_b_id, f.status, f.created_at,
              u.id as user_id, u.username, u.nickname, u.avatar_url
       FROM friendships f
       JOIN users u ON (f.user_a_id = $1 AND f.user_b_id = u.id)
                OR (f.user_b_id = $1 AND f.user_a_id = u.id)
       WHERE f.status = 0
         AND (($1 = f.user_a_id AND f.user_b_id = u.id)
              OR ($1 = f.user_b_id AND f.user_a_id = u.id))
       ORDER BY f.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset],
    );

    // 获取总数
    const countResult = await this.db.query(
      `SELECT COUNT(*) as total
       FROM friendships f
       JOIN users u ON (f.user_a_id = $1 AND f.user_b_id = u.id)
                OR (f.user_b_id = $1 AND f.user_a_id = u.id)
       WHERE f.status = 0
         AND (($1 = f.user_a_id AND f.user_b_id = u.id)
              OR ($1 = f.user_b_id AND f.user_a_id = u.id))`,
      [userId],
    );

    return {
      friends: result.rows,
      total: parseInt(countResult.rows[0].total),
      page,
      limit,
    };
  }

  async getPendingRequests(userId: string) {
    const result = await this.db.query(
      `SELECT fr.id, fr.message, fr.created_at,
              u.id as user_id, u.username, u.nickname, u.avatar_url
       FROM friend_requests fr
       JOIN users u ON fr.requester_id = u.id
       WHERE fr.receiver_id = $1 AND fr.status = 0
       ORDER BY fr.created_at DESC`,
      [userId],
    );

    return result.rows;
  }

  async getSentRequests(userId: string) {
    const result = await this.db.query(
      `SELECT fr.id, fr.message, fr.status, fr.created_at,
              u.id as user_id, u.username, u.nickname, u.avatar_url
       FROM friend_requests fr
       JOIN users u ON fr.receiver_id = u.id
       WHERE fr.requester_id = $1
       ORDER BY fr.created_at DESC`,
      [userId],
    );

    return result.rows;
  }

  async checkFriendship(userId: string, friendId: string) {
    const result = await this.db.query(
      `SELECT * FROM friendships
       WHERE (user_a_id = $1 AND user_b_id = $2)
          OR (user_a_id = $2 AND user_b_id = $1)
         AND status = 0`,
      [userId, friendId],
    );

    return {
      isFriend: result.rows.length > 0,
      status: result.rows.length > 0 ? 0 : -1,
    };
  }
}
