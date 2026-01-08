/**
 * Mock Factory - 创建各种Mock对象的工厂函数
 */

import { MockProxy, mock } from 'jest-mock-extended';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Logger } from '@nestjs/common';

/**
 * 创建Mock的ExecutionContext (用于测试Guards)
 */
export const createMockExecutionContext = (userId?: string) => ({
  switchToHttp: jest.fn().mockReturnValue({
    getRequest: jest.fn().mockReturnValue({
      user: userId ? { id: userId } : undefined,
      headers: {},
      body: {},
      query: {},
      params: {},
    }),
    getResponse: jest.fn(),
  }),
  getClass: jest.fn(),
  getHandler: jest.fn(),
  getArgByIndex: jest.fn(),
  getArgs: jest.fn(),
  getType: jest.fn(),
});

/**
 * 创建Mock的Socket对象
 */
export const createMockSocket = (socketId?: string) => ({
  id: socketId || 'socket-1',
  data: {},
  emit: jest.fn(),
  join: jest.fn(),
  leave: jest.fn(),
  to: jest.fn().mockReturnThis(),
  disconnect: jest.fn(),
  rooms: new Set(),
});

/**
 * 创建Mock的MinIO客户端
 */
export const createMockMinioClient = () => ({
  putObject: jest.fn().mockResolvedValue({ etag: 'mock-etag' }),
  getObject: jest.fn().mockResolvedValue({
    on: jest.fn(),
    pipe: jest.fn(),
  }),
  removeObject: jest.fn().mockResolvedValue(undefined),
  presignedUrl: jest.fn().mockResolvedValue('http://example.com/presigned-url'),
  bucketExists: jest.fn().mockResolvedValue(true),
  makeBucket: jest.fn().mockResolvedValue(undefined),
  listBuckets: jest.fn().mockResolvedValue([{ name: 'test-bucket' }]),
});

/**
 * 创建Mock的NestJS应用模块
 */
export const createMockModule = () => ({
  get: jest.fn(),
  resolve: jest.fn(),
  create: jest.fn(),
});

/**
 * 创建Mock的装饰器元数据
 */
export const createMockReflector = () => ({
  get: jest.fn(),
  getAll: jest.fn(),
  getAllAndOverride: jest.fn(),
  getAllAndMerge: jest.fn(),
});

/**
 * 创建Mock的WebSocket服务器
 */
export const createMockWebSocketServer = () => ({
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  of: jest.fn().mockReturnThis(),
  compress: jest.fn().mockReturnThis(),
  binary: jest.fn().mockReturnThis(),
  volatile: jest.fn().mockReturnThis(),
  local: jest.fn().mockReturnThis(),
});

/**
 * 创建Mock的Multer文件上传对象
 */
export const createMockFile = (overrides: any = {}) => ({
  fieldname: 'file',
  originalname: 'test.jpg',
  encoding: '7bit',
  mimetype: 'image/jpeg',
  buffer: Buffer.from('test'),
  size: 1024,
  destination: '/uploads',
  filename: 'test-file.jpg',
  path: '/uploads/test-file.jpg',
  ...overrides,
});

/**
 * 创建Mock的Supertest请求对象
 */
export const createMockRequest = (overrides: any = {}) => ({
  headers: {},
  body: {},
  query: {},
  params: {},
  user: null,
  ...overrides,
});

/**
 * 创建Mock的Supertest响应对象
 */
export const createMockResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
  send: jest.fn().mockReturnThis(),
  set: jest.fn().mockReturnThis(),
});

/**
 * 创建Mock的PostgreSQL Pool
 */
export const createMockPool = () => ({
  query: jest.fn(),
  connect: jest.fn(),
  end: jest.fn(),
  on: jest.fn(),
});

/**
 * 创建Mock的PostgreSQL Client
 */
export const createMockClient = () => ({
  query: jest.fn(),
  release: jest.fn(),
  on: jest.fn(),
});

/**
 * 创建Mock的Redis客户端
 */
export const createMockRedisClient = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue('OK'),
  del: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(1),
  ttl: jest.fn().mockResolvedValue(3600),
  rpush: jest.fn().mockResolvedValue(1),
  lrange: jest.fn().mockResolvedValue([]),
  lpop: jest.fn().mockResolvedValue(null),
  mset: jest.fn().mockResolvedValue('OK'),
  mget: jest.fn().mockResolvedValue([]),
  flushdb: jest.fn().mockResolvedValue('OK'),
  connect: jest.fn(),
  disconnect: jest.fn(),
  on: jest.fn(),
});

/**
 * 创建Mock的Winston Logger
 */
export const createMockWinstonLogger = () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
  log: jest.fn(),
});

/**
 * 创建Mock的Sharp实例
 */
export const createMockSharp = () => {
  const mockSharp = jest.fn();
  mockSharp.prototype.resize = jest.fn().mockReturnThis();
  mockSharp.prototype.jpeg = jest.fn().mockReturnThis();
  mockSharp.prototype.toBuffer = jest.fn().mockResolvedValue(Buffer.from('test'));
  mockSharp.prototype.metadata = jest.fn().mockResolvedValue({
    width: 800,
    height: 600,
    format: 'jpeg',
  });
  return mockSharp as any;
};

/**
 * 创建Mock的Stream对象
 */
export const createMockStream = () => ({
  pipe: jest.fn().mockReturnThis(),
  on: jest.fn().mockReturnThis(),
  emit: jest.fn(),
  write: jest.fn(),
  end: jest.fn(),
});

/**
 * 创建Mock的WebSocket客户端
 */
export const createMockSocketClient = () => ({
  connect: jest.fn(),
  disconnect: jest.fn(),
  emit: jest.fn(),
  on: jest.fn(),
  connected: false,
  id: 'client-socket-1',
});

/**
 * 创建Mock的Session对象
 */
export const createMockSession = (overrides: any = {}) => ({
  id: 'session-1',
  userId: 'user-1',
  refreshToken: 'refresh-token',
  accessToken: 'access-token',
  expiresAt: new Date(Date.now() + 3600000),
  createdAt: new Date(),
  ...overrides,
});

/**
 * 创建Mock的CallRecord对象
 */
export const createMockCallRecord = (overrides: any = {}) => ({
  id: 'call-1',
  callerId: 'user-1',
  calleeId: 'user-2',
  type: 0, // AUDIO
  status: 0, // CALLING
  duration: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * 创建Mock的FriendRequest对象
 */
export const createMockFriendRequest = (overrides: any = {}) => ({
  id: 'request-1',
  requesterId: 'user-1',
  recipientId: 'user-2',
  status: 0, // PENDING
  message: 'Please add me as friend',
  createdAt: new Date(),
  ...overrides,
});

/**
 * 创建Mock的Friendship对象
 */
export const createMockFriendship = (overrides: any = {}) => ({
  id: 'friendship-1',
  userId: 'user-1',
  friendId: 'user-2',
  status: 0, // ACCEPTED
  createdAt: new Date(),
  ...overrides,
});

/**
 * 创建Mock的ConversationMember对象
 */
export const createMockConversationMember = (overrides: any = {}) => ({
  id: 'member-1',
  conversationId: 'conv-1',
  userId: 'user-1',
  role: 0, // MEMBER
  lastReadAt: new Date(),
  joinedAt: new Date(),
  ...overrides,
});

/**
 * 创建Mock的MessageReceipt对象
 */
export const createMockMessageReceipt = (overrides: any = {}) => ({
  id: 'receipt-1',
  messageId: 'msg-1',
  userId: 'user-1',
  deliveredAt: new Date(),
  readAt: null,
  ...overrides,
});

/**
 * 创建Mock的PostLike对象
 */
export const createMockPostLike = (overrides: any = {}) => ({
  id: 'like-1',
  postId: 'post-1',
  userId: 'user-1',
  createdAt: new Date(),
  ...overrides,
});

/**
 * 创建Mock的Comment对象
 */
export const createMockComment = (overrides: any = {}) => ({
  id: 'comment-1',
  postId: 'post-1',
  userId: 'user-1',
  parentId: null,
  content: 'This is a comment',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * 创建Mock的CommentLike对象
 */
export const createMockCommentLike = (overrides: any = {}) => ({
  id: 'comment-like-1',
  commentId: 'comment-1',
  userId: 'user-1',
  createdAt: new Date(),
  ...overrides,
});

/**
 * 创建Mock的UserSettings对象
 */
export const createMockUserSettings = (overrides: any = {}) => ({
  id: 'settings-1',
  userId: 'user-1',
  privacyProfileVisible: true,
  privacyShowOnlineStatus: true,
  notificationNewMessage: true,
  notificationFriendRequest: true,
  notificationPostLike: true,
  notificationComment: true,
  language: 'en',
  theme: 'light',
  ...overrides,
});

/**
 * 创建Mock的BlockedUser对象
 */
export const createMockBlockedUser = (overrides: any = {}) => ({
  id: 'block-1',
  userId: 'user-1',
  blockedUserId: 'user-2',
  reason: 'Spam',
  createdAt: new Date(),
  ...overrides,
});
