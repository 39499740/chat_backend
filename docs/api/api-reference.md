# API 参考文档

本文档提供了聊天社交应用后端系统的 API 接口参考信息。

## 在线 API 文档

系统使用 [Swagger](https://swagger.io/) 自动生成交互式 API 文档。

### 访问方式

启动应用后，访问以下 URL：

```
http://localhost:3000/api
```

### 功能特性

- **完整的接口列表**：所有 API 端点按模块组织
- **交互式测试**：直接在浏览器中测试 API
- **参数验证**：显示每个接口的请求/响应参数
- **认证支持**：支持 JWT Token 认证
- **示例数据**：提供请求和响应示例

## API 端点分类

### 1. 认证模块 (Auth)

#### 端点列表

| 方法 | 路径                    | 描述         |
| ---- | ----------------------- | ------------ |
| POST | `/auth/register`        | 用户注册     |
| POST | `/auth/login`           | 用户登录     |
| POST | `/auth/logout`          | 用户登出     |
| POST | `/auth/refresh`         | 刷新访问令牌 |
| POST | `/auth/verify-email`    | 验证邮箱     |
| POST | `/auth/forgot-password` | 忘记密码     |
| POST | `/auth/reset-password`  | 重置密码     |

#### 认证方式

系统使用 JWT 双 Token 认证：

- **Access Token**: 用于 API 请求，有效期 15 分钟
- **Refresh Token**: 用于刷新访问令牌，有效期 7 天

在 Swagger UI 中，点击右上角的 **Authorize** 按钮，输入以下格式：

```
Bearer <your-access-token>
```

### 2. 用户模块 (Users)

#### 端点列表

| 方法   | 路径              | 描述             |
| ------ | ----------------- | ---------------- |
| GET    | `/users/me`       | 获取当前用户信息 |
| PATCH  | `/users/me`       | 更新当前用户信息 |
| GET    | `/users/:id`      | 获取指定用户信息 |
| GET    | `/users`          | 搜索用户         |
| PATCH  | `/users/settings` | 更新用户设置     |
| POST   | `/users/avatar`   | 上传头像         |
| DELETE | `/users/avatar`   | 删除头像         |

### 3. 好友模块 (Friends)

#### 端点列表

| 方法   | 路径                            | 描述             |
| ------ | ------------------------------- | ---------------- |
| POST   | `/friends/request`              | 发送好友请求     |
| GET    | `/friends/requests`             | 获取好友请求列表 |
| POST   | `/friends/requests/:id/accept`  | 接受好友请求     |
| POST   | `/friends/requests/:id/decline` | 拒绝好友请求     |
| DELETE | `/friends/:id`                  | 删除好友         |
| GET    | `/friends`                      | 获取好友列表     |
| POST   | `/blocked`                      | 拉黑用户         |
| DELETE | `/blocked/:id`                  | 取消拉黑         |
| GET    | `/blocked`                      | 获取黑名单       |

### 4. 会话模块 (Conversations)

#### 端点列表

| 方法   | 路径                                 | 描述         |
| ------ | ------------------------------------ | ------------ |
| GET    | `/conversations`                     | 获取会话列表 |
| POST   | `/conversations`                     | 创建会话     |
| GET    | `/conversations/:id`                 | 获取会话详情 |
| PATCH  | `/conversations/:id`                 | 更新会话信息 |
| DELETE | `/conversations/:id`                 | 删除会话     |
| POST   | `/conversations/:id/members`         | 添加会话成员 |
| DELETE | `/conversations/:id/members/:userId` | 移除会话成员 |

### 5. 聊天模块 (Chat)

#### 端点列表

| 方法   | 路径                             | 描述             |
| ------ | -------------------------------- | ---------------- |
| GET    | `/chat/:conversationId/messages` | 获取消息列表     |
| POST   | `/chat/:conversationId/messages` | 发送消息         |
| PATCH  | `/chat/messages/:id`             | 更新消息         |
| DELETE | `/chat/messages/:id`             | 删除消息         |
| POST   | `/chat/messages/:id/read`        | 标记消息已读     |
| POST   | `/chat/:conversationId/typing`   | 发送正在输入状态 |

#### 消息类型

- **TEXT**: 文字消息
- **IMAGE**: 图片消息
- **AUDIO**: 音频消息
- **VIDEO**: 视频消息
- **EMOJI**: 表情消息
- **FILE**: 文件消息

### 6. 朋友圈模块 (Moments)

#### 端点列表

| 方法   | 路径                         | 描述               |
| ------ | ---------------------------- | ------------------ |
| GET    | `/moments`                   | 获取朋友圈动态列表 |
| POST   | `/moments`                   | 发布动态           |
| GET    | `/moments/:id`               | 获取动态详情       |
| PATCH  | `/moments/:id`               | 更新动态           |
| DELETE | `/moments/:id`               | 删除动态           |
| POST   | `/moments/:id/like`          | 点赞动态           |
| DELETE | `/moments/:id/like`          | 取消点赞           |
| GET    | `/moments/:id/comments`      | 获取评论列表       |
| POST   | `/moments/:id/comments`      | 添加评论           |
| PATCH  | `/moments/comments/:id`      | 更新评论           |
| DELETE | `/moments/comments/:id`      | 删除评论           |
| POST   | `/moments/comments/:id/like` | 点赞评论           |
| DELETE | `/moments/comments/:id/like` | 取消点赞评论       |

### 7. 通知模块 (Notifications)

#### 端点列表

| 方法   | 路径                          | 描述             |
| ------ | ----------------------------- | ---------------- |
| GET    | `/notifications`              | 获取通知列表     |
| GET    | `/notifications/unread-count` | 获取未读通知数   |
| POST   | `/notifications/:id/read`     | 标记通知已读     |
| POST   | `/notifications/read-all`     | 标记所有通知已读 |
| DELETE | `/notifications/:id`          | 删除通知         |

#### 通知类型

- **FRIEND_REQUEST**: 好友请求
- **FRIEND_ACCEPTED**: 好友请求被接受
- **FRIEND_DECLINED**: 好友请求被拒绝
- **POST_LIKE**: 帖子被点赞
- **POST_COMMENT**: 帖子被评论
- **COMMENT_LIKE**: 评论被点赞
- **MENTION**: 被提及
- **MESSAGE**: 新消息
- **CALL_REQUEST**: 通话请求
- **CALL_MISSED**: 未接来电
- **SYSTEM**: 系统通知

### 8. 搜索模块 (Search)

#### 端点列表

| 方法 | 路径                  | 描述     |
| ---- | --------------------- | -------- |
| GET  | `/search`             | 全文搜索 |
| GET  | `/search/suggestions` | 搜索建议 |

#### 搜索类型

- **users**: 搜索用户
- **posts**: 搜索帖子
- **messages**: 搜索消息
- **conversations**: 搜索会话

### 9. 文件上传模块 (Uploads)

#### 端点列表

| 方法 | 路径             | 描述     |
| ---- | ---------------- | -------- |
| POST | `/uploads/image` | 上传图片 |
| POST | `/uploads/video` | 上传视频 |
| POST | `/uploads/audio` | 上传音频 |
| POST | `/uploads/file`  | 上传文件 |

### 10. WebRTC 模块 (Video Call)

#### 端点列表

| 方法 | 路径                    | 描述            |
| ---- | ----------------------- | --------------- |
| POST | `/webrtc/call`          | 发起通话        |
| POST | `/webrtc/answer`        | 接听通话        |
| POST | `/webrtc/decline`       | 拒绝通话        |
| POST | `/webrtc/end`           | 结束通话        |
| POST | `/webrtc/ice-candidate` | 交换 ICE 候选者 |

## 通用请求/响应格式

### 分页参数

所有列表接口支持分页：

```typescript
{
  page: number; // 页码，从 1 开始
  limit: number; // 每页数量，默认 20
}
```

### 统一响应格式

**成功响应：**

```json
{
  "success": true,
  "data": {
    /* 实际数据 */
  },
  "message": "操作成功"
}
```

**错误响应：**

```json
{
  "success": false,
  "statusCode": 400,
  "message": "错误信息",
  "error": "错误类型"
}
```

### 状态码

| 状态码 | 描述         |
| ------ | ------------ |
| 200    | 请求成功     |
| 201    | 创建成功     |
| 400    | 请求参数错误 |
| 401    | 未认证       |
| 403    | 无权限       |
| 404    | 资源不存在   |
| 409    | 资源冲突     |
| 500    | 服务器错误   |

## WebSocket 事件

### 连接

```javascript
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token',
  },
});
```

### 事件列表

| 事件名             | 方向            | 描述       |
| ------------------ | --------------- | ---------- |
| `connect`          | Server → Client | 连接成功   |
| `disconnect`       | Server → Client | 断开连接   |
| `message:new`      | Server → Client | 新消息     |
| `message:read`     | Server → Client | 消息已读   |
| `notification:new` | Server → Client | 新通知     |
| `user:online`      | Server → Client | 用户上线   |
| `user:offline`     | Server → Client | 用户离线   |
| `typing:start`     | Client/Server   | 开始输入   |
| `typing:stop`      | Client/Server   | 停止输入   |
| `call:incoming`    | Server → Client | 来电通知   |
| `call:accepted`    | Server → Client | 通话已接听 |
| `call:declined`    | Server → Client | 通话已拒绝 |
| `call:ended`       | Server → Client | 通话已结束 |

## 速率限制

所有 API 接口受速率限制保护：

- 默认限制：每个 IP 每分钟 100 次请求
- 超过限制返回 HTTP 429
- 响应头包含限制信息：
  - `X-RateLimit-Limit`: 限制总数
  - `X-RateLimit-Remaining`: 剩余次数
  - `X-RateLimit-Reset`: 重置时间

## 错误处理

### 常见错误

| 错误码                | 描述               | 解决方案                 |
| --------------------- | ------------------ | ------------------------ |
| INVALID_CREDENTIALS   | 用户名或密码错误   | 检查登录凭证             |
| USER_NOT_FOUND        | 用户不存在         | 确认用户 ID 正确         |
| USER_ALREADY_EXISTS   | 用户已存在         | 使用其他用户名/邮箱      |
| INVALID_TOKEN         | Token 无效或已过期 | 重新登录获取新 Token     |
| FORBIDDEN             | 无权限访问         | 检查权限设置             |
| FRIEND_REQUEST_EXISTS | 好友请求已存在     | 等待对方处理             |
| ALREADY_FRIENDS       | 已经是好友         | 无需再次添加             |
| FILE_TOO_LARGE        | 文件过大           | 压缩文件或上传较小的文件 |
| INVALID_FILE_TYPE     | 文件类型不支持     | 检查文件格式             |

### 错误响应示例

```json
{
  "success": false,
  "statusCode": 400,
  "message": ["username must be a string", "email must be an email"],
  "error": "Bad Request"
}
```

## 使用示例

### 使用 cURL

```bash
# 登录
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"password123"}'

# 获取用户信息
curl -X GET http://localhost:3000/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### 使用 Axios

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3000',
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

// 登录
const login = async (username: string, password: string) => {
  const response = await api.post('/auth/login', { username, password });
  return response.data;
};

// 获取用户信息
const getUserInfo = async () => {
  const response = await api.get('/users/me');
  return response.data;
};
```

### 使用 Swagger UI

1. 访问 http://localhost:3000/api
2. 点击任意接口展开详情
3. 点击 **Try it out** 按钮
4. 填写请求参数
5. 点击 **Execute** 执行请求
6. 查看 Response 中的结果

## 更多信息

- [开发者使用手册](../developer-guide.md)
- [详细设计文档](../design/detailed-design.md)
- [部署文档和运维手册](../deployment/deployment-and-operations.md)

---

**文档版本**: v1.0
**最后更新**: 2026-01-08
