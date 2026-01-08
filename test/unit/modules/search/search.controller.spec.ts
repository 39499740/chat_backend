import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { SearchController } from '../../../../src/modules/search/controllers/search.controller';
import { SearchService } from '../../../../src/modules/search/services/search.service';
import { JwtAuthGuard } from '../../../../src/common/guards/jwt-auth.guard';

class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.user = { id: '1', username: 'testuser' };
    return true;
  }
}

describe('SearchController (e2e)', () => {
  let app: INestApplication;
  let controller: SearchController;
  let searchService: jest.Mocked<SearchService>;

  const mockSearchService = {
    search: jest.fn(),
    searchUsers: jest.fn(),
    searchPosts: jest.fn(),
    searchMessages: jest.fn(),
    searchConversations: jest.fn(),
    getSearchSuggestions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SearchController],
      providers: [
        {
          provide: SearchService,
          useValue: mockSearchService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockAuthGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get<SearchController>(SearchController);
    searchService = module.get(SearchService);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('GET /search', () => {
    it('should search content successfully', async () => {
      const query = 'test';
      const expectedResults = {
        results: [
          { id: '1', type: 'user', title: 'testuser' },
          { id: '2', type: 'post', title: 'Test post' },
        ],
        total: 2,
        page: 1,
        limit: 20,
      };

      mockSearchService.search.mockResolvedValue(expectedResults);

      const response = await request(app.getHttpServer())
        .get('/search')
        .query({ query })
        .expect(200);

      expect(response.body).toEqual(expectedResults);
      expect(mockSearchService.search).toHaveBeenCalledWith('1', query, undefined, {
        page: 1,
        limit: 20,
      });
    });

    it('should search with pagination', async () => {
      const query = 'test';
      const expectedResults = {
        results: [{ id: '1' }],
        total: 1,
        page: 2,
        limit: 10,
      };

      mockSearchService.search.mockResolvedValue(expectedResults);

      await request(app.getHttpServer())
        .get('/search')
        .query({ query, page: 2, limit: 10 })
        .expect(200);

      expect(mockSearchService.search).toHaveBeenCalledWith('1', query, undefined, {
        page: 2,
        limit: 10,
      });
    });

    it('should search filtered by type', async () => {
      const query = 'test';
      const type = 'user';
      const expectedResults = {
        results: [{ id: '1', type: 'user' }],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockSearchService.search.mockResolvedValue(expectedResults);

      await request(app.getHttpServer()).get('/search').query({ query, type }).expect(200);

      expect(mockSearchService.search).toHaveBeenCalledWith('1', query, type, {
        page: 1,
        limit: 20,
      });
    });
  });

  describe('GET /search/users', () => {
    it('should search users successfully', async () => {
      const query = 'testuser';
      const expectedResults = {
        users: [
          { id: '1', username: 'testuser' },
          { id: '2', username: 'testuser2' },
        ],
        total: 2,
        page: 1,
        limit: 20,
      };

      mockSearchService.searchUsers.mockResolvedValue(expectedResults);

      const response = await request(app.getHttpServer())
        .get('/search/users')
        .query({ query })
        .expect(200);

      expect(response.body).toEqual(expectedResults);
      expect(mockSearchService.searchUsers).toHaveBeenCalledWith('1', query, {
        page: 1,
        limit: 20,
      });
    });

    it('should search users with pagination', async () => {
      const query = 'test';
      const expectedResults = {
        users: [{ id: '1' }],
        total: 1,
        page: 2,
        limit: 10,
      };

      mockSearchService.searchUsers.mockResolvedValue(expectedResults);

      await request(app.getHttpServer())
        .get('/search/users')
        .query({ query, page: 2, limit: 10 })
        .expect(200);

      expect(mockSearchService.searchUsers).toHaveBeenCalledWith('1', query, {
        page: 2,
        limit: 10,
      });
    });
  });

  describe('GET /search/posts', () => {
    it('should search posts successfully', async () => {
      const query = 'test post';
      const expectedResults = {
        posts: [
          { id: '1', content: 'Test post content' },
          { id: '2', content: 'Another test' },
        ],
        total: 2,
        page: 1,
        limit: 20,
      };

      mockSearchService.searchPosts.mockResolvedValue(expectedResults);

      const response = await request(app.getHttpServer())
        .get('/search/posts')
        .query({ query })
        .expect(200);

      expect(response.body).toEqual(expectedResults);
      expect(mockSearchService.searchPosts).toHaveBeenCalledWith('1', query, {
        page: 1,
        limit: 20,
      });
    });

    it('should search posts with pagination', async () => {
      const query = 'test';
      const expectedResults = {
        posts: [{ id: '1' }],
        total: 1,
        page: 2,
        limit: 10,
      };

      mockSearchService.searchPosts.mockResolvedValue(expectedResults);

      await request(app.getHttpServer())
        .get('/search/posts')
        .query({ query, page: 2, limit: 10 })
        .expect(200);

      expect(mockSearchService.searchPosts).toHaveBeenCalledWith('1', query, {
        page: 2,
        limit: 10,
      });
    });
  });

  describe('GET /search/messages', () => {
    it('should search messages successfully', async () => {
      const query = 'test message';
      const expectedResults = {
        messages: [
          { id: '1', content: 'Test message' },
          { id: '2', content: 'Another test' },
        ],
        total: 2,
        page: 1,
        limit: 20,
      };

      mockSearchService.searchMessages.mockResolvedValue(expectedResults);

      const response = await request(app.getHttpServer())
        .get('/search/messages')
        .query({ query })
        .expect(200);

      expect(response.body).toEqual(expectedResults);
      expect(mockSearchService.searchMessages).toHaveBeenCalledWith('1', query, {
        page: 1,
        limit: 20,
      });
    });

    it('should search messages with pagination', async () => {
      const query = 'test';
      const expectedResults = {
        messages: [{ id: '1' }],
        total: 1,
        page: 2,
        limit: 10,
      };

      mockSearchService.searchMessages.mockResolvedValue(expectedResults);

      await request(app.getHttpServer())
        .get('/search/messages')
        .query({ query, page: 2, limit: 10 })
        .expect(200);

      expect(mockSearchService.searchMessages).toHaveBeenCalledWith('1', query, {
        page: 2,
        limit: 10,
      });
    });
  });

  describe('GET /search/conversations', () => {
    it('should search conversations successfully', async () => {
      const query = 'test chat';
      const expectedResults = {
        conversations: [
          { id: '1', name: 'Test Chat' },
          { id: '2', name: 'Another Test' },
        ],
        total: 2,
        page: 1,
        limit: 20,
      };

      mockSearchService.searchConversations.mockResolvedValue(expectedResults);

      const response = await request(app.getHttpServer())
        .get('/search/conversations')
        .query({ query })
        .expect(200);

      expect(response.body).toEqual(expectedResults);
      expect(mockSearchService.searchConversations).toHaveBeenCalledWith('1', query, {
        page: 1,
        limit: 20,
      });
    });

    it('should search conversations with pagination', async () => {
      const query = 'test';
      const expectedResults = {
        conversations: [{ id: '1' }],
        total: 1,
        page: 2,
        limit: 10,
      };

      mockSearchService.searchConversations.mockResolvedValue(expectedResults);

      await request(app.getHttpServer())
        .get('/search/conversations')
        .query({ query, page: 2, limit: 10 })
        .expect(200);

      expect(mockSearchService.searchConversations).toHaveBeenCalledWith('1', query, {
        page: 2,
        limit: 10,
      });
    });
  });

  describe('GET /search/suggestions', () => {
    it('should get search suggestions successfully', async () => {
      const query = 'test';
      const expectedSuggestions = [
        { text: 'test user', type: 'user' },
        { text: 'test post', type: 'post' },
      ];

      mockSearchService.getSearchSuggestions.mockResolvedValue(expectedSuggestions);

      const response = await request(app.getHttpServer())
        .get('/search/suggestions')
        .query({ query })
        .expect(200);

      expect(response.body).toEqual(expectedSuggestions);
      expect(mockSearchService.getSearchSuggestions).toHaveBeenCalledWith('1', query, 10);
    });

    it('should get suggestions with custom limit', async () => {
      const query = 'test';
      const expectedSuggestions = [{ text: 'test user', type: 'user' }];

      mockSearchService.getSearchSuggestions.mockResolvedValue(expectedSuggestions);

      await request(app.getHttpServer())
        .get('/search/suggestions')
        .query({ query, limit: 5 })
        .expect(200);

      expect(mockSearchService.getSearchSuggestions).toHaveBeenCalledWith('1', query, 5);
    });
  });

  describe('Controller instantiation', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });
});
