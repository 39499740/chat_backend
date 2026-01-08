import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { UsersService } from '../../../../src/modules/users/services/users.service';
import { DatabaseService } from '../../../../src/common/database/database.service';

describe('UsersService', () => {
  let service: UsersService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      query: jest.fn(),
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
    jest.clearAllMocks();
  });

  describe('getUserProfile', () => {
    it('should get user profile successfully', async () => {
      const userId = '1';

      mockDb.query.mockResolvedValue({
        rows: [
          {
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
          },
        ],
      });

      const result = await service.getUserProfile(userId);

      expect(result).toHaveProperty('id', userId);
      expect(result).toHaveProperty('username', 'testuser');
      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('SELECT'), [userId]);
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = '999';

      mockDb.query.mockResolvedValue({ rows: [] });

      await expect(service.getUserProfile(userId)).rejects.toThrow(NotFoundException);
      await expect(service.getUserProfile(userId)).rejects.toThrow('用户不存在');
    });
  });

  describe('updateUserProfile', () => {
    it('should update user profile successfully', async () => {
      const userId = '1';
      const updateData = {
        nickname: 'New Nickname',
        bio: 'New bio',
      };

      mockDb.query.mockResolvedValue({
        rows: [
          {
            id: userId,
            username: 'testuser',
            nickname: 'New Nickname',
            bio: 'New bio',
          },
        ],
      });

      const result = await service.updateUserProfile(userId, updateData);

      expect(result).toHaveProperty('nickname', 'New Nickname');
      expect(result).toHaveProperty('bio', 'New bio');
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should throw BadRequestException if no data to update', async () => {
      const userId = '1';
      const updateData = {};

      await expect(service.updateUserProfile(userId, updateData)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
