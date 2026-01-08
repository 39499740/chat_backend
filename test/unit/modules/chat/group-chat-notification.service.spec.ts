import { Test, TestingModule } from '@nestjs/testing';
import { GroupChatNotificationService } from '../../../../src/modules/chat/services/group-chat-notification.service';
import { DatabaseService } from '../../../../src/common/database/database.service';
import { ChatGateway } from '../../../../src/modules/websocket/chat.gateway';

describe('GroupChatNotificationService', () => {
  let service: GroupChatNotificationService;
  let mockDb: any;
  let mockChatGateway: any;

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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GroupChatNotificationService,
        {
          provide: DatabaseService,
          useValue: mockDb,
        },
        {
          provide: ChatGateway,
          useValue: mockChatGateway,
        },
      ],
    }).compile();

    service = module.get<GroupChatNotificationService>(GroupChatNotificationService);
    jest.clearAllMocks();
  });

  describe('notifyMemberAdded', () => {
    it('should notify member added successfully', async () => {
      const conversationId = '1';
      const addedUserId = '2';
      const addedBy = '1';

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: '1', username: 'user1', nickname: 'User 1' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: '2', username: 'user2', nickname: 'User 2' }],
        });

      await service.notifyMemberAdded(conversationId, addedUserId, addedBy);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, username, nickname FROM users WHERE id = $1'),
        [addedBy],
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, username, nickname FROM users WHERE id = $1'),
        [addedUserId],
      );
      expect(mockChatGateway.server.to).toHaveBeenCalledWith(`conversation:${conversationId}`);
      expect(mockChatGateway.server.to().emit).toHaveBeenCalledWith(
        'group_notification',
        expect.objectContaining({
          type: 'member_added',
          conversationId,
        }),
      );
    });

    it('should handle missing user information gracefully', async () => {
      const conversationId = '1';
      const addedUserId = '2';
      const addedBy = '1';

      mockDb.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });

      await service.notifyMemberAdded(conversationId, addedUserId, addedBy);

      expect(mockChatGateway.server.to().emit).toHaveBeenCalledWith(
        'group_notification',
        expect.objectContaining({
          type: 'member_added',
          conversationId,
        }),
      );
    });

    it('should log error when database query fails', async () => {
      const conversationId = '1';
      const addedUserId = '2';
      const addedBy = '1';

      mockDb.query.mockRejectedValue(new Error('Database error'));

      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');

      await service.notifyMemberAdded(conversationId, addedUserId, addedBy);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error notifying member added:',
        expect.any(Error),
      );
    });

    it('should not emit notification if chatGateway is not available', async () => {
      const conversationId = '1';
      const addedUserId = '2';
      const addedBy = '1';

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: '1', username: 'user1', nickname: 'User 1' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: '2', username: 'user2', nickname: 'User 2' }],
        });

      (service as any).chatGateway = null;

      await service.notifyMemberAdded(conversationId, addedUserId, addedBy);

      expect(mockChatGateway.server.to).not.toHaveBeenCalled();
    });
  });

  describe('notifyMemberRemoved', () => {
    it('should notify member removed successfully', async () => {
      const conversationId = '1';
      const removedUserId = '2';
      const removedBy = '1';

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: '1', username: 'user1', nickname: 'User 1' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: '2', username: 'user2', nickname: 'User 2' }],
        });

      await service.notifyMemberRemoved(conversationId, removedUserId, removedBy);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, username, nickname FROM users WHERE id = $1'),
        [removedBy],
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, username, nickname FROM users WHERE id = $1'),
        [removedUserId],
      );
      expect(mockChatGateway.server.to).toHaveBeenCalledWith(`conversation:${conversationId}`);
      expect(mockChatGateway.server.to().emit).toHaveBeenCalledWith(
        'group_notification',
        expect.objectContaining({
          type: 'member_removed',
          conversationId,
        }),
      );
    });

    it('should handle missing user information gracefully', async () => {
      const conversationId = '1';
      const removedUserId = '2';
      const removedBy = '1';

      mockDb.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] });

      await service.notifyMemberRemoved(conversationId, removedUserId, removedBy);

      expect(mockChatGateway.server.to().emit).toHaveBeenCalledWith(
        'group_notification',
        expect.objectContaining({
          type: 'member_removed',
          conversationId,
        }),
      );
    });

    it('should log error when database query fails', async () => {
      const conversationId = '1';
      const removedUserId = '2';
      const removedBy = '1';

      mockDb.query.mockRejectedValue(new Error('Database error'));

      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');

      await service.notifyMemberRemoved(conversationId, removedUserId, removedBy);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error notifying member removed:',
        expect.any(Error),
      );
    });

    it('should not emit notification if chatGateway is not available', async () => {
      const conversationId = '1';
      const removedUserId = '2';
      const removedBy = '1';

      mockDb.query
        .mockResolvedValueOnce({
          rows: [{ id: '1', username: 'user1', nickname: 'User 1' }],
        })
        .mockResolvedValueOnce({
          rows: [{ id: '2', username: 'user2', nickname: 'User 2' }],
        });

      (service as any).chatGateway = null;

      await service.notifyMemberRemoved(conversationId, removedUserId, removedBy);

      expect(mockChatGateway.server.to).not.toHaveBeenCalled();
    });
  });

  describe('notifyGroupUpdated', () => {
    it('should notify group updated successfully', async () => {
      const conversationId = '1';
      const updatedBy = '1';
      const updates = { name: 'New Group Name', avatar_url: 'http://example.com/avatar.jpg' };

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: '1', username: 'user1', nickname: 'User 1' }],
      });

      await service.notifyGroupUpdated(conversationId, updatedBy, updates);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, username, nickname FROM users WHERE id = $1'),
        [updatedBy],
      );
      expect(mockChatGateway.server.to).toHaveBeenCalledWith(`conversation:${conversationId}`);
      expect(mockChatGateway.server.to().emit).toHaveBeenCalledWith(
        'group_notification',
        expect.objectContaining({
          type: 'group_updated',
          conversationId,
          updates,
        }),
      );
    });

    it('should handle missing user information gracefully', async () => {
      const conversationId = '1';
      const updatedBy = '1';
      const updates = { name: 'New Group Name' };

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await service.notifyGroupUpdated(conversationId, updatedBy, updates);

      expect(mockChatGateway.server.to().emit).toHaveBeenCalledWith(
        'group_notification',
        expect.objectContaining({
          type: 'group_updated',
          conversationId,
        }),
      );
    });

    it('should log error when database query fails', async () => {
      const conversationId = '1';
      const updatedBy = '1';
      const updates = { name: 'New Group Name' };

      mockDb.query.mockRejectedValue(new Error('Database error'));

      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');

      await service.notifyGroupUpdated(conversationId, updatedBy, updates);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error notifying group updated:',
        expect.any(Error),
      );
    });

    it('should not emit notification if chatGateway is not available', async () => {
      const conversationId = '1';
      const updatedBy = '1';
      const updates = { name: 'New Group Name' };

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: '1', username: 'user1', nickname: 'User 1' }],
      });

      (service as any).chatGateway = null;

      await service.notifyGroupUpdated(conversationId, updatedBy, updates);

      expect(mockChatGateway.server.to).not.toHaveBeenCalled();
    });
  });

  describe('notifyMemberLeft', () => {
    it('should notify member left successfully', async () => {
      const conversationId = '1';
      const leftUserId = '2';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: '2', username: 'user2', nickname: 'User 2' }],
      });

      await service.notifyMemberLeft(conversationId, leftUserId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT id, username, nickname FROM users WHERE id = $1'),
        [leftUserId],
      );
      expect(mockChatGateway.server.to).toHaveBeenCalledWith(`conversation:${conversationId}`);
      expect(mockChatGateway.server.to().emit).toHaveBeenCalledWith(
        'group_notification',
        expect.objectContaining({
          type: 'member_left',
          conversationId,
        }),
      );
    });

    it('should handle missing user information gracefully', async () => {
      const conversationId = '1';
      const leftUserId = '2';

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await service.notifyMemberLeft(conversationId, leftUserId);

      expect(mockChatGateway.server.to().emit).toHaveBeenCalledWith(
        'group_notification',
        expect.objectContaining({
          type: 'member_left',
          conversationId,
        }),
      );
    });

    it('should log error when database query fails', async () => {
      const conversationId = '1';
      const leftUserId = '2';

      mockDb.query.mockRejectedValue(new Error('Database error'));

      const loggerErrorSpy = jest.spyOn((service as any).logger, 'error');

      await service.notifyMemberLeft(conversationId, leftUserId);

      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'Error notifying member left:',
        expect.any(Error),
      );
    });

    it('should not emit notification if chatGateway is not available', async () => {
      const conversationId = '1';
      const leftUserId = '2';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: '2', username: 'user2', nickname: 'User 2' }],
      });

      (service as any).chatGateway = null;

      await service.notifyMemberLeft(conversationId, leftUserId);

      expect(mockChatGateway.server.to).not.toHaveBeenCalled();
    });
  });

  describe('notifyMembersChanged', () => {
    it('should notify all added members', async () => {
      const conversationId = '1';
      const changes = {
        added: ['2', '3'],
        updatedBy: '1',
      };

      const notifyMemberAddedSpy = jest.spyOn(service, 'notifyMemberAdded');

      await service.notifyMembersChanged(conversationId, changes);

      expect(notifyMemberAddedSpy).toHaveBeenCalledTimes(2);
      expect(notifyMemberAddedSpy).toHaveBeenCalledWith(conversationId, '2', '1');
      expect(notifyMemberAddedSpy).toHaveBeenCalledWith(conversationId, '3', '1');
    });

    it('should notify all removed members', async () => {
      const conversationId = '1';
      const changes = {
        removed: ['4', '5'],
        updatedBy: '1',
      };

      const notifyMemberRemovedSpy = jest.spyOn(service, 'notifyMemberRemoved');

      await service.notifyMembersChanged(conversationId, changes);

      expect(notifyMemberRemovedSpy).toHaveBeenCalledTimes(2);
      expect(notifyMemberRemovedSpy).toHaveBeenCalledWith(conversationId, '4', '1');
      expect(notifyMemberRemovedSpy).toHaveBeenCalledWith(conversationId, '5', '1');
    });

    it('should notify both added and removed members', async () => {
      const conversationId = '1';
      const changes = {
        added: ['2'],
        removed: ['3'],
        updatedBy: '1',
      };

      const notifyMemberAddedSpy = jest.spyOn(service, 'notifyMemberAdded');
      const notifyMemberRemovedSpy = jest.spyOn(service, 'notifyMemberRemoved');

      await service.notifyMembersChanged(conversationId, changes);

      expect(notifyMemberAddedSpy).toHaveBeenCalledWith(conversationId, '2', '1');
      expect(notifyMemberRemovedSpy).toHaveBeenCalledWith(conversationId, '3', '1');
    });

    it('should handle empty changes arrays', async () => {
      const conversationId = '1';
      const changes = {
        updatedBy: '1',
      };

      const notifyMemberAddedSpy = jest.spyOn(service, 'notifyMemberAdded');
      const notifyMemberRemovedSpy = jest.spyOn(service, 'notifyMemberRemoved');

      await service.notifyMembersChanged(conversationId, changes);

      expect(notifyMemberAddedSpy).not.toHaveBeenCalled();
      expect(notifyMemberRemovedSpy).not.toHaveBeenCalled();
    });
  });
});
