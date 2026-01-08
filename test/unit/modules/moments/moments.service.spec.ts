import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MomentsService } from '../../../../src/modules/moments/services/moments.service';
import { DatabaseService } from '../../../../src/common/database/database.service';

describe('MomentsService', () => {
  let service: MomentsService;
  let mockDb: any;

  beforeEach(async () => {
    mockDb = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MomentsService,
        {
          provide: DatabaseService,
          useValue: mockDb,
        },
      ],
    }).compile();

    service = module.get<MomentsService>(MomentsService);
    jest.clearAllMocks();
  });

  describe('createPost', () => {
    it('should create a text post successfully', async () => {
      const userId = '1';
      const postData = {
        content: 'Hello world',
        visibility: 0,
      };

      mockDb.query.mockResolvedValue({
        rows: [
          {
            id: '1',
            user_id: userId,
            content: 'Hello world',
            media_urls: [],
            location: null,
            visibility: 0,
            is_deleted: false,
            like_count: 0,
            comment_count: 0,
            created_at: new Date(),
          },
        ],
      });

      const result = await service.createPost(userId, postData);

      expect(result).toHaveProperty('id');
      expect(result.content).toBe('Hello world');
      expect(result.like_count).toBe(0);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO posts'),
        expect.any(Array),
      );
    });

    it('should create a post with media URLs', async () => {
      const userId = '1';
      const postData = {
        media_urls: ['http://example.com/image1.jpg', 'http://example.com/image2.jpg'],
        visibility: 0,
      };

      mockDb.query.mockResolvedValue({
        rows: [
          {
            id: '1',
            user_id: userId,
            content: null,
            media_urls: postData.media_urls,
            visibility: 0,
            like_count: 0,
            comment_count: 0,
          },
        ],
      });

      const result = await service.createPost(userId, postData);

      expect(result.media_urls).toEqual(postData.media_urls);
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should create a post with both content and media', async () => {
      const userId = '1';
      const postData = {
        content: 'Beautiful sunset',
        media_urls: ['http://example.com/image.jpg'],
        location: 'Beijing',
        visibility: 1,
      };

      mockDb.query.mockResolvedValue({
        rows: [
          {
            id: '1',
            ...postData,
            like_count: 0,
            comment_count: 0,
          },
        ],
      });

      const result = await service.createPost(userId, postData);

      expect(result.content).toBe('Beautiful sunset');
      expect(result.location).toBe('Beijing');
      expect(result.visibility).toBe(1);
    });

    it('should throw BadRequestException if content and media are empty', async () => {
      const userId = '1';
      const postData = {};

      await expect(service.createPost(userId, postData)).rejects.toThrow(BadRequestException);
      await expect(service.createPost(userId, postData)).rejects.toThrow('动态内容不能为空');
    });

    it('should create post with whitespace content (service does not trim)', async () => {
      const userId = '1';
      const postData = {
        content: '   ',
        media_urls: [],
        visibility: 0,
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            user_id: userId,
            content: '   ',
            media_urls: [],
            visibility: 0,
            like_count: 0,
            comment_count: 0,
          },
        ],
      });

      const result = await service.createPost(userId, postData);

      expect(result.content).toBe('   ');
    });
  });

  describe('getFeed', () => {
    it('should get all posts feed (type = 0)', async () => {
      const userId = '1';
      const feedDto = {
        page: 1,
        limit: 20,
        type: 0,
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            user_id: '2',
            content: 'Post 1',
            username: 'user2',
            like_count: 5,
            comment_count: 3,
          },
        ],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 1 }],
      });

      const result = await service.getFeed(userId, feedDto);

      expect(result).toHaveProperty('posts');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('page', 1);
      expect(result).toHaveProperty('limit', 20);
      expect(Array.isArray(result.posts)).toBe(true);
    });

    it('should get friends only feed (type = 1)', async () => {
      const userId = '1';
      const feedDto = {
        page: 1,
        limit: 20,
        type: 1,
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      const result = await service.getFeed(userId, feedDto);

      expect(result.posts).toEqual([]);
      expect(result.total).toBe(0);
      expect(mockDb.query).toHaveBeenCalledTimes(2);
    });

    it('should handle pagination correctly', async () => {
      const userId = '1';
      const feedDto = {
        page: 2,
        limit: 10,
        type: 0,
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 25 }],
      });

      const result = await service.getFeed(userId, feedDto);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should use default page and limit values', async () => {
      const userId = '1';
      const feedDto = {
        type: 0,
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      const result = await service.getFeed(userId, feedDto);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should order posts by created_at DESC', async () => {
      const userId = '1';
      const feedDto = { type: 0 };

      mockDb.query.mockResolvedValueOnce({
        rows: [
          { id: '1', created_at: new Date('2024-01-02') },
          { id: '2', created_at: new Date('2024-01-01') },
        ],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 2 }],
      });

      const result = await service.getFeed(userId, feedDto);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY p.created_at DESC'),
        expect.any(Array),
      );
    });
  });

  describe('getUserPosts', () => {
    it('should get user posts successfully', async () => {
      const userId = '1';
      const targetUserId = '2';

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            user_id: targetUserId,
            content: 'User post',
            username: 'user2',
            like_count: 10,
            comment_count: 5,
          },
        ],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 1 }],
      });

      const result = await service.getUserPosts(userId, targetUserId);

      expect(result).toHaveProperty('posts');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.posts)).toBe(true);
    });

    it('should get posts with pagination', async () => {
      const userId = '1';
      const targetUserId = '2';
      const page = 2;
      const limit = 10;

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 25 }],
      });

      const result = await service.getUserPosts(userId, targetUserId, page, limit);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should use default pagination values', async () => {
      const userId = '1';
      const targetUserId = '2';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      const result = await service.getUserPosts(userId, targetUserId);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should filter posts by visibility based on friendship', async () => {
      const userId = '1';
      const targetUserId = '2';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      await service.getUserPosts(userId, targetUserId);

      expect(mockDb.query).toHaveBeenCalledWith(expect.stringContaining('visibility'), [
        targetUserId,
        userId,
        20,
        0,
      ]);
    });

    it('should exclude deleted posts', async () => {
      const userId = '1';
      const targetUserId = '2';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 0 }],
      });

      await service.getUserPosts(userId, targetUserId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('is_deleted = false'),
        expect.any(Array),
      );
    });
  });

  describe('getPostDetail', () => {
    it('should get post detail successfully', async () => {
      const postId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: postId,
            user_id: userId,
            content: 'Post content',
            username: 'user1',
            is_liked: false,
            like_count: 10,
            comment_count: 5,
          },
        ],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            content: 'Comment 1',
            username: 'user2',
            is_liked: false,
          },
        ],
      });

      const result = await service.getPostDetail(postId, userId);

      expect(result).toHaveProperty('id', postId);
      expect(result).toHaveProperty('comments');
      expect(Array.isArray(result.comments)).toBe(true);
    });

    it('should throw NotFoundException if post does not exist', async () => {
      const postId = '999';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      await expect(service.getPostDetail(postId, userId)).rejects.toThrow(NotFoundException);
    });

    it('should include like status for current user', async () => {
      const postId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: postId,
            is_liked: true,
          },
        ],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.getPostDetail(postId, userId);

      expect(result.is_liked).toBe(true);
    });

    it('should include comments with like status', async () => {
      const postId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: postId }],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            content: 'Comment 1',
            is_liked: true,
          },
          {
            id: '2',
            content: 'Comment 2',
            is_liked: false,
          },
        ],
      });

      const result = await service.getPostDetail(postId, userId);

      expect(result.comments[0].is_liked).toBe(true);
      expect(result.comments[1].is_liked).toBe(false);
    });

    it('should exclude deleted comments', async () => {
      const postId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: postId }],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      await service.getPostDetail(postId, userId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('is_deleted = false'),
        expect.any(Array),
      );
    });
  });

  describe('deletePost', () => {
    it('should delete post successfully', async () => {
      const postId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: postId,
            user_id: userId,
            is_deleted: false,
          },
        ],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      const result = await service.deletePost(postId, userId);

      expect(result).toHaveProperty('message', '动态删除成功');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE posts SET is_deleted = true'),
        [postId],
      );
    });

    it('should throw NotFoundException if post does not exist', async () => {
      const postId = '999';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      await expect(service.deletePost(postId, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user does not own the post', async () => {
      const postId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      await expect(service.deletePost(postId, userId)).rejects.toThrow(NotFoundException);
    });

    it('should check post ownership before deletion', async () => {
      const postId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: postId, user_id: userId }],
      });

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await service.deletePost(postId, userId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1 AND user_id = $2'),
        [postId, userId],
      );
    });

    it('should soft delete instead of hard delete', async () => {
      const postId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: postId, user_id: userId }],
      });

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await service.deletePost(postId, userId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SET is_deleted = true'),
        expect.not.stringContaining('DELETE'),
      );
    });
  });

  describe('likePost', () => {
    it('should like post successfully', async () => {
      const postId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.likePost(postId, userId);

      expect(result).toHaveProperty('message', '点赞成功');
      expect(result).toHaveProperty('liked', true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO post_likes'),
        expect.any(Array),
      );
    });

    it('should unlike post if already liked', async () => {
      const postId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ post_id: postId, user_id: userId }],
      });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.likePost(postId, userId);

      expect(result).toHaveProperty('message', '已取消点赞');
      expect(result).toHaveProperty('liked', false);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM post_likes'),
        expect.any(Array),
      );
    });

    it('should increment like_count when liking', async () => {
      const postId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await service.likePost(postId, userId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE posts SET like_count = like_count + 1'),
        [postId],
      );
    });

    it('should decrement like_count when unliking', async () => {
      const postId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ post_id: postId, user_id: userId }],
      });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await service.likePost(postId, userId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE posts SET like_count = like_count - 1'),
        [postId],
      );
    });

    it('should check existing like before liking', async () => {
      const postId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await service.likePost(postId, userId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM post_likes WHERE'),
        [postId, userId],
      );
    });
  });

  describe('addComment', () => {
    it('should add comment successfully', async () => {
      const postId = '1';
      const userId = '1';
      const commentData = {
        content: 'Great post!',
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            post_id: postId,
            user_id: userId,
            content: 'Great post!',
            like_count: 0,
          },
        ],
      });
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.addComment(postId, userId, commentData);

      expect(result).toHaveProperty('id');
      expect(result.content).toBe('Great post!');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO comments'),
        expect.any(Array),
      );
    });

    it('should add reply comment (nested comment)', async () => {
      const postId = '1';
      const userId = '1';
      const commentData = {
        content: 'Reply to comment',
        parent_id: '2',
      };

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: '3',
            content: 'Reply to comment',
            parent_id: '2',
          },
        ],
      });
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.addComment(postId, userId, commentData);

      expect(result.parent_id).toBe('2');
    });

    it('should increment post comment_count', async () => {
      const postId = '1';
      const userId = '1';
      const commentData = { content: 'Comment' };

      mockDb.query.mockResolvedValueOnce({ rows: [{ id: '1' }] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await service.addComment(postId, userId, commentData);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE posts SET comment_count = comment_count + 1'),
        [postId],
      );
    });

    it('should throw BadRequestException if content is empty', async () => {
      const postId = '1';
      const userId = '1';
      const commentData = { content: '' };

      await expect(service.addComment(postId, userId, commentData)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.addComment(postId, userId, commentData)).rejects.toThrow(
        '评论内容不能为空',
      );
    });

    it('should throw BadRequestException if content is only whitespace', async () => {
      const postId = '1';
      const userId = '1';
      const commentData = { content: '   ' };

      await expect(service.addComment(postId, userId, commentData)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getComments', () => {
    it('should get comments successfully', async () => {
      const postId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            content: 'Comment 1',
            username: 'user2',
            is_liked: false,
          },
          {
            id: '2',
            content: 'Comment 2',
            username: 'user3',
            is_liked: true,
          },
        ],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 2 }],
      });

      const result = await service.getComments(postId, 1, 20, userId);

      expect(result).toHaveProperty('comments');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.comments)).toBe(true);
      expect(result.total).toBe(2);
    });

    it('should handle pagination', async () => {
      const postId = '1';
      const userId = '1';
      const page = 2;
      const limit = 10;

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 25 }],
      });

      const result = await service.getComments(postId, page, limit, userId);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });

    it('should include like status for comments', async () => {
      const postId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: '1',
            content: 'Comment',
            is_liked: true,
          },
        ],
      });

      mockDb.query.mockResolvedValueOnce({
        rows: [{ total: 1 }],
      });

      const result = await service.getComments(postId, 1, 20, userId);

      expect(result.comments[0].is_liked).toBe(true);
    });

    it('should use default pagination values', async () => {
      const postId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [{ total: 0 }] });

      const result = await service.getComments(postId, undefined, undefined, userId);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should exclude deleted comments', async () => {
      const postId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [{ total: 0 }] });

      await service.getComments(postId, 1, 20, userId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('is_deleted = false'),
        expect.any(Array),
      );
    });
  });

  describe('deleteComment', () => {
    it('should delete comment successfully', async () => {
      const commentId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [
          {
            id: commentId,
            user_id: userId,
            post_id: '2',
          },
        ],
      });

      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.deleteComment(commentId, userId);

      expect(result).toHaveProperty('message', '评论删除成功');
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE comments SET is_deleted = true'),
        [commentId],
      );
    });

    it('should throw NotFoundException if comment does not exist', async () => {
      const commentId = '999';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      await expect(service.deleteComment(commentId, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if user does not own the comment', async () => {
      const commentId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [],
      });

      await expect(service.deleteComment(commentId, userId)).rejects.toThrow(NotFoundException);
    });

    it('should decrement post comment_count', async () => {
      const commentId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: commentId, user_id: userId, post_id: '2' }],
      });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await service.deleteComment(commentId, userId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE posts SET comment_count = comment_count - 1'),
        expect.any(Array),
      );
    });

    it('should soft delete instead of hard delete', async () => {
      const commentId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ id: commentId, user_id: userId, post_id: '2' }],
      });
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await service.deleteComment(commentId, userId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SET is_deleted = true'),
        expect.not.stringContaining('DELETE'),
      );
    });
  });

  describe('likeComment', () => {
    it('should like comment successfully', async () => {
      const commentId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.likeComment(commentId, userId);

      expect(result).toHaveProperty('message', '点赞成功');
      expect(result).toHaveProperty('liked', true);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO comment_likes'),
        expect.any(Array),
      );
    });

    it('should unlike comment if already liked', async () => {
      const commentId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ comment_id: commentId, user_id: userId }],
      });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.likeComment(commentId, userId);

      expect(result).toHaveProperty('message', '已取消点赞');
      expect(result).toHaveProperty('liked', false);
      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM comment_likes'),
        expect.any(Array),
      );
    });

    it('should increment comment like_count when liking', async () => {
      const commentId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await service.likeComment(commentId, userId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE comments SET like_count = like_count + 1'),
        [commentId],
      );
    });

    it('should decrement comment like_count when unliking', async () => {
      const commentId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({
        rows: [{ comment_id: commentId, user_id: userId }],
      });
      mockDb.query.mockResolvedValueOnce({ rows: [] });
      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await service.likeComment(commentId, userId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE comments SET like_count = like_count - 1'),
        [commentId],
      );
    });

    it('should check existing like before liking', async () => {
      const commentId = '1';
      const userId = '1';

      mockDb.query.mockResolvedValueOnce({ rows: [] });

      await service.likeComment(commentId, userId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM comment_likes WHERE'),
        [commentId, userId],
      );
    });
  });
});
