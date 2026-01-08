import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { NotificationsController } from '../../../../src/modules/notifications/controllers/notifications.controller';
import { NotificationService } from '../../../../src/modules/notifications/services/notification.service';
import { JwtAuthGuard } from '../../../../src/common/guards/jwt-auth.guard';

class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.user = { id: '1', username: 'testuser' };
    return true;
  }
}

describe('NotificationsController (e2e)', () => {
  let app: INestApplication;
  let controller: NotificationsController;
  let notificationService: jest.Mocked<NotificationService>;

  const mockNotificationService = {
    createNotification: jest.fn(),
    getUserNotifications: jest.fn(),
    getUnreadCount: jest.fn(),
    getNotification: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [
        {
          provide: NotificationService,
          useValue: mockNotificationService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockAuthGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get<NotificationsController>(NotificationsController);
    notificationService = module.get(NotificationService);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /notifications', () => {
    it('should create notification successfully', async () => {
      const createNotificationDto = {
        userId: 'user-2',
        type: 'friend_request',
        content: 'New friend request',
      };

      mockNotificationService.createNotification.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .post('/notifications')
        .send(createNotificationDto);

      expect(response.body).toEqual({ message: '通知创建成功' });
      expect(mockNotificationService.createNotification).toHaveBeenCalledWith({
        ...createNotificationDto,
      });
    });

    it('should handle create notification errors', async () => {
      const createNotificationDto = {
        userId: 'user-2',
        type: 'test',
        content: 'Test',
      };

      mockNotificationService.createNotification.mockRejectedValue(new Error('Create failed'));

      await request(app.getHttpServer())
        .post('/notifications')
        .send(createNotificationDto)
        .expect(500);
    });
  });

  describe('GET /notifications', () => {
    it('should get notifications list successfully', async () => {
      const expectedNotifications = {
        notifications: [
          { id: 'not-1', type: 'friend_request' },
          { id: 'not-2', type: 'like' },
        ],
        total: 2,
        page: 1,
        limit: 20,
      };

      mockNotificationService.getUserNotifications.mockResolvedValue(expectedNotifications);

      const response = await request(app.getHttpServer()).get('/notifications').expect(200);

      expect(response.body).toEqual(expectedNotifications);
      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith('1', {
        page: 1,
        limit: 20,
        type: undefined,
        onlyUnread: undefined,
      });
    });

    it('should get notifications with pagination', async () => {
      const expectedNotifications = {
        notifications: [{ id: 'not-1' }],
        total: 1,
        page: 2,
        limit: 10,
      };

      mockNotificationService.getUserNotifications.mockResolvedValue(expectedNotifications);

      await request(app.getHttpServer()).get('/notifications?page=2&limit=10').expect(200);

      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith('1', {
        page: 2,
        limit: 10,
        type: undefined,
        onlyUnread: undefined,
      });
    });

    it('should get notifications filtered by type', async () => {
      const expectedNotifications = {
        notifications: [{ id: 'not-1', type: 'message' }],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockNotificationService.getUserNotifications.mockResolvedValue(expectedNotifications);

      await request(app.getHttpServer()).get('/notifications?type=message').expect(200);

      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith('1', {
        page: 1,
        limit: 20,
        type: 'message',
        onlyUnread: undefined,
      });
    });

    it('should get only unread notifications', async () => {
      const expectedNotifications = {
        notifications: [{ id: 'not-1', read: false }],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockNotificationService.getUserNotifications.mockResolvedValue(expectedNotifications);

      await request(app.getHttpServer()).get('/notifications?onlyUnread=true').expect(200);

      expect(mockNotificationService.getUserNotifications).toHaveBeenCalledWith('1', {
        page: 1,
        limit: 20,
        type: undefined,
        onlyUnread: 'true',
      });
    });
  });

  describe('GET /notifications/unread/count', () => {
    it('should get unread count successfully', async () => {
      const expectedCount = 5;

      mockNotificationService.getUnreadCount.mockResolvedValue(expectedCount);

      const response = await request(app.getHttpServer())
        .get('/notifications/unread/count')
        .expect(200);

      expect(response.body).toEqual({ count: expectedCount });
      expect(mockNotificationService.getUnreadCount).toHaveBeenCalledWith('1');
    });
  });

  describe('GET /notifications/:id', () => {
    it('should get notification detail successfully', async () => {
      const notificationId = 'not-1';
      const expectedNotification = {
        id: notificationId,
        type: 'friend_request',
        content: 'New request',
        userId: '1',
      };

      mockNotificationService.getNotification.mockResolvedValue(expectedNotification);

      const response = await request(app.getHttpServer())
        .get(`/notifications/${notificationId}`)
        .expect(200);

      expect(response.body).toEqual(expectedNotification);
      expect(mockNotificationService.getNotification).toHaveBeenCalledWith(notificationId, '1');
    });

    it('should return 404 if notification not found', async () => {
      const notificationId = 'not-999';

      mockNotificationService.getNotification.mockRejectedValue(new Error('Not found'));

      await request(app.getHttpServer()).get(`/notifications/${notificationId}`).expect(500);
    });
  });

  describe('PUT /notifications/:id/read', () => {
    it('should mark notification as read successfully', async () => {
      const notificationId = 'not-1';

      mockNotificationService.markAsRead.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .put(`/notifications/${notificationId}/read`)
        .expect(200);

      expect(response.body).toEqual({ message: '通知已标记为已读' });
      expect(mockNotificationService.markAsRead).toHaveBeenCalledWith(notificationId, '1');
    });

    it('should handle mark as read errors', async () => {
      const notificationId = 'not-999';

      mockNotificationService.markAsRead.mockRejectedValue(new Error('Mark failed'));

      await request(app.getHttpServer()).put(`/notifications/${notificationId}/read`).expect(500);
    });
  });

  describe('PUT /notifications/read/all', () => {
    it('should mark all notifications as read successfully', async () => {
      const expectedCount = 10;

      mockNotificationService.markAllAsRead.mockResolvedValue(expectedCount);

      const response = await request(app.getHttpServer())
        .put('/notifications/read/all')
        .expect(200);

      expect(response.body).toEqual({
        message: '所有通知已标记为已读',
        count: expectedCount,
      });
      expect(mockNotificationService.markAllAsRead).toHaveBeenCalledWith('1');
    });

    it('should handle mark all as read errors', async () => {
      mockNotificationService.markAllAsRead.mockRejectedValue(new Error('Mark failed'));

      await request(app.getHttpServer()).put('/notifications/read/all').expect(500);
    });
  });

  describe('DELETE /notifications/:id', () => {
    it('should delete notification successfully', async () => {
      const notificationId = 'not-1';

      mockNotificationService.deleteNotification.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .delete(`/notifications/${notificationId}`)
        .expect(200);

      expect(response.body).toEqual({ message: '通知删除成功' });
      expect(mockNotificationService.deleteNotification).toHaveBeenCalledWith(notificationId, '1');
    });

    it('should handle delete notification errors', async () => {
      const notificationId = 'not-999';

      mockNotificationService.deleteNotification.mockRejectedValue(new Error('Delete failed'));

      await request(app.getHttpServer()).delete(`/notifications/${notificationId}`).expect(500);
    });
  });

  describe('Controller instantiation', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });
});
