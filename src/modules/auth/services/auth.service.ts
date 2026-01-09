import { Injectable } from '@nestjs/common';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { DatabaseService } from '../../../common/database/database.service';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

interface RegisterData {
  username: string;
  email: string;
  password: string;
  nickname?: string;
  phone?: string;
}

interface LoginData {
  account: string;
  password: string;
}

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private db: DatabaseService,
  ) {}

  async register(data: RegisterData) {
    const { username, email, password, nickname, phone } = data;

    // 检查用户名或邮箱是否已存在
    const existingUser = await this.db.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email],
    );

    if (existingUser.rows.length > 0) {
      throw new UnauthorizedException('用户名或邮箱已被注册');
    }

    // 加密密码
    const passwordHash = await bcrypt.hash(password, 10);

    // 创建用户
    const userId = uuidv4();
    await this.db.query(
      `INSERT INTO users (id, username, email, password_hash, nickname, phone, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, username, email, passwordHash, nickname || username, phone, true],
    );

    const result = await this.db.query(
      `SELECT id, username, email, nickname, avatar_url, created_at FROM users
       WHERE username = ? OR email = ?
       ORDER BY created_at DESC LIMIT 1`,
      [username, email],
    );

    const user = result.rows[0];

    // 生成JWT Token
    const tokens = await this.generateTokens(user.id, user.username);

    return {
      user,
      ...tokens,
    };
  }

  async login(data: LoginData) {
    const { account, password } = data;

    // 查询用户（支持用户名、邮箱、手机号登录）
    const result = await this.db.query(
      `SELECT id, username, email, password_hash, status, is_active FROM users
       WHERE (username = ? OR email = ? OR phone = ?)
         AND status = 0`,
      [account, account, account],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    const user = result.rows[0];

    // 检查账号状态
    if (user.status !== 0 || !user.is_active) {
      throw new UnauthorizedException('账号已被禁用或删除');
    }

    // 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('用户名或密码错误');
    }

    // 更新最后登录时间
    await this.db.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    const tokens = await this.generateTokens(user.id, user.username);

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        nickname: user.nickname,
        avatar_url: user.avatar_url,
      },
      ...tokens,
    };
  }

  async validateUser(userId: string) {
    const result = await this.db.query(
      'SELECT id, username, email, status, is_active FROM users WHERE id = ?',
      [userId],
    );

    if (result.rows.length === 0) {
      throw new UnauthorizedException('用户不存在');
    }

    const user = result.rows[0];

    if (user.status !== 0 || !user.is_active) {
      throw new UnauthorizedException('账号已被禁用或删除');
    }

    return user;
  }

  private async generateTokens(userId: string, username: string) {
    const payload = {
      sub: userId,
      username: username,
      type: 'access',
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        expiresIn: '7d',
        secret: process.env.JWT_SECRET || 'your-secret-key',
      }),
      this.jwtService.signAsync(
        { ...payload, type: 'refresh' },
        {
          expiresIn: '30d',
          secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
        },
      ),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  async refreshTokens(refreshToken: string) {
    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
      });

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('无效的刷新令牌');
      }

      const user = await this.validateUser(payload.sub);

      return this.generateTokens(user.id, user.username);
    } catch (error) {
      throw new UnauthorizedException('刷新令牌无效或已过期');
    }
  }

  async logout(userId: string) {
    // TODO: 实现Token黑名单（使用Redis）
    // await this.redis.set(`blacklist:${token}`, '1', 'EX', expiration);

    // 更新用户状态为离线
    await this.db.query('UPDATE user_sessions SET last_accessed_at = NOW() WHERE user_id = ?', [
      userId,
    ]);
  }
}
