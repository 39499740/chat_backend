import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService, ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let db: any;

  const mockDb = {
    query: jest.fn(),
    transaction: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: 'ConfigService',
          useValue: {
            provide: ConfigService,
            useValue: {
              provide: 'DatabaseService',
              useValue: mockDb,
            },
            },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    db = mockDb;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('应该成功注册新用户', async () => {
      const registerData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        nickname: 'Test User',
      };

      db.query.mockResolvedValue({
        rows: [],
      });

      const result = await service.register(registerData);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id FROM users WHERE username = $1 OR email = $2'),
        expect.arrayContaining(['testuser', 'test@example.com']),
      );

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.username).toBe('testuser');
    });

    it('如果用户名已存在应该抛出异常', async () => {
      const registerData = {
        username: 'existinguser',
        email: 'new@example.com',
        password: 'Password123!',
      };

      db.query.mockResolvedValue({
        rows: [{ id: 'existing-id' }],
      });

      await expect(service.register(registerData)).rejects.toThrow(
        '用户名或邮箱已被注册',
      );
    });
  });

  describe('login', () => {
    it('应该成功登录并返回用户信息和Token', async () => {
      const loginData = {
        account: 'testuser',
        password: 'Password123!',
      };

      db.query.mockResolvedValue({
        rows: [
          {
            id: 'user-id',
            username: 'testuser',
            email: 'test@example.com',
            password_hash: 'hashed-password',
            status: 0,
            is_active: true,
            nickname: 'Test User',
            avatar_url: null,
          },
        ],
      });

      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      const result = await service.login(loginData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.username).toBe('testuser');
    });

    it('如果用户不存在应该抛出异常', async () => {
      const loginData = {
        account: 'nonexistent',
        password: 'Password123!',
      };

      db.query.mockResolvedValue({ rows: [] });

      await expect(service.login(loginData)).rejects.toThrow(
        '用户名或密码错误',
      );
    });

    it('如果密码错误应该抛出异常', async () => {
      const loginData = {
        account: 'testuser',
        password: 'WrongPassword',
      };

      db.query.mockResolvedValue({
        rows: [
          {
            id: 'user-id',
            username: 'testuser',
            email: 'test@example.com',
            password_hash: 'hashed-password',
            status: 0,
            is_active: true,
            nickname: 'Test User',
            avatar_url: null,
          },
        ],
      });

      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      await expect(service.login(loginData)).rejects.toThrow(
        '用户名或密码错误',
      );
    });

    it('应该更新最后登录时间', async () => {
      const loginData = {
        account: 'testuser',
        password: 'Password123!',
      };

      db.query.mockResolvedValue({
        rows: [
          {
            id: 'user-id',
            username: 'testuser',
            email: 'test@example.com',
            password_hash: 'hashed-password',
            status: 0,
            is_active: true,
            nickname: 'Test User',
            avatar_url: null,
          },
        ],
      }).mockResolvedValueOnce({
        rowCount: 1,
      });

      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);

      await service.login(loginData);

      expect(db.query).toHaveBeenCalledWith(
        'UPDATE users SET last_login_at = NOW() WHERE id = $1',
        [loginData.account],
      );
    });
  });

  describe('refreshTokens', () => {
    it('应该成功刷新Token', async () => {
      const refreshToken = 'valid-refresh-token';

      const mockPayload = {
        sub: 'user-id',
        username: 'testuser',
        type: 'refresh',
      };

      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      service['jwtService'] = {
        verifyAsync: jest.fn().mockResolvedValue(mockPayload),
        signAsync: jest.fn()
          .fn()
          .mockResolvedValueOnce('new-access-token')
          .mockResolvedValueOnce('new-refresh-token'),
      } as any;

      const result = await service.refreshTokens(refreshToken);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('如果刷新令牌无效应该抛出异常', async () => {
      const invalidToken = 'invalid-token';

      service['jwtService'] = {
        verifyAsync: jest.fn().mockRejectedValue(new Error('invalid')),
      } as any;

      await expect(service.refreshTokens(invalidToken)).rejects.toThrow(
        '刷新令牌无效或已过期',
      );
    });
  });

  describe('logout', () => {
    it('应该成功登出用户', async () => {
      const userId = 'user-id';

      db.query.mockResolvedValue({ rowCount: 1 });

      await service.logout(userId);

      expect(db.query).toHaveBeenCalledWith(
        'UPDATE user_sessions SET last_accessed_at = NOW() WHERE user_id = $1',
        [userId],
      );
    });
  });
});
