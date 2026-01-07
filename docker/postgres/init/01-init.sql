-- ========================================
-- 数据库初始化脚本
-- 项目: 微信类社交应用后端系统
-- 数据库: PostgreSQL 16
-- 版本: 1.0
-- ========================================

-- 启用 UUID 扩展
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

-- ========================================
-- 用户系统表
-- ========================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
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

-- 触发器：自动更新 users 表的 updated_at
DROP TRIGGER IF EXISTS trigger_users_updated_at ON users;
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 索引：users 表
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);

-- 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
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

-- 索引：user_sessions 表
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_sessions_user_expires ON user_sessions(user_id, expires_at);

-- 用户设置表
CREATE TABLE IF NOT EXISTS user_settings (
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 触发器：自动更新 user_settings 表的 updated_at
DROP TRIGGER IF EXISTS trigger_user_settings_updated_at ON user_settings;
CREATE TRIGGER trigger_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ========================================
-- 社交系统表
-- ========================================

-- 好友关系表
CREATE TABLE IF NOT EXISTS friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_a_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_b_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 关系状态
    status SMALLINT DEFAULT 0, -- 0:已建立, 1:已删除

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 唯一约束：避免重复的好友关系
    CONSTRAINT uk_friendship_pair UNIQUE (user_a_id, user_b_id)
);

-- 触发器：自动更新 friendships 表的 updated_at
DROP TRIGGER IF EXISTS trigger_friendships_updated_at ON friendships;
CREATE TRIGGER trigger_friendships_updated_at
    BEFORE UPDATE ON friendships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 索引：friendships 表
CREATE INDEX IF NOT EXISTS idx_friendships_user_a ON friendships(user_a_id);
CREATE INDEX IF NOT EXISTS idx_friendships_user_b ON friendships(user_b_id);
CREATE INDEX IF NOT EXISTS idx_friendships_status ON friendships(status);

-- 好友请求表
CREATE TABLE IF NOT EXISTS friend_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 请求状态
    status SMALLINT DEFAULT 0, -- 0:待处理, 1:已接受, 2:已拒绝
    message TEXT,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 唯一约束：避免重复的好友请求
    CONSTRAINT uk_friend_request UNIQUE (requester_id, receiver_id)
);

-- 触发器：自动更新 friend_requests 表的 updated_at
DROP TRIGGER IF EXISTS trigger_friend_requests_updated_at ON friend_requests;
CREATE TRIGGER trigger_friend_requests_updated_at
    BEFORE UPDATE ON friend_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 索引：friend_requests 表
CREATE INDEX IF NOT EXISTS idx_friend_requests_requester ON friend_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON friend_requests(receiver_id);
CREATE INDEX IF NOT EXISTS idx_friend_requests_status ON friend_requests(status);

-- 黑名单表
CREATE TABLE IF NOT EXISTS blocked_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 唯一约束：避免重复的黑名单关系
    CONSTRAINT uk_blocked UNIQUE (blocker_id, blocked_id)
);

-- 索引：blocked_users 表
CREATE INDEX IF NOT EXISTS idx_blocked_blocker ON blocked_users(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocked_blocked ON blocked_users(blocked_id);

-- ========================================
-- 聊天系统表
-- ========================================

-- 会话表
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- 会话类型
    type SMALLINT NOT NULL, -- 0:单聊, 1:群聊

    -- 会话信息
    name VARCHAR(100),
    avatar_url TEXT,
    owner_id UUID REFERENCES users(id) ON DELETE SET NULL,

    -- 时间戳
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 触发器：自动更新 conversations 表的 updated_at
DROP TRIGGER IF EXISTS trigger_conversations_updated_at ON conversations;
CREATE TRIGGER trigger_conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 索引：conversations 表
CREATE INDEX IF NOT EXISTS idx_conversations_type ON conversations(type);
CREATE INDEX IF NOT EXISTS idx_conversations_owner ON conversations(owner_id);
CREATE INDEX IF NOT EXISTS idx_conversations_updated ON conversations(updated_at DESC);

-- 会话成员表
CREATE TABLE IF NOT EXISTS conversation_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 成员角色
    role SMALLINT DEFAULT 0, -- 0:普通成员, 1:管理员, 2:群主

    -- 最后阅读时间
    last_read_at TIMESTAMP WITH TIME ZONE,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 唯一约束：一个用户在一个会话中只能有一个成员记录
    CONSTRAINT uk_conversation_member UNIQUE (conversation_id, user_id)
);

-- 触发器：自动更新 conversation_members 表的 updated_at
DROP TRIGGER IF EXISTS trigger_conv_members_updated_at ON conversation_members;
CREATE TRIGGER trigger_conv_members_updated_at
    BEFORE UPDATE ON conversation_members
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 索引：conversation_members 表
CREATE INDEX IF NOT EXISTS idx_conv_members_conv ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_conv_members_user ON conversation_members(user_id);

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 消息内容
    content TEXT,
    message_type SMALLINT DEFAULT 0, -- 0:文本, 1:图片, 2:语音, 3:视频, 4:表情, 5:文件

    -- 消息状态
    is_deleted BOOLEAN DEFAULT FALSE,
    reply_to_id UUID REFERENCES messages(id) ON DELETE SET NULL,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引：messages 表
CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_type ON messages(message_type);

-- 消息回执表
CREATE TABLE IF NOT EXISTS message_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 回执状态
    status SMALLINT DEFAULT 0, -- 0:已发送, 1:已送达, 2:已阅读

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 唯一约束：一个用户对一个消息只能有一个回执
    CONSTRAINT uk_message_receipt UNIQUE (message_id, user_id)
);

-- 索引：message_receipts 表
CREATE INDEX IF NOT EXISTS idx_receipts_message ON message_receipts(message_id);
CREATE INDEX IF NOT EXISTS idx_receipts_user ON message_receipts(user_id);

-- ========================================
-- 朋友圈系统表
-- ========================================

-- 动态表
CREATE TABLE IF NOT EXISTS posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 动态内容
    content TEXT,
    media_urls TEXT[], -- 图片/视频 URL 数组
    location TEXT,

    -- 可见性
    visibility SMALLINT DEFAULT 0, -- 0:公开, 1:仅好友, 2:私密

    -- 状态
    is_deleted BOOLEAN DEFAULT FALSE,

    -- 统计数据（冗余字段，提升查询性能）
    like_count INTEGER DEFAULT 0,
    comment_count INTEGER DEFAULT 0,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 触发器：自动更新 posts 表的 updated_at
DROP TRIGGER IF EXISTS trigger_posts_updated_at ON posts;
CREATE TRIGGER trigger_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 索引：posts 表
CREATE INDEX IF NOT EXISTS idx_posts_user ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_visibility ON posts(visibility);

-- 点赞表
CREATE TABLE IF NOT EXISTS post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 唯一约束：一个用户对一个动态只能点赞一次
    CONSTRAINT uk_post_like UNIQUE (post_id, user_id)
);

-- 索引：post_likes 表
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user ON post_likes(user_id);

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 评论内容
    content TEXT NOT NULL,
    parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- 支持回复评论

    -- 状态
    is_deleted BOOLEAN DEFAULT FALSE,

    -- 统计数据（冗余字段，提升查询性能）
    like_count INTEGER DEFAULT 0,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 触发器：自动更新 comments 表的 updated_at
DROP TRIGGER IF EXISTS trigger_comments_updated_at ON comments;
CREATE TRIGGER trigger_comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 索引：comments 表
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created ON comments(created_at DESC);

-- 评论点赞表
CREATE TABLE IF NOT EXISTS comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID NOT NULL REFERENCES comments(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- 唯一约束：一个用户对一个评论只能点赞一次
    CONSTRAINT uk_comment_like UNIQUE (comment_id, user_id)
);

-- 索引：comment_likes 表
CREATE INDEX IF NOT EXISTS idx_comment_likes_comment ON comment_likes(comment_id);
CREATE INDEX IF NOT EXISTS idx_comment_likes_user ON comment_likes(user_id);

-- ========================================
-- 通知系统表
-- ========================================

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 通知内容
    type SMALLINT NOT NULL, -- 0:系统通知, 1:好友请求, 2:点赞, 3:评论, 4:消息
    title TEXT NOT NULL,
    content TEXT,

    -- 关联对象
    related_id UUID,
    related_type VARCHAR(50),

    -- 状态
    is_read BOOLEAN DEFAULT FALSE,

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引：notifications 表
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications(created_at DESC);

-- ========================================
-- 媒体系统表
-- ========================================

-- 媒体文件表
CREATE TABLE IF NOT EXISTS media_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- 文件信息
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- image/jpeg, video/mp4, audio/mp3 等
    file_size BIGINT NOT NULL,
    file_url TEXT NOT NULL,

    -- 缩略图
    thumbnail_url TEXT,

    -- 媒体类型
    media_type SMALLINT NOT NULL, -- 0:图片, 1:视频, 2:音频, 3:文件

    -- 时间戳
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引：media_files 表
CREATE INDEX IF NOT EXISTS idx_media_files_user ON media_files(user_id);
CREATE INDEX IF NOT EXISTS idx_media_files_type ON media_files(media_type);
CREATE INDEX IF NOT EXISTS idx_media_files_created ON media_files(created_at DESC);

-- ========================================
-- 通话记录表 (call_records)
-- ========================================
CREATE TABLE IF NOT EXISTS call_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    caller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    callee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,

    -- 通话类型
    call_type VARCHAR(10) NOT NULL, -- 'audio' 或 'video'

    -- 通话状态
    status VARCHAR(20) NOT NULL, -- 'calling', 'ringing', 'accepted', 'declined', 'ended', 'failed'

    -- 时间信息
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    duration INTEGER, -- 通话时长（秒）

    -- 额外信息
    metadata JSONB, -- 存储额外的通话信息（如网络质量、设备信息等）

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 索引：call_records 表
CREATE INDEX IF NOT EXISTS idx_call_records_caller ON call_records(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_records_callee ON call_records(callee_id);
CREATE INDEX IF NOT EXISTS idx_call_records_conversation ON call_records(conversation_id);
CREATE INDEX IF NOT EXISTS idx_call_records_started ON call_records(started_at DESC);

-- ========================================
-- 初始化完成
-- ========================================

-- 插入测试用户（可选）
-- INSERT INTO users (username, email, password_hash, nickname, is_active)
-- VALUES ('testuser', 'test@example.com', '$2b$10$test', 'Test User', TRUE);

-- 输出初始化完成信息
DO $$
BEGIN
    RAISE NOTICE '数据库初始化完成！';
    RAISE NOTICE '已创建所有表、索引和触发器。';
END $$;
