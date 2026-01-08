import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { FriendsController } from '../../../../src/modules/friends/controllers/friends.controller';
import { FriendsService } from '../../../../src/modules/friends/services/friends.service';
import { JwtAuthGuard } from '../../../../src/common/guards/jwt-auth.guard';

class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.user = { id: '1', username: 'testuser' };
    return true;
  }
}

describe('FriendsController (e2e)', () => {
  let app: INestApplication;
  let controller: FriendsController;
  let friendsService: jest.Mocked<FriendsService>;

  const mockFriendsService = {
    sendFriendRequest: jest.fn(),
    acceptFriendRequest: jest.fn(),
    rejectFriendRequest: jest.fn(),
    getFriendsList: jest.fn(),
    getPendingRequests: jest.fn(),
    getSentRequests: jest.fn(),
    deleteFriend: jest.fn(),
    checkFriendship: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FriendsController],
      providers: [
        {
          provide: FriendsService,
          useValue: mockFriendsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockAuthGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get<FriendsController>(FriendsController);
    friendsService = module.get(FriendsService);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /friends/request', () => {
    it('should send friend request successfully', async () => {
      const sendFriendRequestDto = {
        friendId: 'user-2',
        message: "Hi, let's be friends",
      };

      const expectedRequest = {
        id: 'req-1',
        fromUserId: '1',
        toUserId: 'user-2',
        status: 'pending',
      };

      mockFriendsService.sendFriendRequest.mockResolvedValue(expectedRequest);

      const response = await request(app.getHttpServer())
        .post('/friends/request')
        .send(sendFriendRequestDto)
        .expect(201);

      expect(response.body).toEqual(expectedRequest);
      expect(mockFriendsService.sendFriendRequest).toHaveBeenCalledWith(
        '1',
        sendFriendRequestDto.friendId,
        sendFriendRequestDto.message,
      );
    });

    it('should handle send request errors', async () => {
      const sendFriendRequestDto = {
        friendId: 'user-999',
        message: 'Hi',
      };

      mockFriendsService.sendFriendRequest.mockRejectedValue(new Error('User not found'));

      await request(app.getHttpServer())
        .post('/friends/request')
        .send(sendFriendRequestDto)
        .expect(500);
    });
  });

  describe('POST /friends/request/:requestId/accept', () => {
    it('should accept friend request successfully', async () => {
      const requestId = 'req-1';

      const expectedFriend = {
        id: 'friend-1',
        userId1: '1',
        userId2: 'user-2',
      };

      mockFriendsService.acceptFriendRequest.mockResolvedValue(expectedFriend);

      const response = await request(app.getHttpServer()).post(
        `/friends/request/${requestId}/accept`,
      );

      expect(response.body).toEqual(expectedFriend);
      expect(mockFriendsService.acceptFriendRequest).toHaveBeenCalledWith('1', requestId);
    });

    it('should handle accept request errors', async () => {
      const requestId = 'req-999';

      mockFriendsService.acceptFriendRequest.mockRejectedValue(new Error('Request not found'));

      await request(app.getHttpServer()).post(`/friends/request/${requestId}/accept`).expect(500);
    });
  });

  describe('POST /friends/request/:requestId/reject', () => {
    it('should reject friend request successfully', async () => {
      const requestId = 'req-1';

      const expectedResponse = {
        message: 'Friend request rejected',
        requestId,
      };

      mockFriendsService.rejectFriendRequest.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer()).post(
        `/friends/request/${requestId}/reject`,
      );

      expect(response.body).toEqual(expectedResponse);
      expect(mockFriendsService.rejectFriendRequest).toHaveBeenCalledWith('1', requestId);
    });

    it('should handle reject request errors', async () => {
      const requestId = 'req-999';

      mockFriendsService.rejectFriendRequest.mockRejectedValue(new Error('Request not found'));

      await request(app.getHttpServer()).post(`/friends/request/${requestId}/reject`).expect(500);
    });
  });

  describe('GET /friends', () => {
    it('should get friends list successfully', async () => {
      const expectedFriends = {
        friends: [
          { id: 'friend-1', userId: 'user-2' },
          { id: 'friend-2', userId: 'user-3' },
        ],
        total: 2,
        page: 1,
        limit: 20,
      };

      mockFriendsService.getFriendsList.mockResolvedValue(expectedFriends);

      const response = await request(app.getHttpServer()).get('/friends').expect(200);

      expect(response.body).toEqual(expectedFriends);
      expect(mockFriendsService.getFriendsList).toHaveBeenCalledWith('1', 1, 20);
    });

    it('should get friends list with pagination', async () => {
      const expectedFriends = {
        friends: [{ id: 'friend-1' }],
        total: 1,
        page: 2,
        limit: 10,
      };

      mockFriendsService.getFriendsList.mockResolvedValue(expectedFriends);

      await request(app.getHttpServer()).get('/friends?page=2&limit=10').expect(200);

      expect(mockFriendsService.getFriendsList).toHaveBeenCalledWith('1', 2, 10);
    });
  });

  describe('GET /friends/pending', () => {
    it('should get pending requests successfully', async () => {
      const expectedRequests = [
        { id: 'req-1', fromUserId: 'user-2', toUserId: '1' },
        { id: 'req-2', fromUserId: 'user-3', toUserId: '1' },
      ];

      mockFriendsService.getPendingRequests.mockResolvedValue(expectedRequests);

      const response = await request(app.getHttpServer()).get('/friends/pending').expect(200);

      expect(response.body).toEqual(expectedRequests);
      expect(mockFriendsService.getPendingRequests).toHaveBeenCalledWith('1');
    });
  });

  describe('GET /friends/sent', () => {
    it('should get sent requests successfully', async () => {
      const expectedRequests = [{ id: 'req-1', fromUserId: '1', toUserId: 'user-2' }];

      mockFriendsService.getSentRequests.mockResolvedValue(expectedRequests);

      const response = await request(app.getHttpServer()).get('/friends/sent').expect(200);

      expect(response.body).toEqual(expectedRequests);
      expect(mockFriendsService.getSentRequests).toHaveBeenCalledWith('1');
    });
  });

  describe('DELETE /friends/:friendId', () => {
    it('should delete friend successfully', async () => {
      const friendId = 'user-2';

      const expectedResponse = {
        message: 'Friend deleted',
        friendId,
      };

      mockFriendsService.deleteFriend.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .delete(`/friends/${friendId}`)
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockFriendsService.deleteFriend).toHaveBeenCalledWith('1', friendId);
    });

    it('should handle delete friend errors', async () => {
      const friendId = 'user-999';

      mockFriendsService.deleteFriend.mockRejectedValue(new Error('Friend not found'));

      await request(app.getHttpServer()).delete(`/friends/${friendId}`).expect(500);
    });
  });

  describe('GET /friends/check/:friendId', () => {
    it('should check friendship successfully', async () => {
      const friendId = 'user-2';

      const expectedResponse = {
        isFriend: true,
        status: 'accepted',
      };

      mockFriendsService.checkFriendship.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .get(`/friends/check/${friendId}`)
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockFriendsService.checkFriendship).toHaveBeenCalledWith('1', friendId);
    });

    it('should return not friend status', async () => {
      const friendId = 'user-999';

      const expectedResponse = {
        isFriend: false,
        status: 'none',
      };

      mockFriendsService.checkFriendship.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .get(`/friends/check/${friendId}`)
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockFriendsService.checkFriendship).toHaveBeenCalledWith('1', friendId);
    });
  });

  describe('Controller instantiation', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });
});
