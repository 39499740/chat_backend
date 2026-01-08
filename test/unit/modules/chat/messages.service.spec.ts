import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { MessagesService } from '../../../../src/modules/chat/services/messages.service';
import { DatabaseService } from '../../../../src/common/database/database.service';
import { ChatGateway } from '../../../../src/modules/websocket/chat.gateway';
import { MediaMessageService } from '../../../../src/modules/chat/services/media-message.service';

describe('MessagesService', () => {
  let service: MessagesService;
  let mockDb: any;
  let mockChatGateway: any;
  let mockMediaMessageService: any;

  beforeEach(async () => {
    mockChatGateway = {
      server: {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      },
    };

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MessagesService,
        {
          provide: DatabaseService,
          useValue: mockDb,
        },
        {
          provide: ChatGateway,
          useValue: mockChatGateway,
        },
        {
          provide: MediaMessageService,
          useValue: mockMediaMessageService,
        },
      ],
    }).compile();

    service = module.get<MessagesService>(MessagesService);
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    it('should send text message successfully', async () => {
      const senderId = '1';
      const conversationId = '1';
      const messageData = {
        type: 0,
        content: 'Hello world',
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: '1' }],
      });
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: '1', sender_id: '1', content: 'Hello world' }],
      });
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: '1', username: 'user1', nickname: 'User 1', avatar_url: null }],
      });

      const result = await service.sendMessage(senderId, conversationId, messageData);

      expect(result).toHaveProperty('id');
      expect(result.content).toBe('Hello world');
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should throw ForbiddenException if user is not a conversation member', async () => {
      const senderId = '1';
      const conversationId = '1';
      const messageData = { type: 0, content: 'Hello' };

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.sendMessage(senderId, conversationId, messageData)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should throw BadRequestException if media URLs are invalid', async () => {
      const senderId = '1';
      const conversationId = '1';
      const messageData = { type: 1, media_urls: ['http://invalid.com/image.jpg'] };

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: '1' }],
      });
      mockMediaMessageService.validateMediaUrls.mockResolvedValue(false);

      await expect(service.sendMessage(senderId, conversationId, messageData)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should process image message', async () => {
      const senderId = '1';
      const conversationId = '1';
      const messageData = { type: 1, media_urls: ['http://example.com/image.jpg'] };

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: '1' }] });
      mockMediaMessageService.validateMediaUrls.mockResolvedValue(true);
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: '1', type: 1 }],
      });
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await service.sendMessage(senderId, conversationId, messageData);

      expect(mockMediaMessageService.processImageMessage).toHaveBeenCalledWith(
        '1',
        messageData.media_urls,
      );
    });

    it('should process audio message', async () => {
      const senderId = '1';
      const conversationId = '1';
      const messageData = { type: 2, media_urls: ['http://example.com/audio.mp3'] };

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: '1' }] });
      mockMediaMessageService.validateMediaUrls.mockResolvedValue(true);
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: '1', type: 2 }],
      });
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await service.sendMessage(senderId, conversationId, messageData);

      expect(mockMediaMessageService.processAudioMessage).toHaveBeenCalledWith(
        '1',
        messageData.media_urls,
      );
    });

    it('should process video message', async () => {
      const senderId = '1';
      const conversationId = '1';
      const messageData = { type: 3, media_urls: ['http://example.com/video.mp4'] };

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: '1' }] });
      mockMediaMessageService.validateMediaUrls.mockResolvedValue(true);
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: '1', type: 3 }],
      });
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await service.sendMessage(senderId, conversationId, messageData);

      expect(mockMediaMessageService.processVideoMessage).toHaveBeenCalledWith(
        '1',
        messageData.media_urls,
      );
    });

    it('should process emoji message', async () => {
      const senderId = '1';
      const conversationId = '1';
      const messageData = { type: 4, content: '😀' };

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: '1' }] });
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: '1', type: 4 }],
      });

      await service.sendMessage(senderId, conversationId, messageData);

      expect(mockMediaMessageService.processEmojiMessage).toHaveBeenCalledWith('1', '😀');
    });

    it('should process file message', async () => {
      const senderId = '1';
      const conversationId = '1';
      const messageData = { type: 5, media_urls: ['http://example.com/file.pdf'] };

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: '1' }] });
      mockMediaMessageService.validateMediaUrls.mockResolvedValue(true);
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: '1', type: 5 }],
      });
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await service.sendMessage(senderId, conversationId, messageData);

      expect(mockMediaMessageService.processFileMessage).toHaveBeenCalledWith(
        '1',
        messageData.media_urls,
      );
    });

    it('should broadcast message when broadcast flag is true', async () => {
      const senderId = '1';
      const conversationId = '1';
      const messageData = { type: 0, content: 'Hello' };

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: '1' }] });
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: '1', content: 'Hello' }],
      });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: '1', username: 'user1', nickname: 'User 1', avatar_url: null }],
      });

      await service.sendMessage(senderId, conversationId, messageData, true);

      expect(mockChatGateway.server.to).toHaveBeenCalledWith(`conversation:${conversationId}`);
      expect(mockChatGateway.server.to().emit).toHaveBeenCalled();
    });
  });

  describe('getMessages', () => {
    it('should get messages successfully', async () => {
      const conversationId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: '1', content: 'Hello' }],
      });
      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 1 }],
      });

      const result = await service.getMessages(conversationId, userId, {});

      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.messages)).toBe(true);
    });

    it('should filter messages by type', async () => {
      const conversationId = '1';
      const userId = '1';
      const query = { type: 1 };

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: '1', type: 1 }],
      });
      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 1 }],
      });

      await service.getMessages(conversationId, userId, query);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND type ='),
        expect.any(Array),
      );
    });

    it('should handle pagination', async () => {
      const conversationId = '1';
      const userId = '1';
      const query = { page: 2, limit: 10 };

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });
      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 25 }],
      });

      const result = await service.getMessages(conversationId, userId, query);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should use default pagination values', async () => {
      const conversationId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });
      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      const result = await service.getMessages(conversationId, userId, {});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should order messages by created_at DESC', async () => {
      const conversationId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });
      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      await service.getMessages(conversationId, userId, {});

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY m.created_at DESC'),
        expect.any(Array),
      );
    });
  });

  describe('getMessage', () => {
    it('should get message successfully', async () => {
      const messageId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValue({
        rows: [{ id: messageId, content: 'Hello' }],
      });

      const result = await service.getMessage(messageId, userId);

      expect(result).toHaveProperty('id', messageId);
      expect(result).toHaveProperty('content');
    });

    it('should throw NotFoundException if message does not exist', async () => {
      const messageId = '999';
      const userId = '1';

      mockDb.query.mockResolvedValue({ rows: [] });

      await expect(service.getMessage(messageId, userId)).rejects.toThrow(NotFoundException);
      await expect(service.getMessage(messageId, userId)).rejects.toThrow('消息不存在');
    });

    it('should include sender information', async () => {
      const messageId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValue({
        rows: [
          {
            id: messageId,
            username: 'user1',
            nickname: 'User 1',
            avatar_url: 'http://example.com/avatar.jpg',
          },
        ],
      });

      const result = await service.getMessage(messageId, userId);

      expect(result).toHaveProperty('username');
      expect(result).toHaveProperty('nickname');
      expect(result).toHaveProperty('avatar_url');
    });
  });

  describe('deleteMessage', () => {
    it('should delete message successfully', async () => {
      const messageId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: messageId, sender_id: userId }],
      });
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.deleteMessage(messageId, userId);

      expect(result).toHaveProperty('message', '消息删除成功');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE messages SET is_deleted = true'),
        [messageId],
      );
    });

    it('should throw NotFoundException if message does not exist', async () => {
      const messageId = '999';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.deleteMessage(messageId, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user is not the sender', async () => {
      const messageId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: messageId, sender_id: '2' }],
      });

      await expect(service.deleteMessage(messageId, userId)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('markAsRead', () => {
    it('should mark message as read successfully', async () => {
      const messageId = '1';
      const userId = '2';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: messageId, sender_id: '1', is_read: false }],
      });
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.markAsRead(messageId, userId);

      expect(result).toHaveProperty('message', '标记已读');
    });

    it('should throw NotFoundException if message does not exist', async () => {
      const messageId = '999';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.markAsRead(messageId, userId)).rejects.toThrow(NotFoundException);
    });

    it('should not update read time if message is from same user', async () => {
      const messageId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: messageId, sender_id: userId }],
      });

      await service.markAsRead(messageId, userId);

      expect(mockDb.query).toHaveBeenCalledTimes(1);
    });
  });

  describe('getUnreadCount', () => {
    it('should get unread count successfully', async () => {
      const conversationId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValue({
        rows: [{ count: 5 }],
      });

      const result = await service.getUnreadCount(conversationId, userId);

      expect(result).toBe(5);
    });

    it('should return 0 if no unread messages', async () => {
      const conversationId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValue({
        rows: [{ count: 0 }],
      });

      const result = await service.getUnreadCount(conversationId, userId);

      expect(result).toBe(0);
    });
  });

  describe('getConversationHistory', () => {
    it('should get conversation history successfully', async () => {
      const conversationId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValue({
        rows: [{ id: '1', content: 'Message 1' }],
      });

      const result = await service.getConversationHistory(conversationId, userId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('should limit history to 50 messages', async () => {
      const conversationId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValue({ rows: [] });

      await service.getConversationHistory(conversationId, userId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT 50'),
        expect.any(Array),
      );
    });

    it('should order history by created_at DESC', async () => {
      const conversationId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValue({ rows: [] });

      await service.getConversationHistory(conversationId, userId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY m.created_at DESC'),
        expect.any(Array),
      );
    });
  });

  describe('getMessageMediaInfo', () => {
    it('should get message media info successfully', async () => {
      const messageId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValue({
        rows: [{ id: messageId, type: 1 }],
      });
      mockMediaMessageService.getMessageMediaInfo.mockResolvedValue({
        media_urls: ['http://example.com/image.jpg'],
      });

      const result = await service.getMessageMediaInfo(messageId, userId);

      expect(result).toHaveProperty('media_urls');
    });
  });
});
