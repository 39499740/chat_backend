# 系统架构设计文档 (SAD)

**项目名称**: 微信类社交应用后端系统
**文档编号**: CHAT-SAD-001
**版本**: 1.0
**日期**: 2025-01-07
**作者**: Sisyphus AI
**状态**: 草稿

---

## 文档历史

| 版本 | 日期      | 作者     | 变更描述          | 审批人 |
|------|-----------|----------|------------------|--------|
| 1.0  | 2025-01-07 | Sisyphus AI | 初始版本         | 待审批 |

---

## 目录

1. [引言](#1-引言)
2. [架构视图](#2-架构视图)
3. [架构决策记录](#3-架构决策记录)
4. [组件设计](#4-组件设计)
5. [数据流](#5-数据流)
6. [非功能需求设计](#6-非功能需求设计)
7. [技术栈](#7-技术栈)
8. [架构约束](#8-架构约束)
9. [部署架构](#9-部署架构)

---

## 1. 引言

### 1.1 文档目的

本文档描述了微信类社交应用后端系统的软件架构，包括：
- 系统总体架构
- 各组件的职责和接口
- 关键技术决策及其理由
- 数据流和交互模式

### 1.2 系统概述

本系统是一个基于NestJS的企业级社交应用后端，采用模块化单体架构，支持：
- RESTful API
- WebSocket实时通信
- PostgreSQL持久化
- Redis缓存
- MinIO对象存储

### 1.3 架构原则

| 原则 | 描述 | 应用方式 |
|------|------|----------|
| 单一职责 | 每个模块只负责一个业务领域 | 按功能划分模块 |
| 依赖倒置 | 高层模块不依赖低层模块 | 依赖注入 |
| 开闭原则 | 对扩展开放，对修改关闭 | 装饰器、中间件 |
| 接口隔离 | 不依赖不需要的接口 | 最小化模块间耦合 |
| KISS | 保持简单 | 避免过度设计 |
| DRY | 不重复自己 | 提取公共组件 |

---

## 2. 架构视图

### 2.1 逻辑视图

```
┌─────────────────────────────────────────────────────────────┐
│                    客户端层                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐         │
│  │ Android  │  │   iOS    │  │   Web    │         │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘         │
│       │              │              │                  │
└───────┼──────────────┼──────────────┼──────────────────┘
        │              │              │
        └──────────────┴──────────────┘
                      │
        ┌─────────────▼─────────────┐
        │   API Gateway / 负载均衡  │
        └─────────────┬─────────────┘
                      │
        ┌─────────────▼─────────────┐
        │    NestJS 应用层         │
        │  ┌───────────────────┐    │
        │  │  App Module       │    │
        │  │  - Controllers    │    │
        │  │  - Services      │    │
        │  │  - Gateways      │    │
        │  └───────────────────┘    │
        └─────────────┬─────────────┘
                      │
        ┌─────────────▼─────────────┐
        │      业务模块层         │
        │  ┌───────────────────┐    │
        │  │  Auth Module     │    │
        │  │  Users Module    │    │
        │  │  Friends Module  │    │
        │  │  Chat Module     │    │
        │  │  Moments Module  │    │
        │  │  Uploads Module  │    │
        │  │  Notifications  │    │
        │  └───────────────────┘    │
        └─────────────┬─────────────┘
                      │
        ┌─────────────▼─────────────┐
        │      公共模块层         │
        │  ┌───────────────────┐    │
        │  │  Database        │    │
        │  │  Redis           │    │
        │  │  MinIO           │    │
        │  │  Guards          │    │
        │  │  Filters         │    │
        │  │  Interceptors    │    │
        │  │  DTOs            │    │
        │  └───────────────────┘    │
        └─────────────┬─────────────┘
                      │
        ┌─────────────▼─────────────┐
        │       数据层           │
        │  ┌───────────────────┐    │
        │  │  PostgreSQL       │    │
        │  │  Redis           │    │
        │  │  MinIO           │    │
        │  └───────────────────┘    │
        └───────────────────────────┘
```

### 2.2 部署视图

```
┌────────────────────────────────────────────────────────────────┐
│                      互联网/内网                         │
│                                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │
│  │   用户A     │  │   用户B     │  │   用户C     │   │
│  │  Android    │  │   iOS       │  │   Web       │   │
│  └──────┬─────┘  └──────┬─────┘  └──────┬─────┘   │
│         │                │                │             │
└─────────┼────────────────┼────────────────┼─────────────┘
          │                │                │
          └────────────────┴────────────────┘
                           │
          ┌────────────────▼────────────────┐
          │   CDN (CloudFlare)          │
          │   静态资源缓存              │
          └────────────────┬───────────────┘
                           │
          ┌────────────────▼────────────────┐
          │   Load Balancer (Nginx)     │
          │   SSL 终止                  │
          └────────────────┬───────────────┘
                           │
          ┌────────────────▼────────────────┐
          │   Application Cluster        │
          │  ┌────────────────────┐     │
          │  │  App Instance 1   │     │
          │  │  (Node.js 18+)  │     │
          │  └────────────────────┘     │
          │  ┌────────────────────┐     │
          │  │  App Instance 2   │     │
          │  │  (Node.js 18+)  │     │
          │  └────────────────────┘     │
          │  ┌────────────────────┐     │
          │  │  App Instance N   │     │
          │  └────────────────────┘     │
          └────────────────┬─────────────┘
                           │
          ┌────────────────▼────────────────┐
          │   Data Layer                │
          │  ┌────────────────────┐     │
          │  │  PostgreSQL 16     │     │
          │  │  (Primary)        │     │
          │  └────────────────────┘     │
          │  ┌────────────────────┐     │
          │  │  Redis Cluster     │     │
          │  │  (Master-Slave)   │     │
          │  └────────────────────┘     │
          │  ┌────────────────────┐     │
          │  │  MinIO            │     │
          │  └────────────────────┘     │
          └───────────────────────────────┘
```

### 2.3 进程视图

```
用户注册流程:

用户客户端
    │
    ├─ 1. POST /auth/register
    │
    ▼
AuthController.register()
    │
    ├─ 2. 验证输入
    ├─ 3. 检查用户是否已存在
    ├─ 4. 加密密码
    ├─ 5. 创建用户记录
    ├─ 6. 生成JWT Token
    └─ 7. 返回用户信息和Token
    │
    ▼
Database (PostgreSQL)
    │
    └─ INSERT INTO users (...)

---

发送私聊消息流程:

用户客户端
    │
    ├─ 1. WebSocket连接
    │   └─ handshake (JWT Token)
    │
    ▼
ChatGateway.onConnection()
    │
    ├─ 2. 验证JWT
    └─ 3. 关联socket到user
    │
    ├─ 4. socket.emit('send-message')
    │
    ▼
ChatGateway.sendMessage()
    │
    ├─ 5. 验证好友关系
    ├─ 6. 保存消息到数据库
    ├─ 7. 获取接收者socket
    ├─ 8. socket.to(receiver).emit('new-message')
    └─ 9. 更新未读数
    │
    ▼
Database (PostgreSQL)
    │
    └─ INSERT INTO messages (...)
```

### 2.4 数据视图

```
核心数据模型:

users (用户表)
├── id (UUID, PK)
├── username (VARCHAR, UNIQUE)
├── email (VARCHAR, UNIQUE)
├── phone (VARCHAR, UNIQUE)
├── password_hash (VARCHAR)
├── nickname (VARCHAR)
├── avatar_url (TEXT)
├── created_at (TIMESTAMP)
└── updated_at (TIMESTAMP)

friendships (好友关系表)
├── id (UUID, PK)
├── user_a_id (UUID, FK -> users.id)
├── user_b_id (UUID, FK -> users.id)
├── status (SMALLINT)
├── remark (VARCHAR)
└── created_at (TIMESTAMP)

conversations (会话表)
├── id (UUID, PK)
├── type (SMALLINT) -- 1:私聊, 2:群聊
├── name (VARCHAR)
├── avatar_url (TEXT)
├── owner_id (UUID, FK -> users.id)
└── created_at (TIMESTAMP)

messages (消息表)
├── id (UUID, PK)
├── conversation_id (UUID, FK -> conversations.id)
├── sender_id (UUID, FK -> users.id)
├── message_type (SMALLINT)
├── content (TEXT)
├── media_url (TEXT)
└── created_at (TIMESTAMP)

posts (动态表)
├── id (UUID, PK)
├── user_id (UUID, FK -> users.id)
├── content (TEXT)
├── media_urls (TEXT[])
├── visibility (SMALLINT)
├── like_count (INTEGER)
├── comment_count (INTEGER)
└── created_at (TIMESTAMP)
```

### 2.5 安全视图

```
安全层:

┌─────────────────────────────────────┐
│   1. 网络层                   │
│  ┌───────────────────────────┐    │
│  │ HTTPS/TLS 1.3          │    │
│  │ DDoS防护               │    │
│  └───────────────────────────┘    │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│   2. 应用层                   │
│  ┌───────────────────────────┐    │
│  │ JWT认证                │    │
│  │ 权限控制 (RBAC)       │    │
│  │ 输入验证 (class-validator)│  │
│  │ 速率限制 (Redis)       │    │
│  └───────────────────────────┘    │
└─────────────┬───────────────────────┘
              │
┌─────────────▼───────────────────────┐
│   3. 数据层                   │
│  ┌───────────────────────────┐    │
│  │ SQL注入防护            │    │
│  │ 数据加密 (BCrypt)      │    │
│  │ 连接加密              │    │
│  │ 访问控制              │    │
│  └───────────────────────────┘    │
└───────────────────────────────┘
```

---

## 3. 架构决策记录 (ADR)

### ADR-001: 使用NestJS框架

**状态**: 已接受

**日期**: 2025-01-07

**上下文**:
需要选择一个企业级Node.js后端框架，支持模块化架构、依赖注入、WebSocket、测试。

**决策**:
使用NestJS框架。

**理由**:
- ✅ 提供完整的依赖注入系统
- ✅ 内置模块化架构
- ✅ WebSocket开箱即用
- ✅ TypeScript原生支持
- ✅ 丰富的生态系统（@nestjs/*）
- ✅ 测试友好
- ✅ 类似Angular的架构，学习曲线平缓

**后果**:
- 正面：开发效率高，代码结构清晰
- 正面：易于测试和维护
- 负面：启动时性能略低于Express

### ADR-002: 使用PostgreSQL + pg驱动

**状态**: 已接受

**日期**: 2025-01-07

**上下文**:
需要选择关系型数据库和访问方式。

**决策**:
使用PostgreSQL 16 + pg驱动（不使用TypeORM）。

**理由**:
- ✅ PostgreSQL性能优秀，支持复杂查询
- ✅ pg驱动轻量级，性能优于ORM
- ✅ 直接控制SQL，易于优化
- ✅ 支持JSONB，灵活存储
- ✅ 支持UUID原生类型
- ✅ 支持全文搜索
- ✅ 免费且开源

**后果**:
- 正面：查询性能最优
- 正面：灵活的数据模型设计
- 负面：需要手写SQL，开发效率略低
- 负面：需要手动管理迁移

### ADR-003: 使用Redis作为缓存和会话存储

**状态**: 已接受

**日期**: 2025-01-07

**上下文**:
需要高速缓存和会话存储方案。

**决策**:
使用Redis 7。

**理由**:
- ✅ 内存存储，极快（< 1ms）
- ✅ 丰富的数据结构（String, Hash, Set, List）
- ✅ 支持Pub/Sub，适合实时通知
- ✅ 支持过期机制
- ✅ 持久化（RDB/AOF）
- ✅ 高可用（Redis Cluster）

**用途**:
- 用户会话存储
- JWT黑名单
- 速率限制
- 在线用户列表
- 热点数据缓存
- 消息队列

### ADR-004: 使用MinIO作为对象存储

**状态**: 已接受

**日期**: 2025-01-07

**上下文**:
需要存储图片、视频、音频等大文件。

**决策**:
使用MinIO（自建S3兼容对象存储）。

**理由**:
- ✅ S3 API兼容，易于迁移
- ✅ 开源免费
- ✅ 支持分布式部署
- ✅ 支持版本控制
- ✅ 支持生命周期管理
- ✅ 可部署在私有云
- ✅ 预签名URL，安全访问

**后果**:
- 正面：成本可控，无厂商锁定
- 正面：数据自主可控
- 负面：需要运维MinIO集群
- 负面：不如云厂商CDN快

### ADR-005: 使用Socket.IO进行实时通信

**状态**: 已接受

**日期**: 2025-01-07

**上下文**:
需要WebSocket实时通信方案。

**决策**:
使用Socket.IO。

**理由**:
- ✅ 自动降级（WebSocket → Polling）
- ✅ 房间和命名空间机制
- ✅ 内置重连
- ✅ 跨浏览器支持
- ✅ Redis适配器，支持分布式
- ✅ 丰富的生态系统

**后果**:
- 正面：开发快速，功能完善
- 正面：易用性强
- 负面：协议开销略大于原生WebSocket
- 负面：性能略低于原生WebSocket

### ADR-006: 模块化单体架构

**状态**: 已接受

**日期**: 2025-01-07

**上下文**:
需要选择单体 vs 微服务架构。

**决策**:
采用模块化单体架构，保留未来微服务化的可能。

**理由**:
- ✅ 初期开发效率高
- ✅ 部署简单
- ✅ 调试容易
- ✅ 事务一致性
- ✅ 模块化设计，易于拆分
- ✅ 避免过早优化的复杂性

**后果**:
- 正面：开发效率高，部署简单
- 正面：适合当前团队规模
- 负面：单体可能成为瓶颈
- 负面：扩展性不如微服务

### ADR-007: 使用JWT进行认证

**状态**: 已接受

**日期**: 2025-01-07

**上下文**:
需要选择认证方案。

**决策**:
使用JWT (JSON Web Token)。

**理由**:
- ✅ 无状态，易于扩展
- ✅ 跨域支持
- ✅ 移动端友好
- ✅ 性能优于Session
- ✅ 支持过期时间
- ✅ 支持自定义Claims

**安全措施**:
- 使用强密钥
- 设置合理过期时间（7天）
- 使用Refresh Token
- 实现Token黑名单（Redis）
- HTTPS传输

---

## 4. 组件设计

### 4.1 认证模块 (Auth Module)

**职责**:
- 用户注册
- 用户登录/登出
- Token生成和验证
- 密码重置

**组件**:
```
auth/
├── controllers/
│   └── auth.controller.ts
├── services/
│   └── auth.service.ts
├── guards/
│   └── jwt-auth.guard.ts
├── strategies/
│   └── jwt.strategy.ts
├── dto/
│   ├── register.dto.ts
│   ├── login.dto.ts
│   └── change-password.dto.ts
└── auth.module.ts
```

**接口**:
- `POST /auth/register` - 用户注册
- `POST /auth/login` - 用户登录
- `POST /auth/logout` - 用户登出
- `POST /auth/refresh` - 刷新Token
- `POST /auth/change-password` - 修改密码

### 4.2 用户模块 (Users Module)

**职责**:
- 用户信息管理
- 用户资料更新
- 头像上传

**组件**:
```
users/
├── controllers/
│   └── users.controller.ts
├── services/
│   └── users.service.ts
├── dto/
│   ├── update-user.dto.ts
│   └── user.dto.ts
└── users.module.ts
```

**接口**:
- `GET /users/me` - 获取当前用户信息
- `PATCH /users/me` - 更新用户资料
- `GET /users/:id` - 获取用户公开信息
- `POST /users/avatar` - 上传头像

### 4.3 好友模块 (Friends Module)

**职责**:
- 好友关系管理
- 好友请求
- 黑名单管理

**组件**:
```
friends/
├── controllers/
│   └── friendships.controller.ts
├── services/
│   └── friendships.service.ts
├── dto/
│   ├── send-request.dto.ts
│   └── friendship.dto.ts
└── friendships.module.ts
```

**接口**:
- `POST /friends/request` - 发送好友请求
- `POST /friends/accept/:id` - 接受好友请求
- `POST /friends/reject/:id` - 拒绝好友请求
- `GET /friends` - 获取好友列表
- `DELETE /friends/:id` - 删除好友
- `POST /friends/block/:id` - 拉黑用户

### 4.4 聊天模块 (Chat Module)

**职责**:
- 私聊消息
- 群聊消息
- 实时通信
- 消息历史

**组件**:
```
chat/
├── controllers/
│   └── messages.controller.ts
├── services/
│   └── messages.service.ts
├── gateways/
│   └── chat.gateway.ts
├── dto/
│   ├── send-message.dto.ts
│   └── message.dto.ts
└── chat.module.ts
```

**接口**:
- `POST /messages/private` - 发送私聊消息
- `GET /messages/private/:userId` - 获取私聊历史
- `POST /messages/group/:groupId` - 发送群聊消息
- `GET /messages/group/:groupId` - 获取群聊历史
- `PATCH /messages/:id/read` - 标记已读
- `DELETE /messages/:id` - 撤回消息

**WebSocket事件**:
- `send-message` - 发送消息
- `new-message` - 收到新消息
- `message-read` - 消息已读
- `typing-start` - 开始输入
- `typing-stop` - 停止输入

### 4.5 朋友圈模块 (Moments Module)

**职责**:
- 动态发布
- 动态浏览
- 点赞和评论

**组件**:
```
moments/
├── controllers/
│   ├── posts.controller.ts
│   ├── likes.controller.ts
│   └── comments.controller.ts
├── services/
│   ├── posts.service.ts
│   ├── likes.service.ts
│   └── comments.service.ts
├── dto/
│   ├── create-post.dto.ts
│   └── post.dto.ts
└── moments.module.ts
```

**接口**:
- `POST /moments` - 发布动态
- `GET /moments` - 获取动态列表
- `GET /moments/:id` - 获取单条动态
- `DELETE /moments/:id` - 删除动态
- `POST /moments/:id/like` - 点赞
- `DELETE /moments/:id/like` - 取消点赞
- `POST /moments/:id/comments` - 添加评论
- `DELETE /comments/:id` - 删除评论

### 4.6 文件上传模块 (Uploads Module)

**职责**:
- 图片上传
- 视频上传
- 语音上传
- 文件处理

**组件**:
```
uploads/
├── controllers/
│   └── media.controller.ts
├── services/
│   └── minio.service.ts
├── dto/
│   └── upload.dto.ts
└── uploads.module.ts
```

**接口**:
- `POST /uploads/images` - 上传图片
- `POST /uploads/videos` - 上传视频
- `POST /uploads/voices` - 上传语音
- `GET /uploads/presigned-url` - 获取预签名URL

### 4.7 通知模块 (Notifications Module)

**职责**:
- 通知创建
- 通知推送
- 通知查询

**组件**:
```
notifications/
├── services/
│   ├── notifications.service.ts
│   └── notification.gateway.ts
└── notifications.module.ts
```

**接口**:
- `GET /notifications` - 获取通知列表
- `PATCH /notifications/read` - 标记已读
- `PATCH /notifications/read-all` - 全部标记已读

---

## 5. 数据流

### 5.1 用户注册流程

```
客户端                     API层                服务层              数据层
  │                         │                    │                    │
  ├─ POST /auth/register    │                    │                    │
  │────────────────────────>│                    │                    │
  │                         │                    │                    │
  │                         ├─ validateInput()   │                    │
  │                         ├─ checkExists()    │                    │
  │                         │                    │                    │
  │                         ├─ hashPassword()   │                    │
  │                         │                    │                    │
  │                         ├─ createUser()     │                    │
  │                         │                    ├─ INSERT INTO users
  │                         │                    │───────────────────>│
  │                         │                    │                    │
  │                         ├─ generateJWT()    │                    │
  │                         │                    │                    │
  │<────────────────────────│                    │                    │
  │  201 Created + Token    │                    │                    │
```

### 5.2 发送私聊消息流程

```
客户端                WebSocket Gateway        服务层              数据层
  │                            │                    │                    │
  ├─ socket.on('send-message') │                    │                    │
  │───────────────────────────>│                    │                    │
  │                            │                    │                    │
  │                            ├─ verifyJWT()      │                    │
  │                            │                    │                    │
  │                            ├─ checkFriendship()│                    │
  │                            │                    ├─ SELECT * FROM
  │                            │                    │  friendships
  │                            │                    │───────────────────>│
  │                            │<───────────────────────│                    │
  │                            │                    │                    │
  │                            ├─ saveMessage()    │                    │
  │                            │                    ├─ INSERT INTO messages
  │                            │                    │───────────────────>│
  │                            │<───────────────────────│                    │
  │                            │                    │                    │
  │                            ├─ getRecipientSocket()                    │
  │                            │                    │                    │
  │                            ├─ socket.to(receiver).emit('new-message')
  │                            │                    │                    │
  │                            ├─ updateUnreadCount()                    │
  │                            │                    │                    │
  │<───────────────────────────│                    │                    │
  │  Message Sent              │                    │                    │
```

### 5.3 发布动态流程

```
客户端                    API层              服务层              数据层              MinIO
  │                        │                    │                    │                    │
  ├─ POST /moments        │                    │                    │                    │
  │───────────────────────>│                    │                    │                    │
  │                        │                    │                    │                    │
  │                        ├─ validateInput()    │                    │                    │                    │
  │                        ├─ processMedia()     │                    │                    │                    │
  │                        │                    │                    │                    │
  │                        │                    ├─ uploadToMinIO()    │                    │
  │                        │                    │────────────────────>│                    │
  │                        │                    │<────────────────────│                    │
  │                        │                    │                    │                    │
  │                        ├─ createPost()      │                    │                    │
  │                        │                    ├─ INSERT INTO posts   │                    │
  │                        │                    │─────────────────────>│                    │
  │                        │<─────────────────────│                    │                    │
  │                        │                    │                    │                    │
  │                        ├─ pushToFriendsFeed()                    │                    │
  │                        │                    ├─ INSERT INTO user_feeds (batch)                  │
  │                        │                    │─────────────────────>│                    │
  │<───────────────────────│                    │                    │                    │                    │
  │  201 Created + Post    │                    │                    │                    │                    │
```

---

## 6. 非功能需求设计

### 6.1 性能设计

**数据库优化**:
- 合理索引设计
- 查询优化（EXPLAIN分析）
- 连接池（max: 20）
- 读写分离（未来）
- 表分区（messages按时间分区）

**缓存策略**:
- L1: 应用内存缓存（30秒TTL）
- L2: Redis缓存（1小时TTL）
- 缓存穿透防护（空值缓存）
- 缓存雪崩防护（TTL抖动）

**API性能**:
- 使用异步处理
- 批量数据库操作
- 分页限制（默认20，最大100）
- 响应压缩（gzip）

### 6.2 可扩展性设计

**水平扩展**:
- 无状态设计（Session使用JWT）
- WebSocket使用Redis Adapter
- 数据库支持主从复制

**微服务化准备**:
- 模块化设计
- 清晰的模块边界
- 定义好的接口

**消息分区**:
- messages表按时间分区（每月一个分区）
- 历史数据归档（>6个月）

### 6.3 安全设计

**认证授权**:
- JWT Token认证
- Refresh Token机制
- Token黑名单（Redis）

**数据安全**:
- 密码BCrypt加密（10 rounds）
- 敏感信息脱敏
- HTTPS强制

**输入验证**:
- class-validator自动验证
- 白名单文件类型
- 文件大小限制

**速率限制**:
- API调用限制（100/15分钟）
- 登录限制（5次/30分钟）
- WebSocket消息限制（10条/分钟）

### 6.4 可靠性设计

**错误处理**:
- 全局异常过滤器
- 结构化错误响应
- 错误日志（Winston）

**数据一致性**:
- 数据库事务
- 唯一约束
- 外键约束

**备份恢复**:
- 每日全量备份
- 每小时增量备份
- 保留7天备份

---

## 7. 技术栈

### 7.1 后端技术

| 技术 | 版本 | 用途 |
|------|------|------|
| Node.js | 18+ | 运行时 |
| NestJS | 10.3 | 应用框架 |
| TypeScript | 5.3 | 编程语言 |
| pg | 8.11 | PostgreSQL驱动 |

### 7.2 数据和存储

| 技术 | 版本 | 用途 |
|------|------|------|
| PostgreSQL | 16 | 关系型数据库 |
| Redis | 7 | 缓存和会话 |
| MinIO | Latest | 对象存储 |

### 7.3 实时通信

| 技术 | 版本 | 用途 |
|------|------|------|
| Socket.IO | 4.6 | WebSocket服务器 |
| Socket.IO Redis Adapter | 8.2 | 分布式支持 |

### 7.4 测试和文档

| 技术 | 版本 | 用途 |
|------|------|------|
| Jest | 29 | 测试框架 |
| Supertest | 6 | API测试 |
| Swagger | 7.1 | API文档 |

---

## 8. 架构约束

### 8.1 技术约束

- 后端必须使用TypeScript
- 必须使用NestJS框架
- 数据库必须使用PostgreSQL
- 必须使用Docker容器化

### 8.2 业务约束

- 好友数量上限：5000
- 群成员上限：500
- 文件大小上限：100MB
- 消息保留期：永久（归档后查询）

### 8.3 合规约束

- 用户数据隐私保护
- 审计日志保留90天
- 数据本地化存储

---

## 9. 部署架构

### 9.1 开发环境

```
┌─────────────────────────────────┐
│  开发机器                  │
│  ┌───────────────────────┐    │
│  │  Docker Compose     │    │
│  │  - App            │    │
│  │  - PostgreSQL     │    │
│  │  - Redis          │    │
│  │  - MinIO          │    │
│  └───────────────────────┘    │
└─────────────────────────────────┘
```

### 9.2 生产环境

```
┌──────────────────────────────────────┐
│  负载均衡器 (Nginx)             │
│  - SSL终止                      │
│  - 负载均衡                     │
│  - 静态资源                    │
└──────────────┬───────────────────┘
               │
    ┌──────────┴──────────┐
    │                     │
┌───▼────┐          ┌────▼────┐
│ App 1  │          │  App 2  │
│ (NestJS)│          │ (NestJS)│
└───┬────┘          └────┬────┘
    │                    │
    └────────┬───────────┘
             │
    ┌────────▼───────────┐
    │  PostgreSQL HA     │
    │  - Primary        │
    │  - Standby        │
    └───────────────────┘
             │
    ┌────────▼───────────┐
    │  Redis Cluster     │
    │  - Master         │
    │  - Slaves (2)     │
    └───────────────────┘
             │
    ┌────────▼───────────┐
    │  MinIO Cluster    │
    │  - 4 Nodes        │
    └───────────────────┘
```

### 9.3 扩展策略

**水平扩展**:
- 增加应用实例
- 使用负载均衡
- 共享Redis缓存

**垂直扩展**:
- 增加CPU核心
- 增加内存
- 增加存储空间

**数据库扩展**:
- 读写分离
- 数据库分片（未来）

---

## 附录

### A. 架构模式应用

| 模式 | 应用位置 | 说明 |
|------|---------|------|
| 依赖注入 | 全局 | NestJS核心 |
| 策略模式 | 认证 | JWT策略 |
| 守卫模式 | 安全 | AuthGuard |
| 拦截器模式 | 日志/转换 | LoggingInterceptor |
| 过滤器模式 | 异常处理 | AllExceptionsFilter |
| 仓储模式 | 数据访问 | Service层封装 |
| 工厂模式 | 配置 | ConfigFactory |
| 观察者模式 | 通知 | EventEmitter2 |
| 适配器模式 | Redis | RedisAdapter |

### B. 非功能性需求映射

| NFR | 设计策略 |
|-----|---------|
| 性能 | 缓存、索引、连接池、批处理 |
| 安全 | JWT、加密、验证、速率限制 |
| 可用性 | 无状态、集群、备份 |
| 可维护性 | 模块化、文档、日志、测试 |
| 可扩展性 | 水平扩展、消息分区 |

### C. 性能指标

| 指标 | 目标 | 测量 |
|------|------|------|
| API响应时间(P95) | < 200ms | APM |
| API响应时间(P99) | < 500ms | APM |
| WebSocket延迟 | < 100ms | 客户端 |
| 并发用户 | ≥ 10,000 | 负载测试 |
| 消息吞吐量 | ≥ 10,000 msg/s | 压力测试 |
| 缓存命中率 | > 80% | Redis监控 |
| 数据库查询(P95) | < 100ms | 慢查询日志 |

---

**文档审批**:

| 角色 | 姓名 | 签名 | 日期 |
|------|------|------|------|
| 架构师 | | | |
| 技术负责人 | | | |
| 项目经理 | | | |
