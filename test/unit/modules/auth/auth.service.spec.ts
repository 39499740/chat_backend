import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuthService } from '../../../../src/modules/auth/services/auth.service';
import { DatabaseService } from '../../../../src/common/database/database.service';

describe('AuthService', () => {
  let service: AuthService;
  let mockDb: any;
  let jwtService: JwtService;

  beforeEach(async () => {
    mockDb = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: DatabaseService,
          useValue: mockDb,
        },
        {
          provide: JwtService,
          useValue: {
            signAsync: jest.fn(),
            verifyAsync: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        nickname: 'Test User',
      };

      mockDb.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            username: 'testuser',
            email: 'test@example.com',
            nickname: 'Test User',
            avatar_url: null,
            created_at: new Date(),
          },
        ],
      });

      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.register(registerData);

      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(result.user).toHaveProperty('id', '1');
      expect(result.user).toHaveProperty('username', 'testuser');
    });

    it('should throw UnauthorizedException if username already exists', async () => {
      const registerData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: '1', username: 'testuser' }],
      });

      await expect(service.register(registerData)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const loginData = {
        account: 'testuser',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash('password123', 10);

      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: '1',
              username: 'testuser',
              email: 'test@example.com',
              password_hash: hashedPassword,
              status: 0,
              is_active: true,
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [] });

      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token');

      const result = await service.login(loginData);

      expect(result).toHaveProperty('accessToken', 'access-token');
      expect(result).toHaveProperty('refreshToken', 'refresh-token');
      expect(result.user).toHaveProperty('id', '1');
    });

    it('should throw UnauthorizedException with invalid password', async () => {
      const loginData = {
        account: 'testuser',
        password: 'wrongpassword',
      };

      const hashedPassword = await bcrypt.hash('password123', 10);

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            username: 'testuser',
            password_hash: hashedPassword,
            status: 0,
            is_active: true,
          },
        ],
      });

      await expect(service.login(loginData)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('validateUser', () => {
    it('should validate user successfully', async () => {
      const userId = '1';

      mockDb.query.mockResolvedValue({
        rows: [
          {
            id: userId,
            username: 'testuser',
            email: 'test@example.com',
            status: 0,
            is_active: true,
          },
        ],
      });

      const result = await service.validateUser(userId);

      expect(result).toHaveProperty('id', userId);
      expect(result).toHaveProperty('username', 'testuser');
    });

    it('should throw UnauthorizedException if user not found', async () => {
      const userId = '999';

      mockDb.query.mockResolvedValue({ rows: [] });

      await expect(service.validateUser(userId)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('refreshTokens', () => {
    it('should refresh tokens successfully', async () => {
      const refreshToken = 'valid-refresh-token';
      const mockPayload = {
        sub: '1',
        username: 'testuser',
        type: 'refresh',
      };

      (jwtService.verifyAsync as jest.Mock).mockResolvedValue(mockPayload);
      mockDb.query.mockResolvedValue({
        rows: [
          {
            id: '1',
            username: 'testuser',
            email: 'test@example.com',
            status: 0,
            is_active: true,
          },
        ],
      });

      (jwtService.signAsync as jest.Mock)
        .mockResolvedValueOnce('new-access-token')
        .mockResolvedValueOnce('new-refresh-token');

      const result = await service.refreshTokens(refreshToken);

      expect(result).toHaveProperty('accessToken', 'new-access-token');
      expect(result).toHaveProperty('refreshToken', 'new-refresh-token');
    });

    it('should throw UnauthorizedException with invalid refresh token', async () => {
      const refreshToken = 'invalid-token';

      (jwtService.verifyAsync as jest.Mock).mockRejectedValue(new Error('Invalid token'));

      await expect(service.refreshTokens(refreshToken)).rejects.toThrow(UnauthorizedException);
    });
  });
});
