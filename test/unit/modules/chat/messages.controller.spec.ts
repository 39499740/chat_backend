import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { MessagesController } from '../../../../src/modules/chat/controllers/messages.controller';
import { MessagesService } from '../../../../src/modules/chat/services/messages.service';
import { JwtAuthGuard } from '../../../../src/common/guards/jwt-auth.guard';

class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.user = { id: '1', username: 'testuser' };
    return true;
  }
}

describe('MessagesController (e2e)', () => {
  let app: INestApplication;
  let controller: MessagesController;
  let messagesService: jest.Mocked<MessagesService>;

  const mockMessagesService = {
    sendMessage: jest.fn(),
    getMessages: jest.fn(),
    getMessage: jest.fn(),
    getMessageMediaInfo: jest.fn(),
    deleteMessage: jest.fn(),
    markAsRead: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagesController],
      providers: [
        {
          provide: MessagesService,
          useValue: mockMessagesService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockAuthGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get<MessagesController>(MessagesController);
    messagesService = module.get(MessagesService);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /chat', () => {
    it('should send message successfully', async () => {
      const sendMessageDto = {
        conversationId: 'conv-1',
        content: 'Hello',
        type: 0,
      };

      const expectedMessage = {
        id: 'msg-1',
        conversationId: 'conv-1',
        content: 'Hello',
        type: 0,
        senderId: '1',
        createdAt: new Date(),
      };

      mockMessagesService.sendMessage.mockResolvedValue(expectedMessage);

      const response = await request(app.getHttpServer())
        .post('/chat')
        .send(sendMessageDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: 'msg-1',
        conversationId: 'conv-1',
        content: 'Hello',
        type: 0,
        senderId: '1',
      });
      expect(mockMessagesService.sendMessage).toHaveBeenCalledWith(
        '1',
        sendMessageDto.conversationId,
        sendMessageDto,
      );
    });

    it('should handle send message errors', async () => {
      const sendMessageDto = {
        conversationId: 'conv-1',
        content: 'Hello',
        type: 0,
      };

      mockMessagesService.sendMessage.mockRejectedValue(new Error('Send failed'));

      await request(app.getHttpServer()).post('/chat').send(sendMessageDto).expect(500);
    });
  });

  describe('GET /chat/conversations/:conversationId', () => {
    it('should get messages successfully', async () => {
      const conversationId = 'conv-1';
      const expectedMessages = {
        messages: [
          {
            id: 'msg-1',
            content: 'Hello',
            type: 0,
          },
          {
            id: 'msg-2',
            content: 'World',
            type: 0,
          },
        ],
        total: 2,
        page: 1,
        limit: 20,
      };

      mockMessagesService.getMessages.mockResolvedValue(expectedMessages);

      const response = await request(app.getHttpServer())
        .get(`/chat/conversations/${conversationId}`)
        .expect(200);

      expect(response.body).toEqual(expectedMessages);
      expect(mockMessagesService.getMessages).toHaveBeenCalledWith(conversationId, '1', {
        page: 1,
        limit: 20,
        type: undefined,
      });
    });

    it('should get messages with pagination', async () => {
      const conversationId = 'conv-1';
      const expectedMessages = {
        messages: [
          {
            id: 'msg-1',
            content: 'Hello',
          },
        ],
        total: 1,
        page: 2,
        limit: 10,
      };

      mockMessagesService.getMessages.mockResolvedValue(expectedMessages);

      const response = await request(app.getHttpServer())
        .get(`/chat/conversations/${conversationId}?page=2&limit=10`)
        .expect(200);

      expect(mockMessagesService.getMessages).toHaveBeenCalledWith(conversationId, '1', {
        page: 2,
        limit: 10,
        type: undefined,
      });
    });

    it('should get messages filtered by type', async () => {
      const conversationId = 'conv-1';
      const expectedMessages = {
        messages: [
          {
            id: 'msg-1',
            content: 'Hello',
            type: 0,
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockMessagesService.getMessages.mockResolvedValue(expectedMessages);

      await request(app.getHttpServer())
        .get(`/chat/conversations/${conversationId}?type=0`)
        .expect(200);

      expect(mockMessagesService.getMessages).toHaveBeenCalledWith(conversationId, '1', {
        page: 1,
        limit: 20,
        type: '0',
      });
    });
  });

  describe('GET /chat/messages/:messageId', () => {
    it('should get message details successfully', async () => {
      const messageId = 'msg-1';
      const expectedMessage = {
        id: messageId,
        content: 'Hello',
        type: 0,
        senderId: '1',
        conversationId: 'conv-1',
      };

      mockMessagesService.getMessage.mockResolvedValue(expectedMessage);

      const response = await request(app.getHttpServer())
        .get(`/chat/messages/${messageId}`)
        .expect(200);

      expect(response.body).toEqual(expectedMessage);
      expect(mockMessagesService.getMessage).toHaveBeenCalledWith(messageId, '1');
    });

    it('should return 404 if message not found', async () => {
      const messageId = 'msg-999';

      mockMessagesService.getMessage.mockRejectedValue(new Error('Message not found'));

      await request(app.getHttpServer()).get(`/chat/messages/${messageId}`).expect(500);
    });
  });

  describe('GET /chat/messages/:messageId/media', () => {
    it('should get message media info successfully', async () => {
      const messageId = 'msg-1';
      const expectedMedia = {
        id: 'media-1',
        url: 'http://example.com/media.jpg',
        type: 'image',
        size: 1024,
      };

      mockMessagesService.getMessageMediaInfo.mockResolvedValue(expectedMedia);

      const response = await request(app.getHttpServer())
        .get(`/chat/messages/${messageId}/media`)
        .expect(200);

      expect(response.body).toEqual(expectedMedia);
      expect(mockMessagesService.getMessageMediaInfo).toHaveBeenCalledWith(messageId, '1');
    });

    it('should return 404 if media not found', async () => {
      const messageId = 'msg-999';

      mockMessagesService.getMessageMediaInfo.mockRejectedValue(new Error('Media not found'));

      await request(app.getHttpServer()).get(`/chat/messages/${messageId}/media`).expect(500);
    });
  });

  describe('DELETE /chat/messages/:messageId', () => {
    it('should delete message successfully', async () => {
      const messageId = 'msg-1';
      const expectedResponse = {
        message: 'Message deleted',
        id: messageId,
      };

      mockMessagesService.deleteMessage.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .delete(`/chat/messages/${messageId}`)
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockMessagesService.deleteMessage).toHaveBeenCalledWith(messageId, '1');
    });

    it('should handle delete message errors', async () => {
      const messageId = 'msg-1';

      mockMessagesService.deleteMessage.mockRejectedValue(new Error('Delete failed'));

      await request(app.getHttpServer()).delete(`/chat/messages/${messageId}`).expect(500);
    });
  });

  describe('POST /chat/messages/:messageId/read', () => {
    it('should mark message as read successfully', async () => {
      const messageId = 'msg-1';
      const markAsReadDto = {};

      const expectedResponse = {
        message: 'Message marked as read',
        messageId,
      };

      mockMessagesService.markAsRead.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .post(`/chat/messages/${messageId}/read`)
        .send(markAsReadDto);

      expect(response.body).toEqual(expectedResponse);
      expect(mockMessagesService.markAsRead).toHaveBeenCalledWith(messageId, '1');
    });

    it('should handle mark as read errors', async () => {
      const messageId = 'msg-1';

      mockMessagesService.markAsRead.mockRejectedValue(new Error('Mark failed'));

      await request(app.getHttpServer())
        .post(`/chat/messages/${messageId}/read`)
        .send({})
        .expect(500);
    });
  });

  describe('Controller instantiation', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });
});
