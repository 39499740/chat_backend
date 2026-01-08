import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { SearchService, SearchType } from '../../../../src/modules/search/services/search.service';
import { DatabaseService } from '../../../../src/common/database/database.service';

describe('SearchService', () => {
  let service: SearchService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SearchService,
        {
          provide: DatabaseService,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<SearchService>(SearchService);
    jest.clearAllMocks();
  });

  describe('search', () => {
    it('should search all types when type is ALL', async () => {
      const userId = '1';
      const query = 'test';

      mockDb.query.mockResolvedValue({
        rows: [{ total: 0 }],
      });

      const result = await service.search(userId, query, SearchType.ALL);

      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('posts');
      expect(result).toHaveProperty('messages');
      expect(result).toHaveProperty('conversations');
      expect(mockDb.query).toHaveBeenCalledTimes(8);
    });

    it('should search only users when type is USERS', async () => {
      const userId = '1';
      const query = 'test';

      mockDb.query.mockResolvedValue({
        rows: [{ total: 0 }],
      });

      const result = await service.search(userId, query, SearchType.USERS);

      expect(result).toHaveProperty('users');
      expect(result).not.toHaveProperty('posts');
      expect(result).not.toHaveProperty('messages');
      expect(result).not.toHaveProperty('conversations');
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should search only posts when type is POSTS', async () => {
      const userId = '1';
      const query = 'test';

      mockDb.query.mockResolvedValue({
        rows: [{ total: 0 }],
      });

      const result = await service.search(userId, query, SearchType.POSTS);

      expect(result).toHaveProperty('posts');
      expect(result).not.toHaveProperty('users');
      expect(result).not.toHaveProperty('messages');
      expect(result).not.toHaveProperty('conversations');
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should use default page and limit values', async () => {
      const userId = '1';
      const query = 'test';

      mockDb.query.mockResolvedValue({
        rows: [{ total: 0 }],
      });

      await service.search(userId, query, SearchType.ALL, {});

      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should handle empty query with wrapped wildcards', async () => {
      const userId = '1';
      const query = '';

      mockDb.query.mockResolvedValue({
        rows: [{ total: 0 }],
      });

      const result = await service.search(userId, query, SearchType.ALL);

      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('posts');
    });
  });

  describe('searchUsers', () => {
    it('should search users successfully', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: '2',
            username: 'testuser',
            nickname: 'Test User',
            avatar_url: 'http://example.com/avatar.jpg',
            bio: 'Test bio',
          },
        ],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 1 }],
      });

      const result = await service.searchUsers(userId, query);

      expect(result).toHaveProperty('type', 'users');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.results)).toBe(true);
      expect(result.total).toBe(1);
    });

    it('should handle pagination correctly', async () => {
      const userId = '1';
      const query = '%test%';
      const page = 2;
      const limit = 10;

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 25 }],
      });

      const result = await service.searchUsers(userId, query, { page, limit });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should use default pagination values', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      const result = await service.searchUsers(userId, query);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should exclude current user from results', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      await service.searchUsers(userId, query);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND id != $2'),
        expect.any(Array),
      );
    });

    it('should only search active users', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      await service.searchUsers(userId, query);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = TRUE'),
        expect.any(Array),
      );
    });

    it('should search in username and nickname', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      await service.searchUsers(userId, query);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('username ILIKE $1'),
        expect.any(Array),
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('nickname ILIKE $1'),
        expect.any(Array),
      );
    });

    it('should prioritize exact username matches', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      await service.searchUsers(userId, query);

      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('CASE'), expect.any(Array));
    });
  });

  describe('searchPosts', () => {
    it('should search posts successfully', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            user_id: '2',
            content: 'This is a test post',
            media_urls: [],
            created_at: new Date(),
            username: 'user2',
            nickname: 'User 2',
            avatar_url: null,
            like_count: 10,
            comment_count: 5,
            is_liked: false,
          },
        ],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 1 }],
      });

      const result = await service.searchPosts(userId, query);

      expect(result).toHaveProperty('type', 'posts');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      const userId = '1';
      const query = '%test%';
      const page = 2;
      const limit = 10;

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 25 }],
      });

      const result = await service.searchPosts(userId, query, { page, limit });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should use default pagination values', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      const result = await service.searchPosts(userId, query);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should only search visible posts (public or friends)', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      await service.searchPosts(userId, query);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('p.privacy = 0'),
        expect.any(Array),
      );
    });

    it('should include like status for current user', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      await service.searchPosts(userId, query);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LEFT JOIN post_likes pl ON pl.post_id = p.id AND pl.user_id = $2'),
        expect.any(Array),
      );
    });

    it('should exclude deleted posts', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      await service.searchPosts(userId, query);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('p.is_deleted = FALSE'),
        expect.any(Array),
      );
    });

    it('should order posts by created_at DESC', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      await service.searchPosts(userId, query);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY p.created_at DESC'),
        expect.any(Array),
      );
    });
  });

  describe('searchMessages', () => {
    it('should search messages successfully', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            conversation_id: '1',
            sender_id: '2',
            type: 0,
            content: 'This is a test message',
            media_urls: [],
            created_at: new Date(),
            username: 'user2',
            nickname: 'User 2',
            avatar_url: null,
            conversation_type: 'private',
            conversation_name: null,
          },
        ],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 1 }],
      });

      const result = await service.searchMessages(userId, query);

      expect(result).toHaveProperty('type', 'messages');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      const userId = '1';
      const query = '%test%';
      const page = 2;
      const limit = 10;

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 25 }],
      });

      const result = await service.searchMessages(userId, query, { page, limit });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should use default pagination values', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      const result = await service.searchMessages(userId, query);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should only search text messages (type = 0)', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      await service.searchMessages(userId, query);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND m.type = 0'),
        expect.any(Array),
      );
    });

    it('should only search messages in user conversations', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      await service.searchMessages(userId, query);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE cm.user_id = $2'),
        expect.any(Array),
      );
    });

    it('should exclude deleted messages', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      await service.searchMessages(userId, query);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND m.is_deleted = FALSE'),
        expect.any(Array),
      );
    });

    it('should order messages by created_at DESC', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      await service.searchMessages(userId, query);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY m.created_at DESC'),
        expect.any(Array),
      );
    });
  });

  describe('searchConversations', () => {
    it('should search conversations successfully', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            type: 'group',
            name: 'Test Group',
            avatar_url: null,
            updated_at: new Date(),
            user_role: 'admin',
            message_count: 100,
          },
        ],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 1 }],
      });

      const result = await service.searchConversations(userId, query);

      expect(result).toHaveProperty('type', 'conversations');
      expect(result).toHaveProperty('results');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.results)).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      const userId = '1';
      const query = '%test%';
      const page = 2;
      const limit = 10;

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 25 }],
      });

      const result = await service.searchConversations(userId, query, { page, limit });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should use default pagination values', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      const result = await service.searchConversations(userId, query);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should only search in user conversations', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      await service.searchConversations(userId, query);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE cm.user_id = $1'),
        expect.any(Array),
      );
    });

    it('should search in conversation name and messages', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      await service.searchConversations(userId, query);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('c.name ILIKE $2'),
        expect.any(Array),
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('m2.content ILIKE $2'),
        expect.any(Array),
      );
    });

    it('should use DISTINCT to avoid duplicate conversations', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      await service.searchConversations(userId, query);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT DISTINCT c.id'),
        expect.any(Array),
      );
    });

    it('should order conversations by updated_at DESC', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      await service.searchConversations(userId, query);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY c.updated_at DESC'),
        expect.any(Array),
      );
    });
  });

  describe('getSearchSuggestions', () => {
    it('should get user suggestions successfully', async () => {
      const userId = '1';
      const query = 'test';

      mockDb.query.mockResolvedValue({
        rows: [
          {
            id: '2',
            username: 'testuser',
            nickname: 'Test User',
            avatar_url: 'http://example.com/avatar.jpg',
          },
        ],
      });

      const result = await service.getSearchSuggestions(userId, query);

      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('hashtags');
      expect(Array.isArray(result.users)).toBe(true);
      expect(result.users.length).toBe(1);
    });

    it('should return empty results if query is too short', async () => {
      const userId = '1';
      const query = 'a';

      const result = await service.getSearchSuggestions(userId, query);

      expect(result.users).toEqual([]);
      expect(result.hashtags).toEqual([]);
    });

    it('should return empty results if query is empty', async () => {
      const userId = '1';
      const query = '';

      const result = await service.getSearchSuggestions(userId, query);

      expect(result.users).toEqual([]);
      expect(result.hashtags).toEqual([]);
    });

    it('should use default limit of 10', async () => {
      const userId = '1';
      const query = 'test';

      mockDb.query.mockResolvedValue({
        rows: [],
      });

      await service.getSearchSuggestions(userId, query);

      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT $3'), [
        userId,
        '%test%',
        10,
      ]);
    });

    it('should use custom limit when provided', async () => {
      const userId = '1';
      const query = 'test';
      const limit = 5;

      mockDb.query.mockResolvedValue({
        rows: [],
      });

      await service.getSearchSuggestions(userId, query, limit);

      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT $3'), [
        userId,
        '%test%',
        5,
      ]);
    });

    it('should use custom limit when provided', async () => {
      const userId = '1';
      const query = 'test';
      const limit = 5;

      mockDb.query.mockResolvedValue({
        rows: [],
      });

      await service.getSearchSuggestions(userId, query, limit);

      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('LIMIT $3'), [
        userId,
        '%test%',
        5,
      ]);
    });

    it('should exclude current user from suggestions', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValue({
        rows: [],
      });

      await service.getSearchSuggestions(userId, query);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND id != $1'),
        expect.any(Array),
      );
    });

    it('should only return active users', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValue({
        rows: [],
      });

      await service.getSearchSuggestions(userId, query);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = TRUE'),
        expect.any(Array),
      );
    });

    it('should search in username and nickname', async () => {
      const userId = '1';
      const query = '%test%';

      mockDb.query.mockResolvedValue({
        rows: [],
      });

      await service.getSearchSuggestions(userId, query);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('username ILIKE $2'),
        expect.any(Array),
      );
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('nickname ILIKE $2'),
        expect.any(Array),
      );
    });
  });
});
