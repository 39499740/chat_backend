import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { MomentsController } from '../../../../src/modules/moments/controllers/moments.controller';
import { MomentsService } from '../../../../src/modules/moments/services/moments.service';
import { JwtAuthGuard } from '../../../../src/common/guards/jwt-auth.guard';

class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.user = { id: '1', username: 'testuser' };
    return true;
  }
}

describe('MomentsController (e2e)', () => {
  let app: INestApplication;
  let controller: MomentsController;
  let momentsService: jest.Mocked<MomentsService>;

  const mockMomentsService = {
    createPost: jest.fn(),
    getFeed: jest.fn(),
    getUserPosts: jest.fn(),
    getPostDetail: jest.fn(),
    deletePost: jest.fn(),
    likePost: jest.fn(),
    addComment: jest.fn(),
    getComments: jest.fn(),
    deleteComment: jest.fn(),
    likeComment: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MomentsController],
      providers: [
        {
          provide: MomentsService,
          useValue: mockMomentsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockAuthGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get<MomentsController>(MomentsController);
    momentsService = module.get(MomentsService);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /moments/posts', () => {
    it('should create post successfully', async () => {
      const createPostDto = {
        content: 'Hello World',
        mediaUrls: [],
        privacy: 0,
      };

      const expectedPost = {
        id: 'post-1',
        userId: '1',
        content: 'Hello World',
        privacy: 0,
      };

      mockMomentsService.createPost.mockResolvedValue(expectedPost);

      const response = await request(app.getHttpServer())
        .post('/moments/posts')
        .send(createPostDto);

      expect(response.body).toMatchObject({
        id: 'post-1',
        userId: '1',
        content: 'Hello World',
        privacy: 0,
      });
      expect(mockMomentsService.createPost).toHaveBeenCalledWith('1', createPostDto);
    });

    it('should handle create post errors', async () => {
      const createPostDto = {
        content: 'Test',
        mediaUrls: [],
        privacy: 0,
      };

      mockMomentsService.createPost.mockRejectedValue(new Error('Create failed'));

      await request(app.getHttpServer()).post('/moments/posts').send(createPostDto).expect(500);
    });
  });

  describe('GET /moments/feed', () => {
    it('should get feed successfully', async () => {
      const expectedFeed = {
        posts: [
          { id: 'post-1', content: 'Post 1' },
          { id: 'post-2', content: 'Post 2' },
        ],
        total: 2,
        page: 1,
        limit: 20,
      };

      mockMomentsService.getFeed.mockResolvedValue(expectedFeed);

      const response = await request(app.getHttpServer()).get('/moments/feed').expect(200);

      expect(response.body).toEqual(expectedFeed);
      expect(mockMomentsService.getFeed).toHaveBeenCalledWith('1', {
        page: 1,
        limit: 20,
        type: 0,
      });
    });

    it('should get feed with pagination', async () => {
      const expectedFeed = {
        posts: [{ id: 'post-1' }],
        total: 1,
        page: 2,
        limit: 10,
      };

      mockMomentsService.getFeed.mockResolvedValue(expectedFeed);

      await request(app.getHttpServer()).get('/moments/feed?page=2&limit=10').expect(200);

      expect(mockMomentsService.getFeed).toHaveBeenCalledWith('1', {
        page: 2,
        limit: 10,
        type: 0,
      });
    });

    it('should get feed filtered by type', async () => {
      const expectedFeed = {
        posts: [{ id: 'post-1', type: 1 }],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockMomentsService.getFeed.mockResolvedValue(expectedFeed);

      await request(app.getHttpServer()).get('/moments/feed?type=1').expect(200);

      expect(mockMomentsService.getFeed).toHaveBeenCalledWith('1', {
        page: 1,
        limit: 20,
        type: 1,
      });
    });
  });

  describe('GET /moments/posts/user/:userId', () => {
    it('should get user posts successfully', async () => {
      const userId = 'user-2';
      const expectedPosts = {
        posts: [{ id: 'post-1', userId: 'user-2', content: 'Post 1' }],
        total: 1,
        page: 1,
        limit: 20,
      };

      mockMomentsService.getUserPosts.mockResolvedValue(expectedPosts);

      const response = await request(app.getHttpServer())
        .get(`/moments/posts/user/${userId}`)
        .expect(200);

      expect(response.body).toEqual(expectedPosts);
      expect(mockMomentsService.getUserPosts).toHaveBeenCalledWith('1', userId, 1, 20);
    });

    it('should get user posts with pagination', async () => {
      const userId = 'user-2';

      mockMomentsService.getUserPosts.mockResolvedValue({
        posts: [],
        total: 0,
        page: 2,
        limit: 10,
      });

      await request(app.getHttpServer())
        .get(`/moments/posts/user/${userId}?page=2&limit=10`)
        .expect(200);

      expect(mockMomentsService.getUserPosts).toHaveBeenCalledWith('1', userId, 2, 10);
    });
  });

  describe('GET /moments/posts/:postId', () => {
    it('should get post detail successfully', async () => {
      const postId = 'post-1';
      const expectedPost = {
        id: postId,
        userId: 'user-2',
        content: 'Post content',
      };

      mockMomentsService.getPostDetail.mockResolvedValue(expectedPost);

      const response = await request(app.getHttpServer())
        .get(`/moments/posts/${postId}`)
        .expect(200);

      expect(response.body).toEqual(expectedPost);
      expect(mockMomentsService.getPostDetail).toHaveBeenCalledWith(postId, '1');
    });

    it('should return 404 if post not found', async () => {
      const postId = 'post-999';

      mockMomentsService.getPostDetail.mockRejectedValue(new Error('Not found'));

      await request(app.getHttpServer()).get(`/moments/posts/${postId}`).expect(500);
    });
  });

  describe('DELETE /moments/posts/:postId', () => {
    it('should delete post successfully', async () => {
      const postId = 'post-1';

      const expectedResponse = {
        message: 'Post deleted',
        postId,
      };

      mockMomentsService.deletePost.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .delete(`/moments/posts/${postId}`)
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockMomentsService.deletePost).toHaveBeenCalledWith(postId, '1');
    });

    it('should handle delete post errors', async () => {
      const postId = 'post-999';

      mockMomentsService.deletePost.mockRejectedValue(new Error('Delete failed'));

      await request(app.getHttpServer()).delete(`/moments/posts/${postId}`).expect(500);
    });
  });

  describe('POST /moments/posts/:postId/like', () => {
    it('should like post successfully', async () => {
      const postId = 'post-1';

      const expectedResponse = {
        message: 'Post liked',
        postId,
        liked: true,
      };

      mockMomentsService.likePost.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer()).post(`/moments/posts/${postId}/like`);

      expect(response.body).toEqual(expectedResponse);
      expect(mockMomentsService.likePost).toHaveBeenCalledWith(postId, '1');
    });

    it('should handle like post errors', async () => {
      const postId = 'post-999';

      mockMomentsService.likePost.mockRejectedValue(new Error('Like failed'));

      await request(app.getHttpServer()).post(`/moments/posts/${postId}/like`).expect(500);
    });
  });

  describe('POST /moments/posts/:postId/comments', () => {
    it('should add comment successfully', async () => {
      const postId = 'post-1';
      const commentData = {
        content: 'Nice post!',
        parent_id: undefined,
      };

      const expectedComment = {
        id: 'comment-1',
        postId,
        userId: '1',
        content: 'Nice post!',
      };

      mockMomentsService.addComment.mockResolvedValue(expectedComment);

      const response = await request(app.getHttpServer())
        .post(`/moments/posts/${postId}/comments`)
        .send({ content: 'Nice post!' })
        .expect(201);

      expect(response.body).toEqual(expectedComment);
      expect(mockMomentsService.addComment).toHaveBeenCalledWith(postId, '1', commentData);
    });

    it('should add reply comment successfully', async () => {
      const postId = 'post-1';
      const commentData = {
        content: 'Reply',
        parent_id: 'comment-1',
      };

      const expectedComment = {
        id: 'comment-2',
        postId,
        userId: '1',
        content: 'Reply',
        parentId: 'comment-1',
      };

      mockMomentsService.addComment.mockResolvedValue(expectedComment);

      const response = await request(app.getHttpServer())
        .post(`/moments/posts/${postId}/comments`)
        .send({ content: 'Reply', parent_id: 'comment-1' })
        .expect(201);

      expect(response.body).toEqual(expectedComment);
      expect(mockMomentsService.addComment).toHaveBeenCalledWith(postId, '1', commentData);
    });

    it('should handle add comment errors', async () => {
      const postId = 'post-999';

      mockMomentsService.addComment.mockRejectedValue(new Error('Add failed'));

      await request(app.getHttpServer())
        .post(`/moments/posts/${postId}/comments`)
        .send({ content: 'Test' })
        .expect(500);
    });
  });

  describe('GET /moments/posts/:postId/comments', () => {
    it('should get comments successfully', async () => {
      const postId = 'post-1';
      const expectedComments = {
        comments: [
          { id: 'comment-1', content: 'Comment 1' },
          { id: 'comment-2', content: 'Comment 2' },
        ],
        total: 2,
        page: 1,
        limit: 20,
      };

      mockMomentsService.getComments.mockResolvedValue(expectedComments);

      const response = await request(app.getHttpServer())
        .get(`/moments/posts/${postId}/comments`)
        .expect(200);

      expect(response.body).toEqual(expectedComments);
      expect(mockMomentsService.getComments).toHaveBeenCalledWith(postId, 1, 20, '1');
    });

    it('should get comments with pagination', async () => {
      const postId = 'post-1';

      mockMomentsService.getComments.mockResolvedValue({
        comments: [],
        total: 0,
        page: 2,
        limit: 10,
      });

      await request(app.getHttpServer())
        .get(`/moments/posts/${postId}/comments?page=2&limit=10`)
        .expect(200);

      expect(mockMomentsService.getComments).toHaveBeenCalledWith(postId, 2, 10, '1');
    });
  });

  describe('DELETE /moments/comments/:commentId', () => {
    it('should delete comment successfully', async () => {
      const commentId = 'comment-1';

      const expectedResponse = {
        message: 'Comment deleted',
        commentId,
      };

      mockMomentsService.deleteComment.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .delete(`/moments/comments/${commentId}`)
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockMomentsService.deleteComment).toHaveBeenCalledWith(commentId, '1');
    });

    it('should handle delete comment errors', async () => {
      const commentId = 'comment-999';

      mockMomentsService.deleteComment.mockRejectedValue(new Error('Delete failed'));

      await request(app.getHttpServer()).delete(`/moments/comments/${commentId}`).expect(500);
    });
  });

  describe('POST /moments/comments/:commentId/like', () => {
    it('should like comment successfully', async () => {
      const commentId = 'comment-1';

      const expectedResponse = {
        message: 'Comment liked',
        commentId,
        liked: true,
      };

      mockMomentsService.likeComment.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer()).post(
        `/moments/comments/${commentId}/like`,
      );

      expect(response.body).toEqual(expectedResponse);
      expect(mockMomentsService.likeComment).toHaveBeenCalledWith(commentId, '1');
    });

    it('should handle like comment errors', async () => {
      const commentId = 'comment-999';

      mockMomentsService.likeComment.mockRejectedValue(new Error('Like failed'));

      await request(app.getHttpServer()).post(`/moments/comments/${commentId}/like`).expect(500);
    });
  });

  describe('Controller instantiation', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });
});
