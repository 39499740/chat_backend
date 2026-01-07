# 微信社交应用后端系统 - 详细设计文档 (DD)

## 文档信息

| 项目         | 内容                                    |
| ------------ | --------------------------------------- |
| **文档名称** | 详细设计文档 (Detailed Design Document) |
| **版本**     | v1.0                                    |
| **日期**     | 2026-01-08                              |
| **项目名称** | 微信社交应用后端系统                    |
| **文档状态** | 正式发布                                |
| **作者**     | Sisyphus AI                             |

## 目录

1. [引言](#引言)
2. [系统架构](#系统架构)
3. [模块设计](#模块设计)
4. [数据库设计](#数据库设计)
5. [API接口设计](#api接口设计)
6. [安全设计](#安全设计)
7. [性能设计](#性能设计)
8. [部署架构](#部署架构)

---

## 1. 引言

### 1.1 文档目的

本文档详细描述微信社交应用后端系统的技术设计，包括系统架构、模块设计、数据库设计、API接口设计、安全设计、性能设计和部署架构。本文档面向开发人员、测试人员和运维人员，用于指导系统的实现、测试和部署。

### 1.2 文档范围

本文档涵盖以下内容：

- 系统总体架构设计
- 各功能模块的详细设计
- 数据库表结构和关系设计
- RESTful API接口设计
- WebSocket接口设计
- 系统安全设计
- 系统性能设计
- 系统部署架构

### 1.3 术语定义

| 术语          | 定义                                                   |
| ------------- | ------------------------------------------------------ |
| **SRS**       | 需求规格说明书 (Software Requirements Specification)   |
| **SAD**       | 系统架构设计文档 (System Architecture Design Document) |
| **DD**        | 详细设计文档 (Detailed Design Document)                |
| **API**       | 应用程序接口 (Application Programming Interface)       |
| **JWT**       | JSON Web Token                                         |
| **WebRTC**    | Web Real-Time Communication                            |
| **WebSocket** | 一种全双工通信协议                                     |
| **MinIO**     | S3兼容的对象存储服务                                   |

---

## 2. 系统架构

### 2.1 总体架构

系统采用分层架构，包含以下层次：

```
┌─────────────────────────────────────────────┐
│           客户端层 (Client Layer)          │
│  ┌──────────┐  ┌──────────┐  ┌───────┐ │
│  │  iOS App │  │ Android │  │Web App │ │
│  └──────────┘  └──────────┘  └───────┘ │
└─────────────────────────────────────────────┘
                    │ HTTP/HTTPS
                    │ WebSocket
┌─────────────────────────────────────────────┐
│           网关层 (Gateway Layer)          │
│         ┌─────────────────────────┐        │
│         │   NestJS Application  │        │
│         │   - CORS Middleware │        │
│         │   - Validation Pipe │        │
│         │   - Logger          │        │
│         └─────────────────────────┘        │
└─────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│           控制器层 (Controller Layer)    │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ Auth    │ │ Users   │ │ Friends  │  │
│  └─────────┘ └─────────┘ └─────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ Moments │ │ Chat     │ │ Search   │  │
│  └─────────┘ └─────────┘ └─────────┘  │
└─────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│           服务层 (Service Layer)         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ Auth    │ │ Users   │ │ Friends  │  │
│  │ Service │ │ Service │ │ Service  │  │
│  └─────────┘ └─────────┘ └─────────┘  │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ Moments │ │ Chat     │ │ Search   │  │
│  │ Service │ │ Service  │ │ Service  │  │
│  └─────────┘ └─────────┘ └─────────┘  │
└─────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│         数据访问层 (DAL Layer)          │
│              ┌─────────────┐            │
│              │ Database    │            │
│              │ Service    │            │
│              └─────────────┘            │
│              ┌─────────────┐            │
│              │ Redis       │            │
│              │ Service    │            │
│              └─────────────┘            │
└─────────────────────────────────────────────┘
                    │
┌─────────────────────────────────────────────┐
│           数据存储层 (Storage Layer)      │
│  ┌──────────┐  ┌──────────┐           │
│  │PostgreSQL │  │  Redis    │           │
│  │ Database  │  │  Cache    │           │
│  └──────────┘  └──────────┘           │
│  ┌────────────────────────────┐          │
│  │      MinIO (S3)          │          │
│  │   Object Storage          │          │
│  └────────────────────────────┘          │
└─────────────────────────────────────────────┘
```

### 2.2 技术栈

| 组件           | 技术选型   | 版本    | 说明                     |
| -------------- | ---------- | ------- | ------------------------ |
| **后端框架**   | NestJS     | 10.4.20 | 企业级Node.js框架        |
| **编程语言**   | TypeScript | 5.3.3   | 类型安全的JavaScript超集 |
| **数据库**     | PostgreSQL | 16      | 关系型数据库             |
| **缓存**       | Redis      | 7       | 内存数据库               |
| **对象存储**   | MinIO      | 最新    | S3兼容对象存储           |
| **实时通信**   | Socket.IO  | 4.8.3   | WebSocket库              |
| **认证**       | JWT        | -       | JSON Web Token           |
| **加密**       | bcrypt     | 5.1.1   | 密码哈希                 |
| **API文档**    | Swagger    | 7.4.2   | API自动生成              |
| **容器化**     | Docker     | 最新    | 容器化部署               |
| **HTTP客户端** | Axios      | -       | 外部API调用              |

### 2.3 系统部署架构

```
                    ┌─────────────┐
                    │   Docker    │
                    │  Compose   │
                    └─────┬───────┘
                          │
        ┌─────────────────┼─────────────────┐
        │                 │                 │
   ┌────┴────┐     ┌─────┴─────┐     ┌────┴────┐
   │PostgreSQL │     │   Redis    │     │  MinIO   │
   │  :5432   │     │  :6379    │     │ :9000    │
   └──────────┘     └────────────┘     └──────────┘
        │                 │                 │
        └─────────────────┼─────────────────┘
                          │
                   ┌─────┴───────┐
                   │   NestJS    │
                   │ Application │
                   │  :3000     │
                   └─────┬───────┘
                         │
                   ┌─────┴───────┐
                   │   Clients   │
                   └────────────┘
```

---

## 3. 模块设计

### 3.1 模块列表

系统包含以下核心模块：

1. **AuthModule** - 认证模块
2. **UsersModule** - 用户管理模块
3. **UploadsModule** - 文件上传模块
4. **FriendsModule** - 好友管理模块
5. **MomentsModule** - 朋友圈模块
6. **WebSocketModule** - WebSocket通信模块
7. **ConversationsModule** - 会话管理模块
8. **ChatModule** - 聊天模块
9. **NotificationsModule** - 通知模块
10. **SearchModule** - 搜索模块

### 3.2 模块依赖关系

```
                    ┌─────────────────┐
                    │   AppModule    │
                    └───────┬───────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
   ┌────┴────┐        ┌─────┴─────┐      ┌────┴────┐
   │  Auth   │        │   Users    │      │  Uploads │
   └─────────┘        └────────────┘      └──────────┘
        │                   │                   │
   ┌────┴────┐        ┌─────┴─────┐      ┌────┴────┐
   │ Friends  │        │  Moments   │      │WebSocket │
   └─────────┘        └────────────┘      └──────────┘
        │                   │                   │
   ┌────┴────┐        ┌─────┴─────┐      ┌────┴────┐
   │Convers  │        │    Chat    │      │   Search  │
   │ ations  │        │            │      └──────────┘
   └────┬────┘        └─────┬───────┘
        │                   │
        └─────────┬──────────┘
                  │
           ┌─────┴─────┐
           │Notiications│
           └────────────┘

公共依赖：
- DatabaseModule (全局)
- RedisModule (全局)
- ChatModule (供Notifications使用)
- WebSocketModule (供Chat使用)
```

### 3.3 AuthModule 设计

#### 3.3.1 模块职责

- 用户注册
- 用户登录
- Token刷新
- 用户登出

#### 3.3.2 类设计

```typescript
/**
 * 认证服务
 * 负责用户认证相关的业务逻辑
 */
export class AuthService {
  // 注册新用户
  async register(registerData: RegisterDto): Promise<AuthResponse>;

  // 用户登录
  async login(loginData: LoginDto): Promise<AuthResponse>;

  // 刷新Token
  async refreshTokens(refreshToken: string): Promise<TokenResponse>;

  // 用户登出
  async logout(userId: string): Promise<void>;
}

/**
 * JWT策略
 * 用于JWT认证
 */
export class JwtStrategy extends PassportStrategy {
  // 验证Token
  async validate(payload: JwtPayload): Promise<User>;
}

/**
 * 认证守卫
 * 用于保护需要认证的路由
 */
export class JwtAuthGuard extends AuthGuard('jwt') {
  // 验证请求
  canActivate(context: ExecutionContext): boolean;
}

/**
 * 访问令牌策略
 * 用于访问令牌验证
 */
export class JwtAccessTokenStrategy extends PassportStrategy {
  // 验证访问令牌
  async validate(payload: JwtPayload): Promise<User>;
}

/**
 * 刷新令牌策略
 * 用于刷新令牌验证
 */
export class JwtRefreshTokenStrategy extends PassportStrategy {
  // 验证刷新令牌
  async validate(payload: JwtPayload): Promise<User>;
}
```

#### 3.3.3 DTO设计

```typescript
/**
 * 注册DTO
 */
export class RegisterDto {
  @IsString()
  @Length(3, 20)
  username: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  @MaxLength(50)
  @IsOptional()
  nickname?: string;
}

/**
 * 登录DTO
 */
export class LoginDto {
  @IsString()
  account: string; // 用户名或邮箱

  @IsString()
  password: string;
}

/**
 * 刷新Token DTO
 */
export class RefreshTokenDto {
  @IsString()
  refreshToken: string;
}

/**
 * 认证响应
 */
export class AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    nickname: string;
    avatar_url?: string;
  };
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

/**
 * Token响应
 */
export class TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}
```

#### 3.3.4 API接口

| 方法 | 路径               | 描述      | 认证 |
| ---- | ------------------ | --------- | ---- |
| POST | /api/auth/register | 用户注册  | 否   |
| POST | /api/auth/login    | 用户登录  | 否   |
| POST | /api/auth/refresh  | 刷新Token | 否   |
| POST | /api/auth/logout   | 用户登出  | 是   |

### 3.4 UsersModule 设计

#### 3.4.1 模块职责

- 获取用户信息
- 更新用户资料
- 修改密码
- 上传头像
- 搜索用户

#### 3.4.2 类设计

```typescript
/**
 * 用户服务
 * 负责用户相关的业务逻辑
 */
export class UsersService {
  // 获取用户信息
  async getUserInfo(userId: string): Promise<User>;

  // 更新用户资料
  async updateUser(userId: string, updateData: UpdateUserDto): Promise<User>;

  // 修改密码
  async changePassword(userId: string, changePasswordDto: ChangePasswordDto): Promise<void>;

  // 上传头像
  async uploadAvatar(userId: string, file: Express.Multer.File): Promise<string>;

  // 获取用户设置
  async getUserSettings(userId: string): Promise<UserSettings>;

  // 更新用户设置
  async updateUserSettings(userId: string, settings: UpdateSettingsDto): Promise<void>;

  // 搜索用户
  async searchUsers(query: string, page: number, limit: number): Promise<SearchResult>;
}

/**
 * 当前用户装饰器
 * 用于从请求中提取当前用户信息
 */
export const CurrentUser = createParamDecorator((data: unknown, ctx: ExecutionContext): User => {
  const request = ctx.switchToHttp().getRequest();
  return request.user;
});
```

#### 3.4.3 DTO设计

```typescript
/**
 * 更新用户DTO
 */
export class UpdateUserDto {
  @IsString()
  @MaxLength(50)
  @IsOptional()
  nickname?: string;

  @IsString()
  @MaxLength(200)
  @IsOptional()
  bio?: string;

  @IsEnum(['male', 'female', 'other'])
  @IsOptional()
  gender?: string;

  @IsDateString()
  @IsOptional()
  birthday?: Date;

  @IsString()
  @MaxLength(20)
  @IsOptional()
  location?: string;
}

/**
 * 修改密码DTO
 */
export class ChangePasswordDto {
  @IsString()
  oldPassword: string;

  @IsString()
  @MinLength(8)
  newPassword: string;

  @IsString()
  @MinLength(8)
  confirmPassword: string;
}

/**
 * 更新设置DTO
 */
export class UpdateSettingsDto {
  @IsBoolean()
  @IsOptional()
  allowFriendRequests?: boolean;

  @IsBoolean()
  @IsOptional()
  showOnlineStatus?: boolean;

  @IsBoolean()
  @IsOptional()
  allowStrangersFind?: boolean;
}
```

#### 3.4.4 API接口

| 方法 | 路径                       | 描述             | 认证 |
| ---- | -------------------------- | ---------------- | ---- |
| GET  | /api/users/profile         | 获取用户资料     | 是   |
| PUT  | /api/users/profile         | 更新用户资料     | 是   |
| POST | /api/users/change-password | 修改密码         | 是   |
| POST | /api/users/avatar          | 上传头像         | 是   |
| GET  | /api/users/settings        | 获取用户设置     | 是   |
| PUT  | /api/users/settings        | 更新用户设置     | 是   |
| GET  | /api/users/:id             | 获取指定用户信息 | 是   |

### 3.5 ChatModule 设计

#### 3.5.1 模块职责

- 发送消息
- 获取消息列表
- 删除消息
- 标记消息为已读
- 获取消息的媒体信息

#### 3.5.2 类设计

```typescript
/**
 * 消息服务
 * 负责消息相关的业务逻辑
 */
export class MessagesService {
  // 发送消息
  async sendMessage(
    senderId: string,
    conversationId: string,
    messageData: SendMessageDto,
    broadcast = false,
  ): Promise<Message>;

  // 获取消息列表
  async getMessages(
    conversationId: string,
    userId: string,
    query: GetMessagesDto,
  ): Promise<MessagesResponse>;

  // 获取消息详情
  async getMessage(messageId: string, userId: string): Promise<Message>;

  // 删除消息
  async deleteMessage(messageId: string, userId: string): Promise<void>;

  // 标记为已读
  async markAsRead(messageId: string, userId: string): Promise<void>;

  // 获取未读数量
  async getUnreadCount(conversationId: string, userId: string): Promise<number>;

  // 获取会话历史
  async getConversationHistory(
    conversationId: string,
    userId: string,
    lastMessageId?: string,
    limit = 50,
  ): Promise<Message[]>;

  // 获取消息的媒体信息
  async getMessageMediaInfo(messageId: string, userId: string): Promise<MediaInfo[]>;
}

/**
 * 群聊通知服务
 * 负责群聊相关的实时通知
 */
export class GroupChatNotificationService {
  // 通知成员已添加
  async notifyMemberAdded(conversationId: string, addedUserId: string, addedBy: string);

  // 通知成员已移除
  async notifyMemberRemoved(conversationId: string, removedUserId: string, removedBy: string);

  // 通知群聊信息已更新
  async notifyGroupUpdated(conversationId: string, updatedBy: string, updates: any);

  // 通知成员已离开
  async notifyMemberLeft(conversationId: string, leftUserId: string);

  // 批量通知成员变更
  async notifyMembersChanged(conversationId: string, changes: any);
}

/**
 * 媒体消息服务
 * 负责媒体消息的处理和验证
 */
export class MediaMessageService {
  // 验证媒体消息类型
  validateMediaType(type: number, mediaType?: string): boolean;

  // 验证媒体URL
  async validateMediaUrls(urls: string[]): Promise<boolean>;

  // 验证消息内容
  validateMessageContent(type: number, content?: string, mediaUrls?: string[]): void;

  // 处理图片消息
  async processImageMessage(messageId: string, mediaUrls: string[]): Promise<void>;

  // 处理视频消息
  async processVideoMessage(messageId: string, mediaUrls: string[]): Promise<void>;

  // 处理音频消息
  async processAudioMessage(messageId: string, mediaUrls: string[]): Promise<void>;

  // 处理表情消息
  async processEmojiMessage(messageId: string, content: string): Promise<void>;

  // 处理文件消息
  async processFileMessage(messageId: string, mediaUrls: string[]): Promise<void>;

  // 获取消息的媒体信息
  async getMessageMediaInfo(messageId: string): Promise<MediaInfo[]>;
}

/**
 * 离线消息服务
 * 负责离线消息的存储和推送
 */
export class OfflineMessageService {
  // 存储离线消息
  async storeOfflineMessage(userId: string, message: any): Promise<void>;

  // 获取离线消息
  async getOfflineMessages(userId: string): Promise<any[]>;

  // 清除离线消息
  async clearOfflineMessages(userId: string): Promise<number>;

  // 发送离线消息
  async sendOfflineMessages(userId: string): Promise<void>;

  // 获取离线消息统计
  async getOfflineMessageStats(userId: string): Promise<OfflineMessageStats>;

  // 标记离线消息为已读
  async markOfflineMessagesAsRead(userId: string, conversationId: string): Promise<void>;

  // 获取未读数量
  async getUnreadCount(userId: string): Promise<number>;
}
```

#### 3.5.3 消息类型

```typescript
export enum MessageType {
  TEXT = 0, // 文本消息
  IMAGE = 1, // 图片消息
  AUDIO = 2, // 音频消息
  VIDEO = 3, // 视频消息
  EMOJI = 4, // 表情消息
  FILE = 5, // 文件消息
}
```

#### 3.5.4 API接口

| 方法   | 路径                         | 描述         | 认证 |
| ------ | ---------------------------- | ------------ | ---- |
| POST   | /api/chat                    | 发送消息     | 是   |
| GET    | /api/chat/conversations/:id  | 获取消息列表 | 是   |
| GET    | /api/chat/messages/:id       | 获取消息详情 | 是   |
| GET    | /api/chat/messages/:id/media | 获取媒体信息 | 是   |
| DELETE | /api/chat/messages/:id       | 删除消息     | 是   |
| POST   | /api/chat/messages/:id/read  | 标记为已读   | 是   |

### 3.6 NotificationsModule 设计

#### 3.6.1 模块职责

- 创建通知
- 获取通知列表
- 标记通知为已读
- 删除通知
- 获取未读数量

#### 3.6.2 类设计

```typescript
/**
 * 通知服务
 * 负责通知相关的业务逻辑
 */
export class NotificationService {
  // 创建通知
  async createNotification(payload: NotificationPayload): Promise<void>;

  // 批量创建通知
  async createBulkNotifications(userIds: string[], payload: any): Promise<void>;

  // 获取用户通知列表
  async getUserNotifications(
    userId: string,
    options: GetNotificationsDto,
  ): Promise<NotificationsResponse>;

  // 获取通知详情
  async getNotification(notificationId: string, userId: string): Promise<Notification>;

  // 标记为已读
  async markAsRead(notificationId: string, userId: string): Promise<void>;

  // 标记所有为已读
  async markAllAsRead(userId: string): Promise<number>;

  // 删除通知
  async deleteNotification(notificationId: string, userId: string): Promise<void>;

  // 获取未读数量
  async getUnreadCount(userId: string): Promise<number>;

  // 好友请求通知
  async notifyFriendRequest(userId: string, requesterId: string, requesterName: string);

  // 好友接受通知
  async notifyFriendAccepted(userId: string, friendId: string, friendName: string);

  // 帖子被点赞通知
  async notifyPostLiked(userId: string, postId: string, likerName: string);

  // 帖子评论通知
  async notifyPostCommented(
    userId: string,
    postId: string,
    commenterName: string,
    commentContent: string,
  );

  // 评论被点赞通知
  async notifyCommentLiked(userId: string, commentId: string, postId: string, likerName: string);

  // 新消息通知
  async notifyNewMessage(
    userId: string,
    conversationId: string,
    senderName: string,
    messagePreview: string,
  );

  // 通话请求通知
  async notifyCallRequest(
    userId: string,
    callerId: string,
    callerName: string,
    callType: 'audio' | 'video',
  );

  // 未接来电通知
  async notifyMissedCall(
    userId: string,
    callerId: string,
    callerName: string,
    callType: 'audio' | 'video',
  );

  // 系统通知
  async notifySystem(userId: string, title: string, content: string, data?: any);
}
```

#### 3.6.3 通知类型

```typescript
export enum NotificationType {
  FRIEND_REQUEST = 'friend_request', // 好友请求
  FRIEND_ACCEPTED = 'friend_accepted', // 好友接受
  FRIEND_DECLINED = 'friend_declined', // 好友拒绝
  POST_LIKE = 'post_like', // 帖子点赞
  POST_COMMENT = 'post_comment', // 帖子评论
  COMMENT_LIKE = 'comment_like', // 评论点赞
  MENTION = 'mention', // @提及
  MESSAGE = 'message', // 新消息
  CALL_REQUEST = 'call_request', // 通话请求
  CALL_MISSED = 'call_missed', // 未接来电
  SYSTEM = 'system', // 系统通知
}
```

#### 3.6.4 API接口

| 方法   | 路径                            | 描述           | 认证 |
| ------ | ------------------------------- | -------------- | ---- |
| POST   | /api/notifications              | 创建通知       | 是   |
| GET    | /api/notifications              | 获取通知列表   | 是   |
| GET    | /api/notifications/unread/count | 获取未读数量   | 是   |
| GET    | /api/notifications/:id          | 获取通知详情   | 是   |
| PUT    | /api/notifications/:id/read     | 标记为已读     | 是   |
| PUT    | /api/notifications/read/all     | 标记所有为已读 | 是   |
| DELETE | /api/notifications/:id          | 删除通知       | 是   |

### 3.7 SearchModule 设计

#### 3.7.1 模块职责

- 搜索用户
- 搜索帖子
- 搜索消息
- 搜索会话
- 获取搜索建议

#### 3.7.2 类设计

```typescript
/**
 * 搜索服务
 * 负责搜索相关的业务逻辑
 */
export class SearchService {
  // 通用搜索
  async search(
    userId: string,
    query: string,
    type: SearchType = SearchType.ALL,
    options?: SearchOptions,
  ): Promise<SearchResults>;

  // 搜索用户
  async searchUsers(userId: string, query: string, options?: SearchOptions): Promise<SearchResult>;

  // 搜索帖子
  async searchPosts(userId: string, query: string, options?: SearchOptions): Promise<SearchResult>;

  // 搜索消息
  async searchMessages(
    userId: string,
    query: string,
    options?: SearchOptions,
  ): Promise<SearchResult>;

  // 搜索会话
  async searchConversations(
    userId: string,
    query: string,
    options?: SearchOptions,
  ): Promise<SearchResult>;

  // 获取搜索建议
  async getSearchSuggestions(userId: string, query: string, limit = 10): Promise<SearchSuggestions>;
}
```

#### 3.7.3 搜索类型

```typescript
export enum SearchType {
  ALL = 'all', // 全部
  USERS = 'users', // 用户
  POSTS = 'posts', // 帖子
  MESSAGES = 'messages', // 消息
  CONVERSATIONS = 'conversations', // 会话
}
```

#### 3.7.4 API接口

| 方法 | 路径                      | 描述         | 认证 |
| ---- | ------------------------- | ------------ | ---- |
| GET  | /api/search               | 通用搜索     | 是   |
| GET  | /api/search/users         | 搜索用户     | 是   |
| GET  | /api/search/posts         | 搜索帖子     | 是   |
| GET  | /api/search/messages      | 搜索消息     | 是   |
| GET  | /api/search/conversations | 搜索会话     | 是   |
| GET  | /api/search/suggestions   | 获取搜索建议 | 是   |

---

## 4. 数据库设计

### 4.1 表结构

系统包含14个核心数据表：

1. **users** - 用户表
2. **user_sessions** - 用户会话表
3. **user_settings** - 用户设置表
4. **friendships** - 好友关系表
5. **friend_requests** - 好友请求表
6. **blocked_users** - 黑名单表
7. **conversations** - 会话表
8. **conversation_members** - 会话成员表
9. **messages** - 消息表
10. **message_receipts** - 消息回执表
11. **posts** - 帖子表
12. **post_likes** - 帖子点赞表
13. **comments** - 评论表
14. **comment_likes** - 评论点赞表
15. **notifications** - 通知表
16. **media_files** - 媒体文件表
17. **call_records** - 通话记录表

### 4.2 ER图关系

```
users (1) -------- (N) user_sessions
users (1) -------- (N) user_settings
users (1) -------- (N) friendships
users (1) -------- (N) friend_requests
users (1) -------- (N) blocked_users
users (1) -------- (N) conversation_members
users (1) -------- (N) messages (as sender)
users (1) -------- (N) posts
users (1) -------- (N) notifications
users (1) -------- (N) media_files

conversations (1) ---- (N) conversation_members
conversations (1) ---- (N) messages
conversations (1) ---- (N) call_records

messages (1) ---- (N) message_receipts
messages (1) ---- (N) notifications

posts (1) ------ (N) post_likes
posts (1) ------ (N) comments

comments (1) ----- (N) comment_likes
```

### 4.3 索引设计

所有表均已创建适当的索引以提高查询性能：

- **users表索引**：username, email, is_active, created_at
- **friendships表索引**：user_a_id, user_b_id, status, created_at
- **conversations表索引**：type, owner_id, updated_at
- **messages表索引**：conversation_id, sender_id, created_at, type, is_deleted
- **posts表索引**：user_id, privacy, created_at, is_deleted
- **notifications表索引**：user_id, type, is_read, created_at

---

## 5. API接口设计

### 5.1 API版本控制

所有API接口使用统一的前缀：`/api`

API版本通过URL路径控制：

- `/api/v1/auth/login` - v1版本
- 未来支持：`/api/v2/auth/login`

### 5.2 统一响应格式

所有API接口使用统一的响应格式：

#### 5.2.1 成功响应

```typescript
{
  success: true,
  data: any,
  message?: string,
  timestamp: string
}
```

#### 5.2.2 错误响应

```typescript
{
  success: false,
  error: {
    code: string,
    message: string,
    details?: any,
  },
  timestamp: string
}
```

#### 5.2.3 错误代码

| 错误代码       | HTTP状态码 | 描述              |
| -------------- | ---------- | ----------------- |
| AUTH_001       | 401        | 未授权            |
| AUTH_002       | 401        | Token无效或已过期 |
| VALIDATION_001 | 400        | 请求参数验证失败  |
| VALIDATION_002 | 400        | 数据格式错误      |
| NOT_FOUND_001  | 404        | 资源不存在        |
| PERMISSION_001 | 403        | 无权限访问        |
| SERVER_001     | 500        | 服务器内部错误    |

### 5.3 分页设计

所有列表查询接口支持分页：

```typescript
// 请求参数
{
  page: number,      // 页码，从1开始
  limit: number,     // 每页数量，默认20，最大100
}

// 响应格式
{
  data: any[],
  pagination: {
    page: number,      // 当前页码
    limit: number,     // 每页数量
    total: number,     // 总记录数
    totalPages: number // 总页数
  }
}
```

### 5.4 WebSocket接口设计

#### 5.4.1 连接

```typescript
// 客户端连接
const socket = io('ws://localhost:3000', {
  auth: {
    token: 'jwt_token',
  },
});

// 连接成功
socket.on('connected', (data) => {
  console.log('Connected:', data);
});

// 连接失败
socket.on('connect_error', (error) => {
  console.error('Connection error:', error);
});
```

#### 5.4.2 事件列表

| 事件名             | 方向          | 描述         |
| ------------------ | ------------- | ------------ |
| connected          | 服务器→客户端 | 连接成功     |
| message            | 服务器→客户端 | 新消息       |
| message_read       | 服务器→客户端 | 消息已读     |
| typing_status      | 服务器→客户端 | 输入状态     |
| friend_status      | 服务器→客户端 | 好友在线状态 |
| group_notification | 服务器→客户端 | 群聊通知     |
| offline_messages   | 服务器→客户端 | 离线消息     |
| notification       | 服务器→客户端 | 系统通知     |
| call_offer         | 服务器→客户端 | 通话请求     |
| call_answer        | 服务器→客户端 | 通话应答     |
| call_declined      | 服务器→客户端 | 通话拒绝     |
| call_ended         | 服务器→客户端 | 通话结束     |
| ice_candidate      | 服务器→客户端 | ICE候选者    |

#### 5.4.3 客户端事件

```typescript
// 加入会话
socket.emit('join_conversation', { conversationId: 'xxx' });

// 离开会话
socket.emit('leave_conversation', { conversationId: 'xxx' });

// 发送消息
socket.emit('send_message', {
  conversationId: 'xxx',
  type: 0,
  content: 'Hello',
});

// 开始输入
socket.emit('typing_start', {
  conversationId: 'xxx',
});

// 停止输入
socket.emit('typing_stop', {
  conversationId: 'xxx',
});

// 标记为已读
socket.emit('mark_as_read', {
  conversationId: 'xxx',
  messageId: 'yyy',
});
```

---

## 6. 安全设计

### 6.1 认证机制

#### 6.1.1 JWT认证

系统使用JWT进行用户认证：

**访问令牌（Access Token）**：

- 有效期：15分钟
- 用途：API请求认证
- 存储位置：客户端内存

**刷新令牌（Refresh Token）**：

- 有效期：7天
- 用途：刷新访问令牌
- 存储位置：客户端安全存储（HttpOnly Cookie）

#### 6.1.2 密码安全

- 使用bcrypt进行密码哈希
- cost factor：10
- 哈希长度：60字符

```typescript
// 密码哈希
const hash = await bcrypt.hash(password, 10);

// 密码验证
const isValid = await bcrypt.compare(password, hash);
```

### 6.2 数据安全

#### 6.2.1 SQL注入防护

- 使用参数化查询
- 禁止字符串拼接SQL
- 使用TypeORM或pg库的参数化功能

```typescript
// ✅ 正确方式（参数化查询）
await this.db.query('SELECT * FROM users WHERE id = $1', [userId]);

// ❌ 错误方式（SQL注入风险）
await this.db.query(`SELECT * FROM users WHERE id = '${userId}'`);
```

#### 6.2.2 XSS防护

- 使用参数化查询防止存储型XSS
- 对用户输入进行HTML转义
- 使用Content-Security-Policy头

#### 6.2.3 CSRF防护

- 使用SameSite Cookie
- 使用CSRF Token（可选）
- 检查Referer头（可选）

### 6.3 传输安全

#### 6.3.1 HTTPS

- 生产环境强制HTTPS
- 禁用HTTP
- 配置TLS 1.2+

#### 6.3.2 加密

- 敏感数据传输加密
- 使用TLS加密WebSocket连接

### 6.4 访问控制

#### 6.4.1 CORS配置

```typescript
app.enableCors({
  origin: process.env.WS_CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
});
```

#### 6.4.2 速率限制

使用`@nestjs/throttler`进行API速率限制：

```typescript
@Throttle({ default: { limit: 100, ttl: 60000 } }) // 每分钟100次请求
@Post('login')
async login(@Body() loginDto: LoginDto) {
  // ...
}
```

### 6.5 文件上传安全

#### 6.5.1 文件类型限制

```typescript
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
```

#### 6.5.2 文件大小限制

```typescript
const MAX_FILE_SIZE = {
  image: 10 * 1024 * 1024, // 10MB
  video: 100 * 1024 * 1024, // 100MB
  audio: 20 * 1024 * 1024, // 20MB
  file: 50 * 1024 * 1024, // 50MB
};
```

#### 6.5.3 文件名处理

- 重命名文件为UUID
- 禁止特殊字符
- 限制文件名长度

---

## 7. 性能设计

### 7.1 数据库优化

#### 7.1.1 索引优化

- 为所有外键创建索引
- 为常用查询字段创建索引
- 使用复合索引优化多条件查询

#### 7.1.2 查询优化

- 使用JOIN代替多次查询
- 使用子查询优化复杂查询
- 使用EXPLAIN分析慢查询

#### 7.1.3 连接池配置

```typescript
// PostgreSQL连接池配置
const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 7.2 缓存策略

#### 7.2.1 Redis缓存

**热点数据缓存**：

- 用户信息（TTL：1小时）
- 用户设置（TTL：1小时）
- 好友列表（TTL：30分钟）

**会话数据缓存**：

- 在线用户列表（TTL：5分钟）
- 会话成员列表（TTL：10分钟）
- WebSocket连接映射（TTL：5分钟）

**通知缓存**：

- 通知列表（TTL：1小时）
- 未读计数（TTL：5分钟）

**离线消息缓存**：

- 离线消息（TTL：7天）

#### 7.2.2 缓存失效策略

- 写后失效（Write-through）
- 定期刷新（Refresh-ahead）
- LRU缓存淘汰

### 7.3 CDN加速

- 静态资源使用CDN
- 图片和视频文件CDN加速
- API响应缓存

### 7.4 分页设计

- 所有列表接口强制分页
- 限制每页最大数量（默认100）
- 使用游标分页替代OFFSET

```typescript
// 使用游标分页（推荐）
const result = await this.db.query(
  `SELECT * FROM messages
   WHERE id < $1
   ORDER BY id DESC
   LIMIT $2`,
  [lastId, limit],
);

// 避免OFFSET分页
```

### 7.5 批量操作

- 批量插入优化
- 批量更新优化
- 使用事务保证一致性

```typescript
// 批量插入
await this.db.query(
  `INSERT INTO messages (conversation_id, sender_id, content)
   VALUES ($1, $2, $3), ($4, $5, $6), ($7, $8, $9)`,
  [conv1, user1, msg1, conv2, user2, msg2, conv3, user3, msg3],
);
```

---

## 8. 部署架构

### 8.1 开发环境

```
开发环境配置：
- Node.js: 18.0+
- PostgreSQL: 16 (Docker)
- Redis: 7 (Docker)
- MinIO: Latest (Docker)
- 应用端口: 3000
- 调试模式: 开启
```

### 8.2 生产环境

```
生产环境建议配置：
- 服务器：至少4核8G内存
- 负载均衡：Nginx
- 数据库：独立数据库服务器
  - 主从复制
  - 读写分离
- Redis：独立Redis服务器
  - Redis Cluster模式
- 对象存储：阿里云OSS或AWS S3
- 应用：多实例部署
  - 至少2个实例
  - 水平扩展
```

### 8.3 Docker部署

#### 8.3.1 Docker Compose配置

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: ${DB_NAME}
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - '5432:5432'

  redis:
    image: redis:7
    command: redis-server --requirepass ${REDIS_PASSWORD}
    volumes:
      - redis_data:/data
    ports:
      - '6379:6379'

  minio:
    image: minio/minio
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY}
    volumes:
      - minio_data:/data
    ports:
      - '9000:9000'
      - '9001:9001'

  app:
    build: .
    depends_on:
      - postgres
      - redis
      - minio
    environment:
      NODE_ENV: ${NODE_ENV}
      DB_HOST: postgres
      REDIS_HOST: redis
      MINIO_ENDPOINT: http://minio:9000
    ports:
      - '3000:3000'
    restart: unless-stopped

volumes:
  postgres_data:
  redis_data:
  minio_data:
```

#### 8.3.2 部署步骤

```bash
# 1. 克隆代码
git clone <repository-url>
cd chat_backend

# 2. 配置环境变量
cp .env.example .env
vi .env

# 3. 构建Docker镜像
docker-compose build

# 4. 启动服务
docker-compose up -d

# 5. 查看日志
docker-compose logs -f app

# 6. 停止服务
docker-compose down
```

### 8.4 监控和日志

#### 8.4.1 应用监控

- 使用Winston记录日志
- 日志级别：DEBUG, INFO, WARN, ERROR
- 日志文件轮转
- 日志文件：logs/app.log

```typescript
// 日志配置
const logger = new Logger('App');
logger.log('Application started');
logger.error('Database connection failed');
logger.warn('API rate limit exceeded');
```

#### 8.4.2 性能监控

- API响应时间监控
- 数据库查询时间监控
- Redis命中率监控
- WebSocket连接数监控

### 8.5 备份策略

#### 8.5.1 数据库备份

```bash
# 每日自动备份
0 2 * * * * pg_dump -U user dbname > /backup/db_$(date +\%Y\%m\%d).sql

# 每周全量备份
0 3 * * 0 pg_dumpall -U user > /backup/full_$(date +\%Y\%m\%d).sql
```

#### 8.5.2 恢复策略

- 定期测试恢复流程
- 保留最近30天的备份
- 异地备份存储

---

## 9. 附录

### 9.1 相关文档

- [需求规格说明书 (SRS)](./requirements/srs.md)
- [系统架构设计文档 (SAD)](./design/system-architecture.md)
- [数据库设计文档](./design/database-design.md)
- [API接口文档](http://localhost:3000/api)

### 9.2 变更历史

| 版本 | 日期       | 作者        | 变更内容 |
| ---- | ---------- | ----------- | -------- |
| v1.0 | 2026-01-08 | Sisyphus AI | 初始版本 |

### 9.3 审批记录

| 审批人 | 日期 | 审批意见 |
| ------ | ---- | -------- |
| -      | -    | -        |

---

**文档结束**
