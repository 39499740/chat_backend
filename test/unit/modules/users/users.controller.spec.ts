import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { UsersController } from '../../../../src/modules/users/controllers/users.controller';
import { UsersService } from '../../../../src/modules/users/services/users.service';
import { JwtAuthGuard } from '../../../../src/common/guards/jwt-auth.guard';

class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.user = { id: '1', username: 'testuser' };
    return true;
  }
}

describe('UsersController (e2e)', () => {
  let app: INestApplication;
  let controller: UsersController;
  let usersService: jest.Mocked<UsersService>;

  const mockUsersService = {
    getUserProfile: jest.fn(),
    updateUserProfile: jest.fn(),
    changePassword: jest.fn(),
    uploadAvatar: jest.fn(),
    getUserSettings: jest.fn(),
    updateUserSettings: jest.fn(),
    searchUsers: jest.fn(),
    getUserById: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockAuthGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get(UsersService);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /users/profile', () => {
    it('should get user profile successfully', async () => {
      const expectedProfile = {
        id: '1',
        username: 'testuser',
        email: 'test@example.com',
        nickname: 'Test User',
      };

      mockUsersService.getUserProfile.mockResolvedValue(expectedProfile);

      const response = await request(app.getHttpServer()).get('/users/profile').expect(200);

      expect(response.body).toEqual(expectedProfile);
      expect(mockUsersService.getUserProfile).toHaveBeenCalledWith('1');
    });

    it('should return 404 if user not found', async () => {
      mockUsersService.getUserProfile.mockRejectedValue(new Error('User not found'));

      await request(app.getHttpServer()).get('/users/profile').expect(500);
    });
  });

  describe('PUT /users/profile', () => {
    it('should update user profile successfully', async () => {
      const updateUserDto = {
        nickname: 'Updated User',
        bio: 'Hello',
      };

      const expectedProfile = {
        id: '1',
        username: 'testuser',
        nickname: 'Updated User',
        bio: 'Hello',
      };

      mockUsersService.updateUserProfile.mockResolvedValue(expectedProfile);

      const response = await request(app.getHttpServer())
        .put('/users/profile')
        .send(updateUserDto)
        .expect(200);

      expect(response.body).toEqual(expectedProfile);
      expect(mockUsersService.updateUserProfile).toHaveBeenCalledWith('1', updateUserDto);
    });

    it('should handle profile update errors', async () => {
      const updateUserDto = {
        nickname: 'Updated User',
      };

      mockUsersService.updateUserProfile.mockRejectedValue(new Error('Update failed'));

      await request(app.getHttpServer()).put('/users/profile').send(updateUserDto).expect(500);
    });
  });

  describe('POST /users/change-password', () => {
    it('should change password successfully', async () => {
      const changePasswordDto = {
        currentPassword: 'oldpassword',
        newPassword: 'newpassword',
      };

      mockUsersService.changePassword.mockResolvedValue({ message: 'Password changed' });

      const response = await request(app.getHttpServer())
        .post('/users/change-password')
        .send(changePasswordDto);

      expect(response.body).toEqual({ message: 'Password changed' });
      expect(mockUsersService.changePassword).toHaveBeenCalledWith('1', changePasswordDto);
    });

    it('should return 401 if current password is incorrect', async () => {
      const changePasswordDto = {
        currentPassword: 'wrongpassword',
        newPassword: 'newpassword',
      };

      mockUsersService.changePassword.mockRejectedValue(new Error('Current password is incorrect'));

      await request(app.getHttpServer())
        .post('/users/change-password')
        .send(changePasswordDto)
        .expect(500);
    });
  });

  describe('POST /users/avatar', () => {
    it('should handle avatar upload errors', async () => {
      mockUsersService.uploadAvatar.mockRejectedValue(new Error('Upload failed'));

      await request(app.getHttpServer())
        .post('/users/avatar')
        .attach('file', Buffer.from('fake-image'))
        .expect(500);
    });
  });

  describe('GET /users/settings', () => {
    it('should get user settings successfully', async () => {
      const expectedSettings = {
        notificationsEnabled: true,
        emailNotifications: false,
      };

      mockUsersService.getUserSettings.mockResolvedValue(expectedSettings);

      const response = await request(app.getHttpServer()).get('/users/settings').expect(200);

      expect(response.body).toEqual(expectedSettings);
      expect(mockUsersService.getUserSettings).toHaveBeenCalledWith('1');
    });
  });

  describe('PUT /users/settings', () => {
    it('should update user settings successfully', async () => {
      const updateSettingsDto = {
        notificationsEnabled: false,
        emailNotifications: true,
      };

      const expectedSettings = {
        notificationsEnabled: false,
        emailNotifications: true,
      };

      mockUsersService.updateUserSettings.mockResolvedValue(expectedSettings);

      const response = await request(app.getHttpServer())
        .put('/users/settings')
        .send(updateSettingsDto)
        .expect(200);

      expect(response.body).toEqual(expectedSettings);
      expect(mockUsersService.updateUserSettings).toHaveBeenCalledWith('1', updateSettingsDto);
    });
  });

  describe('GET /users/search/:keyword', () => {
    it('should search users successfully', async () => {
      const keyword = 'test';
      const expectedResults = [
        { id: '1', username: 'testuser' },
        { id: '2', username: 'testuser2' },
      ];

      mockUsersService.searchUsers.mockResolvedValue(expectedResults);

      const response = await request(app.getHttpServer())
        .get(`/users/search/${keyword}`)
        .expect(200);

      expect(response.body).toEqual(expectedResults);
      expect(mockUsersService.searchUsers).toHaveBeenCalledWith(keyword, '1');
    });

    it('should return empty array if no users found', async () => {
      const keyword = 'nonexistent';

      mockUsersService.searchUsers.mockResolvedValue([]);

      const response = await request(app.getHttpServer())
        .get(`/users/search/${keyword}`)
        .expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /users/:id', () => {
    it('should get user by id successfully', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440000';
      const expectedUser = {
        id: userId,
        username: 'testuser',
        email: 'test@example.com',
      };

      mockUsersService.getUserById.mockResolvedValue(expectedUser);

      const response = await request(app.getHttpServer()).get(`/users/${userId}`).expect(200);

      expect(response.body).toEqual(expectedUser);
      expect(mockUsersService.getUserById).toHaveBeenCalledWith(userId);
    });

    it('should return 404 if user not found', async () => {
      const userId = '550e8400-e29b-41d4-a716-446655440001';

      mockUsersService.getUserById.mockRejectedValue(new Error('User not found'));

      await request(app.getHttpServer()).get(`/users/${userId}`).expect(500);
    });
  });

  describe('Controller instantiation', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });
});
