import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { UsersService } from '@/modules/users/services/users.service';
import { DatabaseService } from '@/common/database/database.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      query: jest.fn((query, params) => {
        return Promise.resolve({ rows: [] });
      }) as any,
      transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: DatabaseService,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  describe('getUserProfile', () => {
    it('should get user profile successfully', async () => {
      const userId = 'user-1';
      const mockUser = {
        id: userId,
        username: 'testuser',
        email: 'test@example.com',
        nickname: 'Test User',
        avatar_url: null,
        bio: 'Test bio',
        gender: 1,
        birth_date: '1990-01-01',
        region: 'Beijing',
        is_verified: false,
        created_at: new Date(),
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await service.getUserProfile(userId);

      expect(result).toHaveProperty('id', userId);
      expect(result).toHaveProperty('username', 'testuser');
      expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), [userId]);
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'user-999';

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.getUserProfile(userId)).rejects.toThrow(NotFoundException);
      await expect(service.getUserProfile(userId)).rejects.toThrow('用户不存在');
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const userId = 'user-1';
      const updateData = {
        nickname: 'New Nickname',
        bio: 'New bio',
      };

      const mockUpdatedUser = {
        id: userId,
        username: 'testuser',
        nickname: 'New Nickname',
        bio: 'New bio',
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockUpdatedUser], rowCount: 1 });

      const result = await service.updateUserProfile(userId, updateData);

      expect(result).toHaveProperty('nickname', 'New Nickname');
      expect(result).toHaveProperty('bio', 'New bio');
      expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), expect.any(Array));
    });

    it('should throw BadRequestException if no data to update', async () => {
      const userId = 'user-1';
      const updateData = {};

      await expect(service.updateUserProfile(userId, updateData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.updateUserProfile(userId, updateData)).rejects.toThrow(
        '没有需要更新的字段',
      );
    });
  });

  describe('changePassword', () => {
    it('should change password successfully', async () => {
      const userId = 'user-1';
      const passwords = {
        currentPassword: 'oldpass123',
        newPassword: 'newpass456',
      };

      const oldHash = await bcrypt.hash('oldpass123', 10);

      mockDb.query
        .mockResolvedValueOnce({ rows: [{ password_hash: oldHash }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.changePassword(userId, passwords);

      expect(result).toEqual({ message: '密码修改成功' });
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should throw BadRequestException if old password is incorrect', async () => {
      const userId = 'user-1';
      const passwords = {
        currentPassword: 'wrongpass',
        newPassword: 'newpass456',
      };

      const oldHash = await bcrypt.hash('wrongpass', 10);

      mockDb.query.mockResolvedValueOnce({ rows: [{ password_hash: oldHash }] });

      jest.spyOn(bcrypt, 'compare').mockImplementation(() => Promise.resolve(false));

      await expect(service.changePassword(userId, passwords)).rejects.toThrow('当前密码不正确');
      expect(bcrypt.compare).toHaveBeenCalledWith('wrongpass', oldHash);
    });

    it('should throw BadRequestException if user not found', async () => {
      const userId = 'user-999';
      const passwords = {
        currentPassword: 'oldpass123',
        newPassword: 'newpass456',
      };

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.changePassword(userId, passwords)).rejects.toThrow('用户不存在');
      await expect(service.changePassword(userId, passwords)).rejects.toThrow(NotFoundException);
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully', async () => {
      const userId = 'user-1';
      const avatarUrl = 'https://example.com/avatar.jpg';

      const mockUpdatedUser = {
        id: userId,
        username: 'testuser',
        avatar_url: avatarUrl,
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockUpdatedUser] });

      const result = await service.uploadAvatar(userId, avatarUrl);

      expect(result).toHaveProperty('avatar_url', avatarUrl);
      expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), expect.any(Array));
    });
  });

  describe('getUserSettings', () => {
    it('should get user settings successfully', async () => {
      const userId = 'user-1';

      const mockSettings = {
        user_id: userId,
        id: '1',
        notification_message: true,
        notification_sound: true,
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockSettings] });

      const result = await service.getUserSettings(userId);

      expect(result).toHaveProperty('user_id', userId);
      expect(result).toHaveProperty('notification_message', true);
      expect(result).toHaveProperty('notification_sound', true);
      expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), [userId]);
    });

    it('should return default settings if not found', async () => {
      const userId = 'user-1';

      mockDb.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ user_id: userId }] });

      const result = await service.getUserSettings(userId);

      expect(result).toHaveProperty('user_id', userId);
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });
  });

  describe('updateUserSettings', () => {
    it('should update user settings successfully', async () => {
      const userId = 'user-1';
      const settingsData = {
        notification_message: false,
        notification_sound: false,
      };

      const mockUpdatedSettings = {
        user_id: userId,
        notification_message: false,
        notification_sound: false,
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockUpdatedSettings], rowCount: 1 });

      const result = await service.updateUserSettings(userId, settingsData);

      expect(result).toEqual(mockUpdatedSettings);
      expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), expect.any(Array));
    });

    it('should update privacy settings', async () => {
      const userId = 'user-1';
      const settingsData = {
        privacy_profile_visible: true,
        privacy_add_friend: true,
      };

      const mockUpdatedSettings = {
        user_id: userId,
        privacy_profile_visible: true,
        privacy_add_friend: true,
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockUpdatedSettings], rowCount: 1 });

      const result = await service.updateUserSettings(userId, settingsData);

      expect(result).toEqual(mockUpdatedSettings);
      expect(mockDb.query).toHaveBeenCalledWith(expect.any(String), expect.any(Array));
    });
  });

  describe('searchUsers', () => {
    it('should search users by keyword', async () => {
      const keyword = 'test';
      const currentUserId = 'user-1';

      const mockResults = [
        {
          id: 'user-2',
          username: 'testuser',
          nickname: 'Test User',
          avatar_url: 'avatar.jpg',
          bio: 'Test bio',
        },
      ];

      mockDb.query.mockResolvedValueOnce({ rows: mockResults });

      const result = await service.searchUsers(keyword, currentUserId);

      expect(Array.isArray(result)).toBe(true);
      expect(result[0]).toHaveProperty('username', 'testuser');
      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [
        keyword,
        currentUserId,
      ]);
    });

    it('should return empty array if no results', async () => {
      const keyword = 'nonexistent';
      const currentUserId = 'user-1';

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.searchUsers(keyword, currentUserId);

      expect(result).toEqual([]);
    });
  });

  describe('getUserById', () => {
    it('should get user by id successfully', async () => {
      const userId = 'user-1';

      const mockUser = {
        id: userId,
        username: 'testuser',
        nickname: 'Test User',
        avatar_url: 'avatar.jpg',
        bio: 'Test bio',
        gender: 1,
        region: 'Beijing',
      };

      mockDb.query.mockResolvedValueOnce({ rows: [mockUser] });

      const result = await service.getUserById(userId);

      expect(result).toHaveProperty('id', userId);
      expect(result).toHaveProperty('username', 'testuser');
      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [userId]);
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'user-999';

      mockDb.query.mockResolvedValue({ rows: [] });

      await expect(service.getUserById(userId)).rejects.toThrow(NotFoundException);
      await expect(service.getUserById(userId)).rejects.toThrow('用户不存在');
    });
  });
});
