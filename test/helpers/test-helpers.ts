/**
 * 测试辅助工具函数
 */

import { MockProxy, mock } from 'jest-mock-extended';

/**
 * 创建模拟的数据库服务
 */
export const createMockDatabaseService = () => {
  const mockDb = {
    query: jest.fn(),
  };

  return mockDb;
};

/**
 * 创建模拟的Redis服务
 */
export const createMockRedisService = () => ({
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(1),
  expire: jest.fn().mockResolvedValue(true),
  rPush: jest.fn().mockResolvedValue(1),
  lPush: jest.fn().mockResolvedValue(1),
  lRange: jest.fn().mockResolvedValue([]),
  lLen: jest.fn().mockResolvedValue(0),
});

/**
 * 创建模拟的ChatGateway
 */
export const createMockChatGateway = () => ({
  server: {
    to: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    in: jest.fn().mockReturnThis(),
  },
});

/**
 * 创建模拟的JwtService
 */
export const createMockJwtService = () => ({
  signAsync: jest.fn(),
  verifyAsync: jest.fn(),
  sign: jest.fn(),
  verify: jest.fn(),
});

/**
 * 创建模拟的ConfigService
 */
export const createMockConfigService = () => ({
  get: jest.fn((key: string) => {
    const config: Record<string, any> = {
      'database.host': 'localhost',
      'database.port': 5432,
      'database.username': 'test',
      'database.password': 'test',
      'database.database': 'test_db',
      'redis.host': 'localhost',
      'redis.port': 6379,
      'jwt.secret': 'test-secret',
      'jwt.accessTokenTtl': 3600,
      'jwt.refreshTokenTtl': 86400,
    };
    return config[key];
  }),
});

/**
 * 创建模拟的Logger
 */
export const createMockLogger = () => ({
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
  verbose: jest.fn(),
});

/**
 * 创建测试用户
 */
export const createTestUser = (overrides: any = {}) => ({
  id: 'user-' + Math.random().toString(36).substring(7),
  username: 'testuser',
  email: 'test@example.com',
  nickname: 'Test User',
  password: 'hashedPassword',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * 创建测试消息
 */
export const createTestMessage = (overrides: any = {}) => ({
  id: 'msg-' + Math.random().toString(36).substring(7),
  conversationId: 'conv-1',
  senderId: 'user-1',
  type: 0, // TEXT
  content: 'Hello',
  mediaUrls: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * 创建测试会话
 */
export const createTestConversation = (overrides: any = {}) => ({
  id: 'conv-' + Math.random().toString(36).substring(7),
  type: 0, // 单聊
  name: null,
  avatar: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * 创建测试帖子（朋友圈动态）
 */
export const createTestPost = (overrides: any = {}) => ({
  id: 'post-' + Math.random().toString(36).substring(7),
  userId: 'user-1',
  content: 'This is a test post',
  mediaUrls: [],
  visibility: 0, // 公开
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * 创建测试通知
 */
export const createTestNotification = (overrides: any = {}) => ({
  id: 'notif-' + Math.random().toString(36).substring(7),
  userId: 'user-1',
  type: 1, // FRIEND_REQUEST
  title: 'Friend Request',
  content: 'You have a new friend request',
  data: {},
  isRead: false,
  createdAt: new Date(),
  ...overrides,
});

/**
 * 创建测试文件
 */
export const createTestFile = (overrides: any = {}) => ({
  id: 'file-' + Math.random().toString(36).substring(7),
  originalName: 'test.jpg',
  filename: 'test-file.jpg',
  mimeType: 'image/jpeg',
  size: 1024,
  url: 'http://example.com/files/test-file.jpg',
  uploaderId: 'user-1',
  createdAt: new Date(),
  ...overrides,
});

/**
 * 等待指定毫秒数（用于异步测试）
 */
export const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * 生成随机字符串
 */
export const randomString = (length: number = 10) =>
  Math.random()
    .toString(36)
    .substring(2, 2 + length);

/**
 * 生成UUID（简化版）
 */
export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

/**
 * Mock数据库查询结果
 */
export const mockQueryResult = (rows: any[] = []) => ({
  rows,
  rowCount: rows.length,
});

/**
 * Mock数据库错误
 */
export const mockDatabaseError = (message: string = 'Database error') => ({
  message,
  code: 'DB_ERROR',
});
