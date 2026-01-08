import { Test, TestingModule } from '@nestjs/testing';
import { NotificationService } from '../../../../src/modules/notifications/services/notification.service';
import { DatabaseService } from '../../../../src/common/database/database.service';
import { RedisService } from '../../../../src/common/services/redis.service';
import { ChatGateway } from '../../../../src/modules/websocket/chat.gateway';
import { Inject } from '@nestjs/common';

describe('NotificationService', () => {
  let service: NotificationService;
  let mockDb: any;
  let mockRedisService: any;
  let mockChatGateway: any;

  beforeEach(async () => {
    mockDb = {
      query: jest.fn(),
    };

    mockRedisService = {
      set: jest.fn().mockResolvedValue('OK'),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
    };

    mockChatGateway = {
      server: {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationService,
        {
          provide: DatabaseService,
          useValue: mockDb,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
        {
          provide: ChatGateway,
          useValue: mockChatGateway,
        },
      ],
    }).compile();

    service = module.get<NotificationService>(NotificationService);
    jest.clearAllMocks();
  });

  describe('getUserNotifications', () => {
    it('should get user notifications successfully', async () => {
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'notif-1',
            user_id: userId,
            type: 'message',
            title: 'New Message',
            content: 'You have a new message',
            is_read: false,
            created_at: new Date(),
          },
        ],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ count: '1' }],
      });

      const result = await service.getUserNotifications(userId, {
        page: 1,
        limit: 20,
      });

      expect(result).toHaveProperty('notifications');
      expect(result).toHaveProperty('total');
      expect(result.notifications).toHaveLength(1);
    });

    it('should return empty array if no notifications', async () => {
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [{ total: '0' }] });

      const result = await service.getUserNotifications(userId, {
        page: 1,
        limit: 20,
      });

      expect(result.notifications).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread count successfully', async () => {
      const userId = '1';

      mockDb.query.mockResolvedValue({
        rows: [{ count: '5' }],
      });

      const result = await service.getUnreadCount(userId);

      expect(result).toBe(5);
      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('SELECT COUNT(*)'), [
        userId,
      ]);
    });

    it('should return 0 if no unread notifications', async () => {
      const userId = '1';

      mockDb.query.mockResolvedValue({
        rows: [{ count: '0' }],
      });

      const result = await service.getUnreadCount(userId);

      expect(result).toBe(0);
    });
  });
});
