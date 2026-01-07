import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './controllers/auth.controller';
import { AuthService } from './services/auth.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            register: jest.fn(),
            login: jest.fn(),
            refreshTokens: jest.fn(),
            logout: jest.fn(),
          },
        },
        {
          provide: JwtAuthGuard,
          useValue: {
            canActivate: jest.fn().mockResolvedValue(true),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /auth/register', () => {
    it('应该成功注册用户', async () => {
      const registerDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'Password123!',
        nickname: 'Test User',
      };

      const mockResponse = {
        user: {
          id: 'user-id',
          username: 'testuser',
          email: 'test@example.com',
          nickname: 'Test User',
        },
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      authService.register = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.register(registerDto);

      expect(authService.register).toHaveBeenCalledWith(registerDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('POST /auth/login', () => {
    it('应该成功登录用户', async () => {
      const loginDto = {
        account: 'testuser',
        password: 'Password123!',
      };

      const mockResponse = {
        user: {
          id: 'user-id',
          username: 'testuser',
          email: 'test@example.com',
          nickname: 'Test User',
        },
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      authService.login = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.login(loginDto);

      expect(authService.login).toHaveBeenCalledWith(loginDto);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('POST /auth/refresh', () => {
    it('应该成功刷新Token', async () => {
      const refreshTokenDto = {
        refreshToken: 'valid-refresh-token',
      };

      const mockResponse = {
        user: {
          id: 'user-id',
          username: 'testuser',
          email: 'test@example.com',
          nickname: 'Test User',
        },
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
      };

      authService.refreshTokens = jest.fn().mockResolvedValue(mockResponse);

      const result = await controller.refresh(refreshTokenDto);

      expect(authService.refreshTokens).toHaveBeenCalledWith(
        refreshTokenDto.refreshToken,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('POST /auth/logout', () => {
    it('应该成功登出用户', async () => {
      const logoutBody = {
        userId: 'user-id',
      };

      authService.logout = jest.fn().mockResolvedValue(undefined);

      const result = await controller.logout(logoutBody);

      expect(authService.logout).toHaveBeenCalledWith('user-id');
      expect(result).toEqual({ message: '登出成功' });
    });
  });
});
});
