# 数据库设计文档

**项目名称**: 微信类社交应用后端系统
**文档编号**: CHAT-DBD-001
**版本**: 1.0
**日期**: 2025-01-07
**作者**: Sisyphus AI
**数据库**: MySQL 16
**状态**: 草稿

---

## 文档历史

| 版本 | 日期      | 作者     | 变更描述 | 审批人 |
|------|-----------|----------|----------|--------|
| 1.0  | 2025-01-07 | Sisyphus AI | 初始版本 | 待审批 |

---

## 目录

1. [引言](#1-引言)
2. [数据库概述](#2-数据库概述)
3. [数据模型](#3-数据模型)
4. [表结构](#4-表结构)
5. [索引设计](#5-索引设计)
6. [视图设计](#6-视图设计)
7. [存储过程和函数](#7-存储过程和函数)
8. [数据迁移](#8-数据迁移)
9. [性能优化](#9-性能优化)
10. [备份和恢复](#10-备份和恢复)

---

## 1. 引言

### 1.1 文档目的

本文档详细描述了微信类社交应用后端系统的MySQL数据库设计，包括：
- 数据库表结构
- 字段定义和约束
- 索引策略
- 视图和存储过程
- 性能优化建议

### 1.2 数据库概述

**数据库类型**: MySQL 16

**字符集**: UTF-8

**排序规则**: zh_CN.UTF-8

**时区**: Asia/Shanghai (或根据部署地区调整)

### 1.3 设计原则

| 原则 | 描述 | 应用方式 |
|------|------|----------|
| 第三范式 (3NF) | 消除传递依赖 | 表结构设计 |
| 适度冗余 | 提升查询性能 | like_count, comment_count |
| UUID主键 | 分布式友好 | 所有表使用UUID |
| 时间戳审计 | 追踪数据变更 | created_at, updated_at |
| 软删除 | 保留数据 | is_deleted, deleted_at |

---

## 2. 数据库概述

### 2.1 数据库命名规范

- **数据库名**: `chat_backend`
- **表名**: 小写，下划线分隔，复数形式 (users, messages)
- **字段名**: 小写，下划线分隔
- **索引名**: `idx_表名_字段名`
- **约束名**: `fk_表名_字段名`, `uk_表名_字段名`

### 2.2 数据库初始化SQL

```sql
-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 创建函数：自动更新 updated_at 字段
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';
```

---

## 3. 数据模型

### 3.1 ER图

```
┌─────────────┐         ┌────────────────┐
│   users     │         │ user_sessions  │
├─────────────┤         ├────────────────┤
│ id (PK)     │───────▶│ id (PK)       │
│ username    │         │ user_id (FK)  │
│ email       │         │ token          │
│ password_hash│         │ expires_at     │
│ avatar_url  │         │               │
│ created_at  │         │               │
└─────────────┘         └────────────────┘
       │                        │
       │                        │
       ▼                        ▼
┌─────────────┐         ┌────────────────┐
│friendships │         │ user_settings │
├─────────────┤         ├────────────────┤
│ id (PK)     │         │ user_id (PK)  │
│ user_a_id (FK)│◀────────│ privacy_*     │
│ user_b_id (FK)│         │ notification_* │
│ status      │         │ language       │
└─────────────┘         └────────────────┘
       │
       │
       ▼
┌─────────────┐         ┌─────────────┐
│conversations│◀────────│   posts     │
├─────────────┤         ├─────────────┤
│ id (PK)     │         │ id (PK)     │
│ type        │         │ user_id (FK)│
│ name        │         │ content     │
│ owner_id    │         │ media_urls[]│
│ updated_at  │         │ visibility  │
└─────────────┘         └─────────────┘
       │                        │
       │                        │
       ▼                        ▼
┌──────────────────┐         ┌─────────────┐
│conv_members    │         │post_likes   │
├──────────────────┤         ├─────────────┤
│ id (PK)        │         │ id (PK)     │
│ conv_id (FK)   │         │ post_id (FK)│
│ user_id (FK)   │         │ user_id (FK)│
│ role           │         │ created_at  │
│ last_read_at  │         └─────────────┘
└──────────────────┘
        │
        │
        ▼
┌─────────────┐         ┌─────────────┐
│  messages  │         │   comments  │
├─────────────┤         ├─────────────┤
│ id (PK)     │         │ id (PK)     │
│ conv_id (FK)│◀────────│ post_id (FK)│
│ sender_id   │         │ user_id (FK)│
│ content     │         │ content     │
│ created_at  │         │ parent_id(FK)│
└─────────────┘         └─────────────┘
```

### 3.2 核心实体关系

1. **用户系统**
   - users (用户)
   - user_sessions (会话)
   - user_settings (设置)

2. **社交系统**
   - friendships (好友关系)
   - friend_requests (好友请求)
   - blocked_users (黑名单)

3. **聊天系统**
   - conversations (会话)
   - conversation_members (会话成员)
   - messages (消息)
   - message_receipts (消息回执)

4. **朋友圈系统**
   - posts (动态)
   - post_visibility (动态可见性)
   - post_likes (点赞)
   - comments (评论)
   - comment_likes (评论点赞)

5. **通知系统**
   - notifications (通知)

6. **媒体系统**
   - media_files (媒体文件)
   - cdn_cache (CDN缓存)

---

## 4. 表结构

### 4.1 用户表

#### users (用户表)

```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 认证信息
    username VARCHAR(32) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    
    -- 个人资料
    nickname VARCHAR(64),
    avatar_url TEXT,
    bio TEXT,
    gender SMALLINT DEFAULT 0 CHECK (gender IN (0, 1, 2)), -- 0:未知, 1:男, 2:女
    birth_date DATE,
    region VARCHAR(100),
    
    -- 账户状态
    status SMALLINT DEFAULT 0, -- 0:正常, 1:禁用, 2:已删除
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    
    -- 时间戳
    last_login_at TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 触发器：自动更新 updated_at
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_phone ON users(phone);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at DESC);
```

#### user_sessions (用户会话表)

```sql
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 会话信息
    token VARCHAR(500) NOT NULL UNIQUE,
    refresh_token VARCHAR(500),
    device_type VARCHAR(50), -- iOS, Android, Web
    device_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    
    -- 过期时间
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(token);
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_sessions_user_expires ON user_sessions(user_id, expires_at);
```

#### user_settings (用户设置表)

```sql
CREATE TABLE user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    
    -- 隐私设置
    privacy_profile_visible BOOLEAN DEFAULT TRUE,
    privacy_add_friend BOOLEAN DEFAULT TRUE,
    privacy_search_by_phone BOOLEAN DEFAULT TRUE,
    privacy_search_by_email BOOLEAN DEFAULT FALSE,
    privacy_online_visible BOOLEAN DEFAULT TRUE,
    
    -- 通知设置
    notification_message BOOLEAN DEFAULT TRUE,
    notification_friend_request BOOLEAN DEFAULT TRUE,
    notification_mention BOOLEAN DEFAULT TRUE,
    notification_comment BOOLEAN DEFAULT TRUE,
    notification_sound BOOLEAN DEFAULT TRUE,
    
    -- 其他设置
    language VARCHAR(10) DEFAULT 'zh-CN',
    theme VARCHAR(20) DEFAULT 'auto',
    message_sound VARCHAR(50) DEFAULT 'default',
    
    -- 时间戳
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4.2 社交表

#### friendships (好友关系表)

```sql
CREATE TABLE friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 好友信息
    remark VARCHAR(64), -- 备注名
    group_name VARCHAR(50), -- 好友分组
    
    -- 状态: 0:已接受, 1:待确认, 2:已拒绝, 3:已拉黑
    status SMALLINT DEFAULT 1,
    blocked_reason TEXT,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 约束
    CHECK (user_a_id != user_b_id),
    UNIQUE (user_a_id, user_b_id)
);

-- 索引
CREATE INDEX idx_friendships_user_a ON friendships(user_a_id);
CREATE INDEX idx_friendships_user_b ON friendships(user_b_id);
CREATE INDEX idx_friendships_status ON friendships(status);
CREATE INDEX idx_friendships_group ON friendships(user_a_id, group_name);
```

#### friend_requests (好友请求表)

```sql
CREATE TABLE friend_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 请求信息
    message TEXT,
    
    -- 状态: 0:待处理, 1:已接受, 2:已拒绝, 3:已忽略
    status SMALLINT DEFAULT 0,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    responded_at TIMESTAMP WITH TIME ZONE,
    
    -- 约束
    CHECK (requester_id != recipient_id)
);

-- 索引
CREATE INDEX idx_friend_requests_requester ON friend_requests(requester_id);
CREATE INDEX idx_friend_requests_recipient ON friend_requests(recipient_id);
CREATE INDEX idx_friend_requests_status ON friend_requests(status);
CREATE INDEX idx_friend_requests_created ON friend_requests(created_at DESC);
```

#### blocked_users (黑名单表)

```sql
CREATE TABLE blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 拉黑原因
    reason VARCHAR(255),
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 约束
    CHECK (user_id != blocked_user_id),
    UNIQUE (user_id, blocked_user_id)
);

-- 索引
CREATE INDEX idx_blocked_users_user ON blocked_users(user_id);
CREATE INDEX idx_blocked_users_blocked ON blocked_users(blocked_user_id);
```

### 4.3 聊天表

#### conversations (会话表)

```sql
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    
    -- 会话类型: 1:单聊, 2:群聊, 3:系统通知
    type SMALLINT NOT NULL DEFAULT 1,
    
    -- 会话信息
    name VARCHAR(128),
    avatar_url TEXT,
    description TEXT,
    
    -- 群聊信息
    owner_id UUID REFERENCES users(id), -- 群主
    max_members INTEGER DEFAULT 500,
    
    -- 会话设置
    is_muted BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_conversations_type ON conversations(type);
CREATE INDEX idx_conversations_owner ON conversations(owner_id);
CREATE INDEX idx_conversations_updated ON conversations(updated_at DESC);
```

#### conversation_members (会话成员表)

```sql
CREATE TABLE conversation_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 成员角色: 1:普通成员, 2:管理员, 3:群主
    role SMALLINT DEFAULT 1,
    
    -- 成员设置
    is_muted BOOLEAN DEFAULT FALSE,
    nickname VARCHAR(64), -- 群昵称
    
    -- 已读状态
    last_read_message_id UUID,
    unread_count INTEGER DEFAULT 0,
    
    -- 时间戳
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_read_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE (conversation_id, user_id)
);

-- 索引
CREATE INDEX idx_conv_members_conv_id ON conversation_members(conversation_id);
CREATE INDEX idx_conv_members_user_id ON conversation_members(user_id);
CREATE INDEX idx_conv_members_conv_user ON conversation_members(conversation_id, user_id);
CREATE INDEX idx_conv_members_unread ON conversation_members(user_id, unread_count);
```

#### messages (消息表 - 按时间分区)

```sql
CREATE TABLE messages (
    id UUID,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 消息类型: 1:文本, 2:图片, 3:语音, 4:视频, 5:位置, 6:文件, 7:表情, 8:撤回, 9:系统通知
    message_type SMALLINT NOT NULL DEFAULT 1,
    
    -- 消息内容
    content TEXT,
    media_url TEXT,
    media_metadata JSONB, -- 媒体元数据（宽高、时长、大小等）
    
    -- 引用消息(回复消息)
    reply_to_id UUID REFERENCES messages(id),
    
    -- 消息状态
    is_deleted BOOLEAN DEFAULT FALSE,
    is_recalled BOOLEAN DEFAULT FALSE,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- 创建分区（2025年）
CREATE TABLE messages_2025_01 PARTITION OF messages
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

CREATE TABLE messages_2025_02 PARTITION OF messages
    FOR VALUES FROM ('2025-02-01') TO ('2025-03-01');

CREATE TABLE messages_2025_03 PARTITION OF messages
    FOR VALUES FROM ('2025-03-01') TO ('2025-04-01');

CREATE TABLE messages_2025_04 PARTITION OF messages
    FOR VALUES FROM ('2025-04-01') TO ('2025-05-01');

CREATE TABLE messages_2025_05 PARTITION OF messages
    FOR VALUES FROM ('2025-05-01') TO ('2025-06-01');

CREATE TABLE messages_2025_06 PARTITION OF messages
    FOR VALUES FROM ('2025-06-01') TO ('2025-07-01');

CREATE TABLE messages_2025_07 PARTITION OF messages
    FOR VALUES FROM ('2025-07-01') TO ('2025-08-01');

CREATE TABLE messages_2025_08 PARTITION OF messages
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

CREATE TABLE messages_2025_09 PARTITION OF messages
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

CREATE TABLE messages_2025_10 PARTITION OF messages
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE messages_2025_11 PARTITION OF messages
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

CREATE TABLE messages_2025_12 PARTITION OF messages
    FOR VALUES FROM ('2025-12-01') TO ('2026-01-01');

-- 索引
CREATE INDEX idx_messages_conv_id ON messages(conversation_id);
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_conv_created ON messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_reply_to ON messages(reply_to_id);
CREATE INDEX idx_messages_type ON messages(message_type);
```

#### message_receipts (消息回执表)

```sql
CREATE TABLE message_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 状态: 0:未送达, 1:已送达, 2:已读
    status SMALLINT DEFAULT 0,
    
    -- 时间戳
    delivered_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    
    UNIQUE (message_id, user_id)
);

-- 索引
CREATE INDEX idx_receipts_message_id ON message_receipts(message_id);
CREATE INDEX idx_receipts_user_id ON message_receipts(user_id);
CREATE INDEX idx_receipts_status ON message_receipts(status);
CREATE INDEX idx_receipts_msg_status ON message_receipts(message_id, status);
```

### 4.4 朋友圈表

#### posts (动态表)

```sql
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 动态内容
    content TEXT,
    visibility SMALLINT DEFAULT 0, -- 0:公开, 1:仅好友, 2:私密, 3:指定可见
    
    -- 媒体内容
    media_urls TEXT[],
    media_metadata JSONB,
    
    -- 位置信息
    location_name VARCHAR(255),
    location_coords POINT,
    
    -- 互动统计（冗余字段，提升查询性能）
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,
    share_count INTEGER DEFAULT 0,
    
    -- 状态
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_visibility ON posts(visibility);
CREATE INDEX idx_posts_is_deleted ON posts(is_deleted);
CREATE INDEX idx_posts_hot ON posts(created_at DESC)
    WHERE is_deleted = FALSE AND like_count > 10;
```

#### post_visibility (动态可见性控制表)

```sql
CREATE TABLE post_visibility (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    UNIQUE (post_id, user_id)
);

-- 索引
CREATE INDEX idx_post_visibility_post ON post_visibility(post_id);
CREATE INDEX idx_post_visibility_user ON post_visibility(user_id);
```

#### post_likes (点赞表)

```sql
CREATE TABLE post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE (post_id, user_id)
);

-- 索引
CREATE INDEX idx_post_likes_post ON post_likes(post_id);
CREATE INDEX idx_post_likes_user ON post_likes(user_id);
CREATE INDEX idx_post_likes_created ON post_likes(created_at DESC);
```

#### comments (评论表)

```sql
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES comments(id), -- 回复评论
    
    -- 评论内容
    content TEXT NOT NULL,
    
    -- 点赞统计
    like_count INTEGER DEFAULT 0,
    reply_count INTEGER DEFAULT 0,
    
    -- 状态
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_comments_post ON comments(post_id);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_id);
CREATE INDEX idx_comments_created ON comments(created_at DESC);
```

#### comment_likes (评论点赞表)

```sql
CREATE TABLE comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE (comment_id, user_id)
);

-- 索引
CREATE INDEX idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX idx_comment_likes_user ON comment_likes(user_id);
```

### 4.5 通知表

#### notifications (通知表)

```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 通知类型: friend_request, friend_accepted, message, like, comment, mention, system
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    
    -- 相关信息
    actor_id UUID REFERENCES users(id), -- 触发用户
    target_id UUID, -- 相关对象ID（post_id, comment_id等）
    data JSONB, -- 额外数据
    
    -- 状态
    is_read BOOLEAN DEFAULT FALSE,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);
CREATE INDEX idx_notifications_is_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created ON notifications(created_at DESC);
```

### 4.6 媒体表

#### media_files (媒体文件表)

```sql
CREATE TABLE media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- 文件基本信息
    filename VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255),
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    
    -- 存储信息
    storage_provider VARCHAR(50) DEFAULT 'minio', -- minio, oss, cos, local
    storage_path TEXT NOT NULL, -- 对象存储路径
    cdn_url TEXT NOT NULL, -- CDN访问URL
    
    -- 缩略图URL
    thumbnail_url TEXT,
    thumbnail_paths JSONB, -- 多尺寸缩略图:{"small": "...", "medium": "...", "large": "..."}
    
    -- 媒体元数据
    metadata JSONB, -- {"width": 1920, "height": 1080, "duration": 30, "format": "mp4"}
    
    -- 使用场景
    usage_type VARCHAR(50), -- avatar, post, message, chat_background
    reference_type VARCHAR(50), -- post, message, comment
    reference_id UUID,
    
    -- 状态
    is_processed BOOLEAN DEFAULT FALSE, -- 是否已完成处理(转码、缩略图生成)
    is_deleted BOOLEAN DEFAULT FALSE,
    
    -- 访问控制
    access_count INTEGER DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_media_files_user ON media_files(user_id);
CREATE INDEX idx_media_files_usage ON media_files(usage_type);
CREATE INDEX idx_media_files_reference ON media_files(reference_type, reference_id);
CREATE INDEX idx_media_files_created ON media_files(created_at DESC);
CREATE INDEX idx_media_files_mime ON media_files(mime_type);
CREATE INDEX idx_media_files_is_deleted ON media_files(is_deleted);
```

---

## 5. 索引设计

### 5.1 索引策略

| 索引类型 | 用途 | 示例 |
|---------|------|------|
| 唯一索引 | 确保字段唯一性 | username, email |
| 单列索引 | 加速单字段查询 | user_id, created_at |
| 复合索引 | 加速多字段查询 | (user_id, conversation_id) |
| 部分索引 | 索引特定条件的数据 | WHERE is_deleted = FALSE |
| GIN索引 | 全文搜索、数组搜索 | content, media_urls |

### 5.2 核心索引

```sql
-- 用户认证索引
CREATE INDEX CONCURRENTLY idx_users_auth ON users(username, password_hash)
    WHERE status = 0;

-- 好友查询索引
CREATE INDEX CONCURRENTLY idx_friendships_active ON friendships(user_a_id, user_b_id)
    WHERE status = 0;

-- 消息查询索引
CREATE INDEX CONCURRENTLY idx_messages_active ON messages(conversation_id, created_at DESC)
    WHERE is_deleted = FALSE;

-- 未读消息索引
CREATE INDEX CONCURRENTLY idx_conv_members_unread_conv ON conversation_members(user_id, conversation_id)
    WHERE unread_count > 0;

-- Feed查询索引
CREATE INDEX CONCURRENTLY idx_posts_feed ON posts(user_id, created_at DESC)
    WHERE is_deleted = FALSE AND visibility IN (0, 1);

-- 热门动态索引
CREATE INDEX CONCURRENTLY idx_posts_hot ON posts(created_at DESC)
    WHERE is_deleted = FALSE AND like_count > 10 AND created_at > NOW() - INTERVAL '7 days';

-- 评论查询索引
CREATE INDEX CONCURRENTLY idx_comments_post_created ON comments(post_id, created_at DESC)
    WHERE is_deleted = FALSE;
```

---

## 6. 视图设计

### 6.1 用户Feed视图

```sql
CREATE VIEW vw_user_friends_feed AS
SELECT 
    p.id,
    p.user_id,
    p.content,
    p.media_urls,
    p.like_count,
    p.comment_count,
    p.created_at,
    u.username,
    u.nickname,
    u.avatar_url
FROM posts p
JOIN users u ON p.user_id = u.id
WHERE p.is_deleted = FALSE
  AND p.visibility IN (0, 1) -- 公开或仅好友可见
  AND p.created_at > NOW() - INTERVAL '30 days';
```

### 6.2 会话列表视图

```sql
CREATE VIEW vw_conversations_list AS
SELECT 
    c.id,
    c.type,
    c.name,
    c.avatar_url,
    cm.user_id AS current_user_id,
    cm.unread_count,
    cm.last_read_message_id,
    m.id AS last_message_id,
    m.content AS last_message_content,
    m.message_type AS last_message_type,
    m.created_at AS last_message_at,
    u.username AS last_message_username,
    u.avatar_url AS last_message_avatar
FROM conversations c
JOIN conversation_members cm ON c.id = cm.conversation_id
LEFT JOIN messages m ON 
    c.id = m.conversation_id 
    AND m.id = (
        SELECT MAX(id) 
        FROM messages 
        WHERE conversation_id = c.id
    )
LEFT JOIN users u ON m.sender_id = u.id
WHERE cm.unread_count >= 0 OR m.created_at IS NOT NULL;
```

---

## 7. 存储过程和函数

### 7.1 更新未读消息数

```sql
CREATE OR REPLACE FUNCTION update_unread_count(p_conversation_id UUID, p_sender_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE conversation_members
    SET unread_count = unread_count + 1
    WHERE conversation_id = p_conversation_id
      AND user_id != p_sender_id;
END;
$$ LANGUAGE plpgsql;
```

### 7.2 获取共同好友

```sql
CREATE OR REPLACE FUNCTION get_mutual_friends(p_user_id1 UUID, p_user_id2 UUID)
RETURNS TABLE (friend_id UUID, username VARCHAR, nickname VARCHAR) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        CASE 
            WHEN f1.user_a_id = p_user_id1 THEN f1.user_b_id
            ELSE f1.user_a_id
        END AS friend_id,
        u.username,
        u.nickname
    FROM friendships f1
    JOIN friendships f2 ON 
        ((f1.user_a_id = p_user_id1 AND f2.user_a_id = p_user_id2) OR
         (f1.user_a_id = p_user_id2 AND f2.user_a_id = p_user_id1))
        AND f1.user_b_id = f2.user_b_id
    JOIN users u ON CASE 
            WHEN f1.user_a_id = p_user_id1 THEN f1.user_b_id
            ELSE f1.user_a_id
        END = u.id
    WHERE f1.status = 0 AND f2.status = 0;
END;
$$ LANGUAGE plpgsql;
```

### 7.3 生成用户Feed

```sql
CREATE OR REPLACE FUNCTION generate_user_feed(p_user_id UUID)
RETURNS void AS $$
BEGIN
    INSERT INTO user_feed (user_id, post_id, created_at)
    SELECT 
        p_user_id,
        p.id,
        p.created_at
    FROM posts p
    WHERE p.user_id IN (
        -- 好友的帖子
        SELECT CASE 
                WHEN user_a_id = p_user_id THEN user_b_id 
                ELSE user_a_id 
            END AS friend_id 
        FROM friendships 
        WHERE (user_a_id = p_user_id OR user_b_id = p_user_id) 
          AND status = 0
        
        UNION
        
        -- 自己的帖子
        SELECT p_user_id
    )
    AND p.visibility IN (0, 1) -- 公开或仅好友可见
    AND p.is_deleted = FALSE
    AND NOT EXISTS (
        -- 避免重复插入
        SELECT 1 FROM user_feed uf 
        WHERE uf.user_id = p_user_id AND uf.post_id = p.id
    )
    ON CONFLICT (user_id, post_id) DO NOTHING;
END;
$$ LANGUAGE plpgsql;
```

---

## 8. 数据迁移

### 8.1 迁移脚本命名

```
YYYYMMDD_descriptive_name.sql

示例：
20250107_create_users_table.sql
20250107_create_friendships_table.sql
20250107_add_index_to_users_table.sql
```

### 8.2 初始化迁移

```sql
-- migrations/20250107_init.sql

-- 创建扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 创建函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建用户表
CREATE TABLE users (...);
CREATE INDEX idx_users_username ON users(username);
...

-- 创建其他表...
```

### 8.3 迁移执行

```bash
# 生成迁移
npm run migration:generate -- -n AddFieldToUsers

# 执行迁移
npm run migration:run

# 回滚迁移
npm run migration:revert
```

---

## 9. 性能优化

### 9.1 查询优化

**优化前：**
```sql
SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT 50;
```

**优化后：**
```sql
SELECT * FROM messages_2025_01 
WHERE conversation_id = ? 
  AND is_deleted = FALSE 
ORDER BY created_at DESC 
LIMIT 50;
```

### 9.2 连接池配置

```typescript
// database.service.ts
this.pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'chat_user',
  password: 'chat_password',
  database: 'chat_backend',
  max: 20, // 最大连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### 9.3 缓存策略

**缓存热门用户信息：**
```sql
-- 缓存键: user:{user_id}:profile
-- TTL: 1小时
```

**缓存好友列表：**
```sql
-- 缓存键: user:{user_id}:friends
-- TTL: 30分钟
-- 失效时机: 添加/删除好友时
```

---

## 10. 备份和恢复

### 10.1 备份策略

**每日全量备份：**
```bash
pg_dump -U chat_user -h localhost -d chat_backend -f backup_$(date +%Y%m%d).sql
```

**每小时增量备份：**
```bash
pg_dump -U chat_user -h localhost -d chat_backend --format=custom -f incremental_$(date +%Y%m%d_%H).dump
```

### 10.2 恢复策略

**全量恢复：**
```bash
psql -U chat_user -h localhost -d chat_backend -f backup_20250107.sql
```

### 10.3 备份保留

- 每日备份保留7天
- 每周备份保留4周
- 每月备份保留12个月

---

## 附录

### A. 数据字典

**表名**: users
**描述**: 用户账户信息

| 字段名 | 类型 | 约束 | 说明 |
|--------|------|--------|------|
| id | UUID | PK | 用户唯一标识 |
| username | VARCHAR(32) | NOT NULL, UNIQUE | 用户名 |
| email | VARCHAR(255) | NOT NULL, UNIQUE | 电子邮箱 |
| password_hash | VARCHAR(255) | NOT NULL | 密码哈希 |
| nickname | VARCHAR(64) | NULL | 昵称 |
| avatar_url | TEXT | NULL | 头像URL |
| created_at | TIMESTAMP | NOT NULL, DEFAULT NOW() | 创建时间 |

### B. ER图

见"第3章 数据模型"

### C. 数据容量估算

| 表名 | 单条数据量 | 预估记录数 | 总容量 |
|--------|-----------|-----------|--------|
| users | ~500B | 1,000,000 | ~500MB |
| messages | ~1KB | 1,000,000,000 | ~1TB |
| posts | ~2KB | 100,000,000 | ~200GB |
| comments | ~500B | 500,000,000 | ~250GB |
| media_files | ~100B | 500,000,000 | ~50GB |

**总计**: ~2TB (3年)

---

**文档审批**:

| 角色 | 姓名 | 签名 | 日期 |
|------|------|------|------|
| 数据库架构师 | | | |
| 技术负责人 | | | |
| 项目经理 | | | |
