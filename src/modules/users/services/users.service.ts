import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private db: DatabaseService) {}

  async getUserProfile(userId: string) {
    const result = await this.db.query(
      `SELECT id, username, email, nickname, avatar_url, bio, gender, birth_date, region, is_verified, created_at
       FROM users WHERE id = $1`,
      [userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    return result.rows[0];
  }

  async updateUserProfile(userId: string, updateData: any) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (updateData.nickname !== undefined) {
      fields.push(`nickname = $${paramIndex++}`);
      values.push(updateData.nickname);
    }

    if (updateData.bio !== undefined) {
      fields.push(`bio = $${paramIndex++}`);
      values.push(updateData.bio);
    }

    if (updateData.gender !== undefined) {
      fields.push(`gender = $${paramIndex++}`);
      values.push(updateData.gender);
    }

    if (updateData.birth_date !== undefined) {
      fields.push(`birth_date = $${paramIndex++}`);
      values.push(updateData.birth_date);
    }

    if (updateData.region !== undefined) {
      fields.push(`region = $${paramIndex++}`);
      values.push(updateData.region);
    }

    if (fields.length === 0) {
      throw new BadRequestException('没有需要更新的字段');
    }

    values.push(userId);

    const result = await this.db.query(
      `UPDATE users SET ${fields.join(', ')} WHERE id = $${paramIndex}
       RETURNING id, username, email, nickname, avatar_url, bio, gender, birth_date, region, is_verified, updated_at`,
      values,
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    return result.rows[0];
  }

  async changePassword(userId: string, passwords: any) {
    const { currentPassword, newPassword } = passwords;

    // 获取用户当前密码
    const result = await this.db.query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    const user = result.rows[0];

    // 验证当前密码
    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password_hash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('当前密码不正确');
    }

    // 加密新密码
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await this.db.query(
      'UPDATE users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, userId],
    );

    return { message: '密码修改成功' };
  }

  async uploadAvatar(userId: string, avatarUrl: string) {
    const result = await this.db.query(
      `UPDATE users SET avatar_url = $1 WHERE id = $2
       RETURNING id, username, email, nickname, avatar_url`,
      [avatarUrl, userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    return result.rows[0];
  }

  async getUserSettings(userId: string) {
    const result = await this.db.query(
      `SELECT * FROM user_settings WHERE user_id = $1`,
      [userId],
    );

    if (result.rows.length === 0) {
      // 如果用户设置不存在，创建默认设置
      await this.db.query(
        `INSERT INTO user_settings (user_id) VALUES ($1)`,
        [userId],
      );
      return await this.getUserSettings(userId);
    }

    return result.rows[0];
  }

  async updateUserSettings(userId: string, settingsData: any) {
    const fields: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // 构建更新字段
    const allowedFields = [
      'privacy_profile_visible',
      'privacy_add_friend',
      'privacy_search_by_phone',
      'privacy_search_by_email',
      'privacy_online_visible',
      'notification_message',
      'notification_friend_request',
      'notification_mention',
      'notification_comment',
      'notification_sound',
      'language',
      'theme',
      'message_sound',
    ];

    for (const field of allowedFields) {
      if (settingsData[field] !== undefined) {
        fields.push(`${field} = $${paramIndex++}`);
        values.push(settingsData[field]);
      }
    }

    if (fields.length === 0) {
      throw new BadRequestException('没有需要更新的设置');
    }

    values.push(userId);

    const result = await this.db.query(
      `UPDATE user_settings SET ${fields.join(', ')} WHERE user_id = $${paramIndex}
       RETURNING *`,
      values,
    );

    return result.rows[0];
  }

  async searchUsers(keyword: string, currentUserId: string) {
    const result = await this.db.query(
      `SELECT id, username, nickname, avatar_url, bio
       FROM users
       WHERE (username ILIKE $1 OR nickname ILIKE $1 OR email ILIKE $1)
         AND id != $2
         AND is_active = true
         AND status = 0
       LIMIT 20`,
      [`%${keyword}%`, currentUserId],
    );

    return result.rows;
  }

  async getUserById(userId: string) {
    const result = await this.db.query(
      `SELECT id, username, nickname, avatar_url, bio, gender, region
       FROM users WHERE id = $1 AND is_active = true AND status = 0`,
      [userId],
    );

    if (result.rows.length === 0) {
      throw new NotFoundException('用户不存在');
    }

    return result.rows[0];
  }
}
