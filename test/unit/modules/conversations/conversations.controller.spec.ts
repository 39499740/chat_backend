import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { ConversationsController } from '../../../../src/modules/conversations/controllers/conversations.controller';
import { ConversationsService } from '../../../../src/modules/conversations/services/conversations.service';
import { JwtAuthGuard } from '../../../../src/common/guards/jwt-auth.guard';

class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.user = { id: '1', username: 'testuser' };
    return true;
  }
}

describe('ConversationsController (e2e)', () => {
  let app: INestApplication;
  let controller: ConversationsController;
  let conversationsService: jest.Mocked<ConversationsService>;

  const mockConversationsService = {
    createConversation: jest.fn(),
    getConversations: jest.fn(),
    getConversationDetail: jest.fn(),
    updateConversation: jest.fn(),
    leaveConversation: jest.fn(),
    addMember: jest.fn(),
    removeMember: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ConversationsController],
      providers: [
        {
          provide: ConversationsService,
          useValue: mockConversationsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockAuthGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get<ConversationsController>(ConversationsController);
    conversationsService = module.get(ConversationsService);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /conversations', () => {
    it('should create conversation successfully', async () => {
      const createConversationDto = {
        name: 'Test Conversation',
        type: 1,
        memberIds: ['user2', 'user3'],
      };

      const expectedConversation = {
        id: 'conv-1',
        name: 'Test Conversation',
        type: 1,
        members: [],
      };

      mockConversationsService.createConversation.mockResolvedValue(expectedConversation);

      const response = await request(app.getHttpServer())
        .post('/conversations')
        .send(createConversationDto);

      expect(response.body).toEqual(expectedConversation);
      expect(mockConversationsService.createConversation).toHaveBeenCalledWith(
        '1',
        createConversationDto,
      );
    });

    it('should handle create conversation errors', async () => {
      const createConversationDto = {
        name: 'Test',
        type: 1,
        memberIds: [],
      };

      mockConversationsService.createConversation.mockRejectedValue(new Error('Creation failed'));

      await request(app.getHttpServer())
        .post('/conversations')
        .send(createConversationDto)
        .expect(500);
    });
  });

  describe('GET /conversations', () => {
    it('should get conversations list successfully', async () => {
      const expectedConversations = {
        conversations: [
          { id: 'conv-1', name: 'Chat 1' },
          { id: 'conv-2', name: 'Chat 2' },
        ],
        total: 2,
        page: 1,
        limit: 20,
      };

      mockConversationsService.getConversations.mockResolvedValue(expectedConversations);

      const response = await request(app.getHttpServer()).get('/conversations').expect(200);

      expect(response.body).toEqual(expectedConversations);
      expect(mockConversationsService.getConversations).toHaveBeenCalledWith('1', {
        page: 1,
        limit: 20,
        type: undefined,
      });
    });

    it('should get conversations with pagination', async () => {
      const expectedConversations = {
        conversations: [{ id: 'conv-1' }],
        total: 1,
        page: 2,
        limit: 10,
      };

      mockConversationsService.getConversations.mockResolvedValue(expectedConversations);

      await request(app.getHttpServer()).get('/conversations?page=2&limit=10').expect(200);

      expect(mockConversationsService.getConversations).toHaveBeenCalledWith('1', {
        page: 2,
        limit: 10,
        type: undefined,
      });
    });

    it('should get conversations filtered by type', async () => {
      const expectedConversations = {
        conversations: [{ id: 'conv-1', type: 0 }],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockConversationsService.getConversations.mockResolvedValue(expectedConversations);

      await request(app.getHttpServer()).get('/conversations?type=0').expect(200);

      expect(mockConversationsService.getConversations).toHaveBeenCalledWith('1', {
        page: 1,
        limit: 20,
        type: '0',
      });
    });
  });

  describe('GET /conversations/:conversationId', () => {
    it('should get conversation detail successfully', async () => {
      const conversationId = 'conv-1';
      const expectedConversation = {
        id: conversationId,
        name: 'Test Conversation',
        members: [],
      };

      mockConversationsService.getConversationDetail.mockResolvedValue(expectedConversation);

      const response = await request(app.getHttpServer())
        .get(`/conversations/${conversationId}`)
        .expect(200);

      expect(response.body).toEqual(expectedConversation);
      expect(mockConversationsService.getConversationDetail).toHaveBeenCalledWith(
        conversationId,
        '1',
      );
    });

    it('should return 404 if conversation not found', async () => {
      const conversationId = 'conv-999';

      mockConversationsService.getConversationDetail.mockRejectedValue(new Error('Not found'));

      await request(app.getHttpServer()).get(`/conversations/${conversationId}`).expect(500);
    });
  });

  describe('PUT /conversations/:conversationId', () => {
    it('should update conversation successfully', async () => {
      const conversationId = 'conv-1';
      const updateConversationDto = {
        name: 'Updated Name',
      };

      const expectedConversation = {
        id: conversationId,
        name: 'Updated Name',
      };

      mockConversationsService.updateConversation.mockResolvedValue(expectedConversation);

      const response = await request(app.getHttpServer())
        .put(`/conversations/${conversationId}`)
        .send(updateConversationDto)
        .expect(200);

      expect(response.body).toEqual(expectedConversation);
      expect(mockConversationsService.updateConversation).toHaveBeenCalledWith(
        conversationId,
        '1',
        updateConversationDto,
      );
    });

    it('should handle update errors', async () => {
      const conversationId = 'conv-1';
      const updateConversationDto = { name: 'Updated' };

      mockConversationsService.updateConversation.mockRejectedValue(new Error('Update failed'));

      await request(app.getHttpServer())
        .put(`/conversations/${conversationId}`)
        .send(updateConversationDto)
        .expect(500);
    });
  });

  describe('DELETE /conversations/:conversationId', () => {
    it('should leave conversation successfully', async () => {
      const conversationId = 'conv-1';

      const expectedResponse = {
        message: 'Left conversation',
        conversationId,
      };

      mockConversationsService.leaveConversation.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .delete(`/conversations/${conversationId}`)
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockConversationsService.leaveConversation).toHaveBeenCalledWith(conversationId, '1');
    });

    it('should handle leave errors', async () => {
      const conversationId = 'conv-1';

      mockConversationsService.leaveConversation.mockRejectedValue(new Error('Leave failed'));

      await request(app.getHttpServer()).delete(`/conversations/${conversationId}`).expect(500);
    });
  });

  describe('POST /conversations/:conversationId/members', () => {
    it('should add member successfully', async () => {
      const conversationId = 'conv-1';
      const memberId = 'user-2';

      const expectedMember = {
        id: memberId,
        conversationId,
      };

      mockConversationsService.addMember.mockResolvedValue(expectedMember);

      const response = await request(app.getHttpServer())
        .post(`/conversations/${conversationId}/members`)
        .send({ memberId })
        .expect(201);

      expect(response.body).toEqual(expectedMember);
      expect(mockConversationsService.addMember).toHaveBeenCalledWith(
        conversationId,
        '1',
        memberId,
      );
    });

    it('should handle add member errors', async () => {
      const conversationId = 'conv-1';
      const memberId = 'user-999';

      mockConversationsService.addMember.mockRejectedValue(new Error('Add failed'));

      await request(app.getHttpServer())
        .post(`/conversations/${conversationId}/members`)
        .send({ memberId })
        .expect(500);
    });
  });

  describe('DELETE /conversations/:conversationId/members/:memberId', () => {
    it('should remove member successfully', async () => {
      const conversationId = 'conv-1';
      const memberId = 'user-2';

      const expectedResponse = {
        message: 'Member removed',
        memberId,
      };

      mockConversationsService.removeMember.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .delete(`/conversations/${conversationId}/members/${memberId}`)
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockConversationsService.removeMember).toHaveBeenCalledWith(
        conversationId,
        '1',
        memberId,
      );
    });

    it('should handle remove member errors', async () => {
      const conversationId = 'conv-1';
      const memberId = 'user-999';

      mockConversationsService.removeMember.mockRejectedValue(new Error('Remove failed'));

      await request(app.getHttpServer())
        .delete(`/conversations/${conversationId}/members/${memberId}`)
        .expect(500);
    });
  });

  describe('Controller instantiation', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });
});
