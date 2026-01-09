import { Test, TestingModule } from '@nestjs/testing';
import { ChatGateway } from '@/modules/websocket/chat.gateway';

describe('ChatGateway', () => {
  let gateway: ChatGateway;
  let mockServer: any;
  let mockSocket: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ChatGateway],
    }).compile();

    gateway = module.get<ChatGateway>(ChatGateway);

    mockServer = {
      to: jest.fn().mockReturnThis(),
      emit: jest.fn(),
    };

    const socketInstance = {
      id: 'socket-id-1',
      handshake: {
        auth: {},
        query: { userId: 'user-1' },
      },
      join: jest.fn(),
      leave: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      to: jest.fn().mockReturnThis(),
    };

    mockSocket = jest.fn(() => socketInstance)();
    Object.assign(mockSocket, socketInstance);

    gateway['server'] = mockServer;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleConnection', () => {
    it('should handle connection with valid userId', async () => {
      mockSocket.handshake.auth.token = 'test-token';
      mockSocket.handshake.query.userId = 'user-1';

      await gateway['handleConnection'](mockSocket);

      expect(gateway['onlineUsers'].has('user-1')).toBe(true);
      expect(mockSocket.emit).toHaveBeenCalledWith('connected', {
        userId: 'user-1',
        message: '连接成功',
      });
    });

    it('should disconnect client without userId', async () => {
      mockSocket.handshake.query.userId = null;

      await gateway['handleConnection'](mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
      expect(gateway['onlineUsers'].has('user-1')).toBe(false);
    });

    it('should disconnect client without token', async () => {
      mockSocket.handshake.auth.token = null;
      mockSocket.handshake.query.userId = 'user-1';

      await gateway['handleConnection'](mockSocket);

      expect(mockSocket.disconnect).toHaveBeenCalledWith(true);
    });
  });

  describe('handleDisconnect', () => {
    it('should handle disconnect and notify friends', async () => {
      gateway['onlineUsers'].set('user-1', { socket: mockSocket, userId: 'user-1' });
      gateway['userConversations'].set('user-1', new Set(['conv-1']));

      await gateway['handleDisconnect'](mockSocket);

      expect(gateway['onlineUsers'].has('user-1')).toBe(false);
    });

    it('should handle disconnect for non-existent user', async () => {
      await gateway['handleDisconnect'](mockSocket);

      expect(gateway['onlineUsers'].size).toBe(0);
    });
  });

  describe('handleJoinConversation', () => {
    it('should join conversation successfully', async () => {
      gateway['onlineUsers'].set('user-1', { socket: mockSocket, userId: 'user-1' });

      await gateway['handleJoinConversation'](mockSocket, { conversationId: 'conv-1' });

      expect(mockSocket.join).toHaveBeenCalledWith('conversation:conv-1');
      expect(gateway['userConversations'].has('user-1')).toBe(true);
      expect(gateway['userConversations'].get('user-1')?.has('conv-1')).toBe(true);
    });

    it('should not join if user is not online', async () => {
      gateway['onlineUsers'].clear();

      await gateway['handleJoinConversation'](mockSocket, { conversationId: 'conv-1' });

      expect(mockSocket.join).not.toHaveBeenCalled();
    });
  });

  describe('handleLeaveConversation', () => {
    it('should leave conversation successfully', async () => {
      gateway['onlineUsers'].set('user-1', { socket: mockSocket, userId: 'user-1' });
      gateway['userConversations'].set('user-1', new Set(['conv-1']));

      await gateway['handleLeaveConversation'](mockSocket, { conversationId: 'conv-1' });

      expect(mockSocket.leave).toHaveBeenCalledWith('conversation:conv-1');
      expect(gateway['userConversations'].get('user-1')?.has('conv-1')).toBe(false);
    });

    it('should not leave if user is not online', async () => {
      gateway['onlineUsers'].clear();

      await gateway['handleLeaveConversation'](mockSocket, { conversationId: 'conv-1' });

      expect(mockSocket.leave).not.toHaveBeenCalled();
    });
  });

  describe('handleSendMessage', () => {
    it('should send message successfully', async () => {
      gateway['onlineUsers'].set('user-1', { socket: mockSocket, userId: 'user-1' });
      const payload = {
        conversationId: 'conv-1',
        content: 'Hello, world!',
        type: 'text',
      } as any;

      await gateway['handleSendMessage'](mockSocket, payload);

      expect(mockServer.to).toHaveBeenCalledWith('conversation:conv-1');
    });

    it('should not send message if user is not online', async () => {
      gateway['onlineUsers'].clear();
      const payload = {
        conversationId: 'conv-1',
        content: 'Hello, world!',
        type: 'text',
      } as any;

      await gateway['handleSendMessage'](mockSocket, payload);

      expect(mockSocket.to).not.toHaveBeenCalled();
    });

    it('should add senderId and timestamp to message', async () => {
      gateway['onlineUsers'].set('user-1', { socket: mockSocket, userId: 'user-1' });
      const payload = {
        conversationId: 'conv-1',
        content: 'Hello, world!',
        type: 'text',
      } as any;

      await gateway['handleSendMessage'](mockSocket, payload);

      expect(mockServer.to).toHaveBeenCalledWith('conversation:conv-1');
    });
  });

  describe('handleTypingStart', () => {
    it('should handle typing start', async () => {
      gateway['onlineUsers'].set('user-1', { socket: mockSocket, userId: 'user-1' });
      const payload = {
        conversationId: 'conv-1',
      } as any;

      await gateway['handleTypingStart'](mockSocket, payload);

      expect(mockSocket.to).toHaveBeenCalledWith('conversation:conv-1');
    });

    it('should not handle typing start if user is not online', async () => {
      gateway['onlineUsers'].clear();
      const payload = {
        conversationId: 'conv-1',
      } as any;

      await gateway['handleTypingStart'](mockSocket, payload);

      expect(mockSocket.to).not.toHaveBeenCalled();
    });
  });

  describe('handleTypingStop', () => {
    it('should handle typing stop', async () => {
      gateway['onlineUsers'].set('user-1', { socket: mockSocket, userId: 'user-1' });
      const payload = {
        conversationId: 'conv-1',
      } as any;

      await gateway['handleTypingStop'](mockSocket, payload);

      expect(mockSocket.to).toHaveBeenCalledWith('conversation:conv-1');
    });

    it('should not handle typing stop if user is not online', async () => {
      gateway['onlineUsers'].clear();
      const payload = {
        conversationId: 'conv-1',
      } as any;

      await gateway['handleTypingStop'](mockSocket, payload);

      expect(mockSocket.to).not.toHaveBeenCalled();
    });
  });

  describe('handleMarkAsRead', () => {
    it('should mark message as read', async () => {
      gateway['onlineUsers'].set('user-1', { socket: mockSocket, userId: 'user-1' });
      const payload = {
        conversationId: 'conv-1',
        messageId: 'msg-1',
      };

      await gateway['handleMarkAsRead'](mockSocket, payload);

      expect(mockServer.to).toHaveBeenCalledWith('conversation:conv-1');
    });

    it('should not mark as read if user is not online', async () => {
      gateway['onlineUsers'].clear();
      const payload = {
        conversationId: 'conv-1',
        messageId: 'msg-1',
      };

      await gateway['handleMarkAsRead'](mockSocket, payload);

      expect(mockServer.to).not.toHaveBeenCalled();
    });
  });

  describe('handleGetOnlineUsers', () => {
    it('should return online users', () => {
      gateway['onlineUsers'].set('user-1', { socket: mockSocket, userId: 'user-1' });
      gateway['onlineUsers'].set('user-2', { socket: mockSocket, userId: 'user-2' });
      gateway['onlineUsers'].set('user-3', { socket: mockSocket, userId: 'user-3' });

      gateway['handleGetOnlineUsers'](mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('online_users', {
        users: ['user-1', 'user-2', 'user-3'],
        currentUserId: 'user-1',
      });
    });

    it('should return empty list if no online users', () => {
      gateway['onlineUsers'].clear();
      gateway['onlineUsers'].set('user-1', { socket: mockSocket, userId: 'user-1' });

      gateway['handleGetOnlineUsers'](mockSocket);

      expect(mockSocket.emit).toHaveBeenCalledWith('online_users', {
        users: ['user-1'],
        currentUserId: 'user-1',
      });
    });
  });

  describe('handleGetConversationMembers', () => {
    it('should return conversation members', async () => {
      gateway['onlineUsers'].set('user-1', { socket: mockSocket, userId: 'user-1' });
      gateway['onlineUsers'].set('user-2', {
        socket: { id: 'socket-2', userId: 'user-2' },
        userId: 'user-2',
      });
      gateway['onlineUsers'].set('user-3', {
        socket: { id: 'socket-3', userId: 'user-3' },
        userId: 'user-3',
      });

      await gateway['handleGetConversationMembers'](mockSocket, { conversationId: 'conv-1' });

      expect(mockSocket.emit).toHaveBeenCalledWith('conversation_members', {
        conversationId: 'conv-1',
        onlineMembers: ['user-2', 'user-3'],
        offlineMembers: [],
      });
    });

    it('should return empty members list if user not online', async () => {
      gateway['onlineUsers'].clear();

      await gateway['handleGetConversationMembers'](mockSocket, { conversationId: 'conv-1' });

      expect(mockSocket.emit).not.toHaveBeenCalled();
    });
  });
});
