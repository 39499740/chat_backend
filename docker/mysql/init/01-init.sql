-- ========================================
-- 数据库初始化脚本
-- 项目: 微信类社交应用后端系统
-- 数据库: MySQL 8.0
-- 版本: 1.0
-- ========================================

-- ========================================
-- 用户系统表
-- ========================================

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id CHAR(36) PRIMARY KEY,
    -- 认证信息
    username VARCHAR(32) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    -- 个人资料
    nickname VARCHAR(64),
    avatar_url TEXT,
    bio TEXT,
    gender TINYINT DEFAULT 0 CHECK (gender IN (0, 1, 2)), -- 0:未知, 1:男, 2:女
    birth_date DATE,
    region VARCHAR(100),
    -- 账户状态
    status TINYINT DEFAULT 0, -- 0:正常, 1:禁用, 2:已删除
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    -- 时间戳
    last_login_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_users_username (username),
    INDEX idx_users_email (email),
    INDEX idx_users_phone (phone),
    INDEX idx_users_status (status),
    INDEX idx_users_created_at (created_at DESC)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户会话表
CREATE TABLE IF NOT EXISTS user_sessions (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    -- 会话信息
    token VARCHAR(500) NOT NULL UNIQUE,
    refresh_token VARCHAR(500),
    device_type VARCHAR(50), -- iOS, Android, Web
    device_id VARCHAR(100),
    ip_address VARCHAR(45),
    user_agent TEXT,
    -- 过期时间
    expires_at TIMESTAMP NOT NULL,
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_accessed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_sessions_user_id (user_id),
    INDEX idx_sessions_token (token(100)),
    INDEX idx_sessions_expires_at (expires_at),
    INDEX idx_sessions_user_expires (user_id, expires_at),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 用户设置表
CREATE TABLE IF NOT EXISTS user_settings (
    user_id CHAR(36) PRIMARY KEY,
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 社交系统表
-- ========================================

-- 好友关系表
CREATE TABLE IF NOT EXISTS friendships (
    id CHAR(36) PRIMARY KEY,
    user_a_id CHAR(36) NOT NULL,
    user_b_id CHAR(36) NOT NULL,
    -- 关系状态
    status TINYINT DEFAULT 0, -- 0:已建立, 1:已删除
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_friendships_user_a (user_a_id),
    INDEX idx_friendships_user_b (user_b_id),
    INDEX idx_friendships_status (status),
    FOREIGN KEY (user_a_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (user_b_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_friendship_pair (user_a_id, user_b_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 好友请求表
CREATE TABLE IF NOT EXISTS friend_requests (
    id CHAR(36) PRIMARY KEY,
    requester_id CHAR(36) NOT NULL,
    receiver_id CHAR(36) NOT NULL,
    -- 请求状态
    status TINYINT DEFAULT 0, -- 0:待处理, 1:已接受, 2:已拒绝
    message TEXT,
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_friend_requests_requester (requester_id),
    INDEX idx_friend_requests_receiver (receiver_id),
    INDEX idx_friend_requests_status (status),
    FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_friend_request (requester_id, receiver_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 黑名单表
CREATE TABLE IF NOT EXISTS blocked_users (
    id CHAR(36) PRIMARY KEY,
    blocker_id CHAR(36) NOT NULL,
    blocked_id CHAR(36) NOT NULL,
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_blocked_blocker (blocker_id),
    INDEX idx_blocked_blocked (blocked_id),
    FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (blocked_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_blocked (blocker_id, blocked_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 聊天系统表
-- ========================================

-- 会话表
CREATE TABLE IF NOT EXISTS conversations (
    id CHAR(36) PRIMARY KEY,
    -- 会话类型
    type TINYINT NOT NULL, -- 0:单聊, 1:群聊
    -- 会话信息
    name VARCHAR(100),
    avatar_url TEXT,
    owner_id CHAR(36),
    -- 时间戳
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_conversations_type (type),
    INDEX idx_conversations_owner (owner_id),
    INDEX idx_conversations_updated (updated_at DESC),
    FOREIGN KEY (owner_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 会话成员表
CREATE TABLE IF NOT EXISTS conversation_members (
    id CHAR(36) PRIMARY KEY,
    conversation_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    -- 成员角色
    role TINYINT DEFAULT 0, -- 0:普通成员, 1:管理员, 2:群主
    -- 最后阅读时间
    last_read_at TIMESTAMP NULL,
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_conv_members_conv (conversation_id),
    INDEX idx_conv_members_user (user_id),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_conversation_member (conversation_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 消息表
CREATE TABLE IF NOT EXISTS messages (
    id CHAR(36) PRIMARY KEY,
    conversation_id CHAR(36) NOT NULL,
    sender_id CHAR(36) NOT NULL,
    -- 消息内容
    content TEXT,
    message_type TINYINT DEFAULT 0, -- 0:文本, 1:图片, 2:语音, 3:视频, 4:表情, 5:文件
    -- 消息状态
    is_deleted BOOLEAN DEFAULT FALSE,
    reply_to_id CHAR(36),
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_messages_conv (conversation_id),
    INDEX idx_messages_sender (sender_id),
    INDEX idx_messages_created (created_at DESC),
    INDEX idx_messages_type (message_type),
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (reply_to_id) REFERENCES messages(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 消息回执表
CREATE TABLE IF NOT EXISTS message_receipts (
    id CHAR(36) PRIMARY KEY,
    message_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    -- 回执状态
    status TINYINT DEFAULT 0, -- 0:已发送, 1:已送达, 2:已阅读
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_receipts_message (message_id),
    INDEX idx_receipts_user (user_id),
    FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_message_receipt (message_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 朋友圈系统表
-- ========================================

-- 动态表
CREATE TABLE IF NOT EXISTS posts (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    -- 动态内容
    content TEXT,
    media_urls JSON, -- 图片/视频 URL 数组（JSON格式）
    location TEXT,
    -- 可见性
    visibility TINYINT DEFAULT 0, -- 0:公开, 1:仅好友, 2:私密
    -- 状态
    is_deleted BOOLEAN DEFAULT FALSE,
    -- 统计数据（冗余字段，提升查询性能）
    like_count INT DEFAULT 0,
    comment_count INT DEFAULT 0,
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_posts_user (user_id),
    INDEX idx_posts_created (created_at DESC),
    INDEX idx_posts_visibility (visibility),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 点赞表
CREATE TABLE IF NOT EXISTS post_likes (
    id CHAR(36) PRIMARY KEY,
    post_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_post_likes_post (post_id),
    INDEX idx_post_likes_user (user_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_post_like (post_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 评论表
CREATE TABLE IF NOT EXISTS comments (
    id CHAR(36) PRIMARY KEY,
    post_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    -- 评论内容
    content TEXT NOT NULL,
    parent_id CHAR(36), -- 支持回复评论
    -- 状态
    is_deleted BOOLEAN DEFAULT FALSE,
    -- 统计数据（冗余字段，提升查询性能）
    like_count INT DEFAULT 0,
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_comments_post (post_id),
    INDEX idx_comments_user (user_id),
    INDEX idx_comments_parent (parent_id),
    INDEX idx_comments_created (created_at DESC),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 评论点赞表
CREATE TABLE IF NOT EXISTS comment_likes (
    id CHAR(36) PRIMARY KEY,
    comment_id CHAR(36) NOT NULL,
    user_id CHAR(36) NOT NULL,
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_comment_likes_comment (comment_id),
    INDEX idx_comment_likes_user (user_id),
    FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY uk_comment_like (comment_id, user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 通知系统表
-- ========================================

-- 通知表
CREATE TABLE IF NOT EXISTS notifications (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    -- 通知内容
    type TINYINT NOT NULL, -- 0:系统通知, 1:好友请求, 2:点赞, 3:评论, 4:消息
    title TEXT NOT NULL,
    content TEXT,
    -- 关联对象
    related_id CHAR(36),
    related_type VARCHAR(50),
    -- 状态
    is_read BOOLEAN DEFAULT FALSE,
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_notifications_user (user_id),
    INDEX idx_notifications_type (type),
    INDEX idx_notifications_is_read (is_read),
    INDEX idx_notifications_created (created_at DESC),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 媒体系统表
-- ========================================

-- 媒体文件表
CREATE TABLE IF NOT EXISTS media_files (
    id CHAR(36) PRIMARY KEY,
    user_id CHAR(36) NOT NULL,
    -- 文件信息
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(50) NOT NULL, -- image/jpeg, video/mp4, audio/mp3 等
    file_size BIGINT NOT NULL,
    file_url TEXT NOT NULL,
    -- 缩略图
    thumbnail_url TEXT,
    -- 媒体类型
    media_type TINYINT NOT NULL, -- 0:图片, 1:视频, 2:音频, 3:文件
    -- 时间戳
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_media_files_user (user_id),
    INDEX idx_media_files_type (media_type),
    INDEX idx_media_files_created (created_at DESC),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 通话记录表 (call_records)
-- ========================================
CREATE TABLE IF NOT EXISTS call_records (
    id CHAR(36) PRIMARY KEY,
    caller_id CHAR(36) NOT NULL,
    callee_id CHAR(36) NOT NULL,
    conversation_id CHAR(36),
    -- 通话类型
    call_type VARCHAR(10) NOT NULL, -- 'audio' 或 'video'
    -- 通话状态
    status VARCHAR(20) NOT NULL, -- 'calling', 'ringing', 'accepted', 'declined', 'ended', 'failed'
    -- 时间信息
    started_at TIMESTAMP NOT NULL,
    ended_at TIMESTAMP NULL,
    duration INT, -- 通话时长（秒）
    -- 额外信息
    metadata JSON, -- 存储额外的通话信息（如网络质量、设备信息等）
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_call_records_caller (caller_id),
    INDEX idx_call_records_callee (callee_id),
    INDEX idx_call_records_conversation (conversation_id),
    INDEX idx_call_records_started (started_at DESC),
    FOREIGN KEY (caller_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (callee_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================
-- 初始化完成
-- ========================================

-- 输出初始化完成信息
SELECT '数据库初始化完成！' AS message;
SELECT '已创建所有表、索引和外键。' AS message;
