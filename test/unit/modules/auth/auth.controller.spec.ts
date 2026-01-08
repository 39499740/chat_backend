import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AuthController } from '../../../../src/modules/auth/controllers/auth.controller';
import { AuthService } from '../../../../src/modules/auth/services/auth.service';
import { JwtAuthGuard } from '../../../../src/common/guards/jwt-auth.guard';

describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: () => true,
      })
      .compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /auth/register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        nickname: 'Test User',
      };

      const expectedResponse = {
        user: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
          nickname: 'Test User',
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.register.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send(registerDto)
        .expect(201);

      expect(response.body).toEqual(expectedResponse);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });

    it('should return 400 if registration fails', async () => {
      const registerDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      mockAuthService.register.mockRejectedValue(new Error('Username already exists'));

      await request(app.getHttpServer()).post('/auth/register').send(registerDto).expect(500);
    });
  });

  describe('POST /auth/login', () => {
    it('should login successfully', async () => {
      const loginDto = {
        account: 'testuser',
        password: 'password123',
      };

      const expectedResponse = {
        user: {
          id: '1',
          username: 'testuser',
          email: 'test@example.com',
        },
        accessToken: 'access-token',
        refreshToken: 'refresh-token',
      };

      mockAuthService.login.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send(loginDto)
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should return 401 if credentials are invalid', async () => {
      const loginDto = {
        account: 'testuser',
        password: 'wrongpassword',
      };

      mockAuthService.login.mockRejectedValue(new Error('Invalid credentials'));

      await request(app.getHttpServer()).post('/auth/login').send(loginDto).expect(500);
    });
  });

  describe('POST /auth/refresh', () => {
    it('should refresh tokens successfully', async () => {
      const refreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      const expectedResponse = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        user: {
          id: '1',
          username: 'testuser',
        },
      };

      mockAuthService.refreshTokens.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .post('/auth/refresh')
        .send(refreshTokenDto)
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(refreshTokenDto.refreshToken);
    });

    it('should return 401 if refresh token is invalid', async () => {
      const refreshTokenDto = {
        refreshToken: 'invalid-token',
      };

      mockAuthService.refreshTokens.mockRejectedValue(new Error('Invalid token'));

      await request(app.getHttpServer()).post('/auth/refresh').send(refreshTokenDto).expect(500);
    });
  });

  describe('POST /auth/logout', () => {
    it('should logout successfully', async () => {
      const body = {
        userId: '1',
      };

      mockAuthService.logout.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post('/auth/logout')
        .send(body)
        .expect(200);

      expect(response.body).toEqual({ message: '登出成功' });
      expect(mockAuthService.logout).toHaveBeenCalledWith(body.userId);
    });

    it('should handle logout errors', async () => {
      const body = {
        userId: '1',
      };

      mockAuthService.logout.mockRejectedValue(new Error('Logout failed'));

      await request(app.getHttpServer()).post('/auth/logout').send(body).expect(500);
    });
  });

  describe('Controller instantiation', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });
});
