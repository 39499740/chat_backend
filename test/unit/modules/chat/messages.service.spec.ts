import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { MessagesService } from '../../../../src/modules/chat/services/messages.service';
import { DatabaseService } from '../../../../src/common/database/database.service';
import { MediaMessageService } from '../../../../src/modules/chat/services/media-message.service';
import { ChatGateway } from '../../../../src/modules/websocket/chat.gateway';

describe('MessagesService', () => {
  let service: MessagesService;
  let mockDb: any;
  let mockMediaMessageService: any;
  let mockChatGateway: any;

  beforeEach(async () => {
    mockDb = {
      query: jest.fn(),
    };

    mockMediaMessageService = {
      validateMessageContent: jest.fn(),
      validateMediaUrls: jest.fn(),
      processImageMessage: jest.fn(),
      processAudioMessage: jest.fn(),
      processVideoMessage: jest.fn(),
      processEmojiMessage: jest.fn(),
      processFileMessage: jest.fn(),
      getMessageMediaInfo: jest.fn(),
    };

    mockChatGateway = {
      server: {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: DatabaseService,
          useValue: mockDb,
        },
        {
          provide: MediaMessageService,
          useValue: mockMediaMessageService,
        },
        {
          provide: ChatGateway,
          useValue: mockChatGateway,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);

    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send text message successfully', async () => {
      const messageData = {
        type: 0,
        content: 'Hello, world!',
      };

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: '1' }] }).mockResolvedValueOnce({
        rows: [
          {
            id: 'msg1',
            conversation_id: 'conv1',
            sender_id: 'user1',
            type: 0,
            content: 'Hello, world!',
            created_at: new Date(),
          },
        ],
      });

      mockMediaMessageService.validateMessageContent.mockReturnValue(undefined);

      const result = await service.sendMessage('user1', 'conv1', messageData);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('content', 'Hello, world!');
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user not in conversation', async () => {
      const messageData = {
        type: 0,
        content: 'Hello',
      };

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.sendMessage('user1', 'conv1', messageData)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException with invalid message content', async () => {
      const messageData = {
        type: 0,
        content: '', // Empty content
      };

      mockMediaMessageService.validateMessageContent.mockImplementation(() => {
        throw new BadRequestException('文本消息内容不能为空');
      });

      await expect(service.sendMessage('user1', 'conv1', messageData)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getMessages', () => {
    it('should get messages successfully', async () => {
      mockDb.query
        .mockResolvedValueOnce({
          rows: [
            {
              id: 'msg1',
              content: 'Hello',
              username: 'testuser',
              nickname: 'Test User',
            },
          ],
        })
        .mockResolvedValueOnce({ rows: [{ total: 1 }] });

      const result = await service.getMessages('conv1', 'user1', {
        page: 1,
        limit: 20,
      });

      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('total');
      expect(result.messages).toHaveLength(1);
    });

    it('should filter messages by type', async () => {
      mockDb.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ total: 0 }] });

      const result = await service.getMessages('conv1', 'user1', {
        page: 1,
        limit: 20,
        type: 1,
      });

      expect(result.total).toBe(0);
    });
  });

  describe('getMessage', () => {
    it('should get message successfully', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'msg1',
            content: 'Hello',
            username: 'testuser',
            sender_id: 'user1',
          },
        ],
      });

      const result = await service.getMessage('msg1', 'user1');

      expect(result).toHaveProperty('id', 'msg1');
      expect(result).toHaveProperty('content', 'Hello');
    });

    it('should throw NotFoundException if message not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.getMessage('msg999', 'user1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteMessage', () => {
    it('should delete own message successfully', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'msg1',
            sender_id: 'user1',
          },
        ],
      });

      mockDb.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.deleteMessage('msg1', 'user1');

      expect(result).toHaveProperty('message', '消息删除成功');
    });

    it('should throw NotFoundException if message not found', async () => {
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.deleteMessage('msg999', 'user1')).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if deleting others message', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'msg1',
            sender_id: 'user2', // Different user
          },
        ],
      });

      await expect(service.deleteMessage('msg1', 'user1')).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read successfully', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'msg1',
            sender_id: 'user2',
          },
        ],
      });

      mockDb.query.mockResolvedValueOnce({ rowCount: 1 });

      const result = await service.markAsRead('msg1', 'user1');

      expect(result).toHaveProperty('message', '标记已读');
    });

    it('should not update read time for own message', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'msg1',
            sender_id: 'user1', // Own message
          },
        ],
      });

      const result = await service.markAsRead('msg1', 'user1');

      expect(result).toHaveProperty('message', '标记已读');
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread count successfully', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [{ count: 5 }],
      });

      const result = await service.getUnreadCount('conv1', 'user1');

      expect(result).toBe(5);
    });
  });

  describe('getConversationHistory', () => {
    it('should get conversation history successfully', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'msg1',
            content: 'Hello',
            username: 'testuser',
          },
        ],
      });

      const result = await service.getConversationHistory('conv1', 'user1');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getMessageMediaInfo', () => {
    it('should get message media info successfully', async () => {
      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: 'msg1',
            type: 1,
            media_urls: ['http://example.com/image.jpg'],
          },
        ],
      });

      mockMediaMessageService.getMessageMediaInfo.mockResolvedValue([
        {
          type: 'image',
          url: 'http://example.com/image.jpg',
          thumbnail: 'http://example.com/thumb.jpg',
        },
      ]);

      const result = await service.getMessageMediaInfo('msg1', 'user1');

      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(1);
    });
  });
});
