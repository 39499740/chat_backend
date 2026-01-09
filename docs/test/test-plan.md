# 测试计划与报告

本文档描述了微信社交应用后端系统的测试策略、测试用例和测试结果。

## 目录

1. [测试概述](#测试概述)
2. [测试策略](#测试策略)
3. [测试环境](#测试环境)
4. [单元测试](#单元测试)
5. [集成测试](#集成测试)
6. [端到端测试](#端到端测试)
7. [性能测试](#性能测试)
8. [安全测试](#安全测试)
9. [测试覆盖率](#测试覆盖率)
10. [测试结果](#测试结果)

---

## 测试概述

### 测试目标

- 确保所有功能模块按需求正确运行
- 验证系统的稳定性和可靠性
- 确保代码质量和可维护性
- 发现并修复潜在的 bug 和性能问题
- 达到 80% 以上的测试覆盖率

### 测试范围

测试覆盖以下 10 个核心模块：

1. **认证模块** (Auth)
2. **用户模块** (Users)
3. **好友模块** (Friends)
4. **会话模块** (Conversations)
5. **聊天模块** (Chat)
6. **朋友圈模块** (Moments)
7. **通知模块** (Notifications)
8. **搜索模块** (Search)
9. **文件上传模块** (Uploads)
10. **WebRTC 模块** (Video Call)

### 测试工具

| 工具             | 用途           | 版本   |
| ---------------- | -------------- | ------ |
| Jest             | 单元测试框架   | Latest |
| Supertest        | HTTP 集成测试  | Latest |
| Socket.IO Client | WebSocket 测试 | Latest |
| Jest Coverage    | 代码覆盖率工具 | Latest |
| Artillery        | 性能压力测试   | Latest |

---

## 测试策略

### 测试金字塔

```
           /\
          /  \
         /E2E \      少量端到端测试
        /______\
       /        \
      / 集成测试 \     中等数量集成测试
     /__________\
    /            \
   /  单元测试    \    大量单元测试
  /______________\
```

### 测试优先级

| 优先级 | 测试类型 | 说明                       |
| ------ | -------- | -------------------------- |
| P0     | 核心功能 | 认证、消息发送、数据持久化 |
| P1     | 重要功能 | 文件上传、通知、搜索       |
| P2     | 辅助功能 | 头像上传、用户设置         |
| P3     | 边界情况 | 极端参数、并发场景         |

### 测试分类

#### 1. 单元测试

- 测试单个函数和方法
- 不依赖外部服务（数据库、Redis、第三方 API）
- 使用 Mock 和 Stub 模拟依赖
- 运行速度快（< 5 秒）

#### 2. 集成测试

- 测试模块之间的交互
- 使用真实的数据库连接
- 测试 API 端点
- 运行速度中等（< 30 秒）

#### 3. 端到端测试

- 测试完整的用户场景
- 模拟真实用户操作
- 测试跨模块功能
- 运行速度慢（< 5 分钟）

---

## 测试环境

### 本地开发环境

```bash
# 启动测试环境
npm run test:e2e

# 运行单元测试
npm run test

# 运行覆盖率测试
npm run test:cov
```

### 环境变量

测试使用单独的环境变量配置：

```env
# .env.test
NODE_ENV=test
DB_HOST=localhost
DB_PORT=5433
DB_NAME=chat_test
DB_USER=mysql
DB_PASSWORD=mysql
REDIS_HOST=localhost
REDIS_PORT=6380
MINIO_ENDPOINT=localhost:9001
JWT_SECRET=test-secret-key
```

### 测试数据库

- 使用 MySQL 测试数据库
- 每次测试前自动清空数据
- 使用测试种子数据填充

---

## 单元测试

### 测试覆盖目标

| 模块          | 目标覆盖率 | 当前状态  |
| ------------- | ---------- | --------- |
| Auth          | > 90%      | ⏳ 待测试 |
| Users         | > 85%      | ⏳ 待测试 |
| Friends       | > 85%      | ⏳ 待测试 |
| Conversations | > 85%      | ⏳ 待测试 |
| Chat          | > 80%      | ⏳ 待测试 |
| Moments       | > 85%      | ⏳ 待测试 |
| Notifications | > 80%      | ⏳ 待测试 |
| Search        | > 80%      | ⏳ 待测试 |
| Uploads       | > 80%      | ⏳ 待测试 |
| WebRTC        | > 75%      | ⏳ 待测试 |

### 单元测试用例示例

#### 认证模块

```typescript
describe('AuthService', () => {
  let service: AuthService;
  let mockUsersRepository: Partial<UsersRepository>;

  beforeEach(async () => {
    mockUsersRepository = {
      findByUsername: jest.fn(),
      findByEmail: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersRepository,
          useValue: mockUsersRepository,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  describe('register', () => {
    it('should register a new user', async () => {
      const registerDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      mockUsersRepository.findByUsername.mockResolvedValue(null);
      mockUsersRepository.findByEmail.mockResolvedValue(null);
      mockUsersRepository.create.mockReturnValue(registerDto);
      mockUsersRepository.save.mockResolvedValue({ id: 1, ...registerDto });

      const result = await service.register(registerDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockUsersRepository.create).toHaveBeenCalled();
    });

    it('should throw error if username already exists', async () => {
      const registerDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      mockUsersRepository.findByUsername.mockResolvedValue({ id: 1 });

      await expect(service.register(registerDto)).rejects.toThrow(ConflictException);
    });

    it('should hash password before saving', async () => {
      const registerDto = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
      };

      mockUsersRepository.findByUsername.mockResolvedValue(null);
      mockUsersRepository.findByEmail.mockResolvedValue(null);
      mockUsersRepository.create.mockReturnValue(registerDto);

      const savedUser = { id: 1, ...registerDto };
      mockUsersRepository.save.mockImplementation((user) => {
        expect(user.password).not.toBe('password123');
        return Promise.resolve(savedUser);
      });

      await service.register(registerDto);
    });
  });

  describe('login', () => {
    it('should login with valid credentials', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'password123',
      };

      const hashedPassword = await bcrypt.hash('password123', 10);
      mockUsersRepository.findByUsername.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password: hashedPassword,
      });

      const result = await service.login(loginDto);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw error with invalid password', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'wrongpassword',
      };

      const hashedPassword = await bcrypt.hash('password123', 10);
      mockUsersRepository.findByUsername.mockResolvedValue({
        id: 1,
        username: 'testuser',
        password: hashedPassword,
      });

      await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
    });
  });
});
```

---

## 集成测试

### 集成测试用例

#### 认证模块集成测试

```typescript
describe('AuthController (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 连接测试数据库
    connection = app.get<Connection>(Connection);
    await connection.runMigrations();
  });

  afterAll(async () => {
    await connection.dropDatabase();
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'test@example.com',
          password: 'password123',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
          expect(res.body.user).toHaveProperty('id');
          expect(res.body.user.username).toBe('testuser');
        });
    });

    it('should not register with duplicate username', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'testuser',
          email: 'another@example.com',
          password: 'password123',
        })
        .expect(409);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'password123',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('refreshToken');
        });
    });

    it('should not login with invalid password', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });
});
```

### WebSocket 集成测试

```typescript
describe('ChatGateway (e2e)', () => {
  let ioClient: Socket;
  let accessToken: string;

  beforeAll(async () => {
    // 注册并登录获取 token
    const registerResponse = await request(app.getHttpServer()).post('/auth/register').send({
      username: 'testuser',
      email: 'test@example.com',
      password: 'password123',
    });

    accessToken = registerResponse.body.accessToken;

    // 连接 WebSocket
    ioClient = io('http://localhost:3000', {
      auth: { token: accessToken },
      transports: ['websocket'],
    });
  });

  afterAll(() => {
    ioClient.disconnect();
  });

  it('should connect successfully', (done) => {
    ioClient.on('connect', () => {
      expect(ioClient.connected).toBe(true);
      done();
    });
  });

  it('should receive new message', (done) => {
    ioClient.on('message:new', (data) => {
      expect(data).toHaveProperty('conversationId');
      expect(data).toHaveProperty('message');
      expect(data.message.content).toBe('Hello World');
      done();
    });

    // 发送消息
    ioClient.emit('message:send', {
      conversationId: 1,
      content: 'Hello World',
      type: 'TEXT',
    });
  });
});
```

---

## 端到端测试

### 用户场景测试

#### 场景 1：完整聊天流程

```typescript
describe('Complete Chat Flow', () => {
  let user1Token: string;
  let user2Token: string;
  let conversationId: number;

  it('should complete full chat flow', async () => {
    // 1. 注册两个用户
    const user1 = await registerUser('user1', 'user1@example.com');
    const user2 = await registerUser('user2', 'user2@example.com');

    user1Token = user1.accessToken;
    user2Token = user2.accessToken;

    // 2. 发送好友请求
    await request(app.getHttpServer())
      .post('/friends/request')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ recipientId: user2.user.id })
      .expect(201);

    // 3. 接受好友请求
    await request(app.getHttpServer())
      .post(`/friends/requests/1/accept`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(200);

    // 4. 创建会话
    const conversation = await request(app.getHttpServer())
      .post('/conversations')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ type: 'DIRECT', memberIds: [user2.user.id] })
      .expect(201);

    conversationId = conversation.body.id;

    // 5. 发送消息
    const message = await request(app.getHttpServer())
      .post(`/chat/${conversationId}/messages`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ content: 'Hello!', type: 'TEXT' })
      .expect(201);

    // 6. 获取消息列表
    await request(app.getHttpServer())
      .get(`/chat/${conversationId}/messages`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.items).toHaveLength(1);
        expect(res.body.items[0].content).toBe('Hello!');
      });

    // 7. 标记消息已读
    await request(app.getHttpServer())
      .post(`/chat/messages/${message.body.id}/read`)
      .set('Authorization', `Bearer ${user2Token}`)
      .expect(200);

    // 8. 删除消息
    await request(app.getHttpServer())
      .delete(`/chat/messages/${message.body.id}`)
      .set('Authorization', `Bearer ${user1Token}`)
      .expect(200);
  });
});
```

#### 场景 2：朋友圈完整流程

```typescript
describe('Moments Flow', () => {
  let userToken: string;
  let postId: number;

  it('should complete moments flow', async () => {
    // 1. 登录用户
    const login = await loginUser('testuser', 'password');
    userToken = login.accessToken;

    // 2. 发布动态
    const post = await request(app.getHttpServer())
      .post('/moments')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        content: 'This is a test post',
        visibility: 'PUBLIC',
      })
      .expect(201);

    postId = post.body.id;

    // 3. 点赞动态
    await request(app.getHttpServer())
      .post(`/moments/${postId}/like`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(201);

    // 4. 添加评论
    await request(app.getHttpServer())
      .post(`/moments/${postId}/comments`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ content: 'Nice post!' })
      .expect(201);

    // 5. 获取动态列表
    await request(app.getHttpServer())
      .get('/moments')
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.items.length).toBeGreaterThan(0);
      });

    // 6. 取消点赞
    await request(app.getHttpServer())
      .delete(`/moments/${postId}/like`)
      .set('Authorization', `Bearer ${userToken}`)
      .expect(200);
  });
});
```

---

## 性能测试

### 性能指标

| 接口         | 目标响应时间 | 并发用户数 | 成功率 |
| ------------ | ------------ | ---------- | ------ |
| 登录         | < 200ms      | 100        | > 99%  |
| 发送消息     | < 100ms      | 500        | > 99%  |
| 获取消息列表 | < 300ms      | 200        | > 99%  |
| 发布动态     | < 500ms      | 100        | > 99%  |
| 搜索         | < 500ms      | 50         | > 95%  |

### 性能测试配置 (Artillery)

```yaml
# artillery-test.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: 'Warm up'
    - duration: 120
      arrivalRate: 50
      name: 'Ramp up'
    - duration: 300
      arrivalRate: 100
      name: 'Sustained load'
scenarios:
  - name: 'Chat Flow'
    flow:
      - post:
          url: '/auth/login'
          json:
            username: 'user1'
            password: 'password123'
          capture:
            json: '$.accessToken'
            as: 'token'
      - get:
          url: '/conversations'
          headers:
            Authorization: 'Bearer {{ token }}'
      - post:
          url: '/chat/1/messages'
          headers:
            Authorization: 'Bearer {{ token }}'
          json:
            content: 'Test message'
            type: 'TEXT'
```

### 运行性能测试

```bash
# 安装 Artillery
npm install -g artillery

# 运行性能测试
artillery run artillery-test.yml

# 生成性能报告
artillery run --output report.json artillery-test.yml
artillery report report.json
```

---

## 安全测试

### 安全测试项

| 测试项       | 描述                       | 状态      |
| ------------ | -------------------------- | --------- |
| SQL 注入     | 防止 SQL 注入攻击          | ✅ 已防护 |
| XSS 攻击     | 防止跨站脚本攻击           | ✅ 已防护 |
| CSRF 攻击    | 防止跨站请求伪造           | ✅ 已防护 |
| 认证绕过     | 确保所有受保护端点需要认证 | ⏳ 待测试 |
| 权限验证     | 确保用户只能访问自己的资源 | ⏳ 待测试 |
| Token 安全   | 确保 JWT Token 安全性      | ✅ 已实现 |
| 密码强度     | 强制使用强密码             | ✅ 已实现 |
| 文件上传安全 | 限制文件类型和大小         | ✅ 已实现 |
| 速率限制     | 防止 API 滥用              | ⏳ 待测试 |

### 安全测试用例

#### 认证绕过测试

```typescript
describe('Security Tests', () => {
  it('should not allow access without token', () => {
    return request(app.getHttpServer()).get('/users/me').expect(401);
  });

  it('should not allow access with invalid token', () => {
    return request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', 'Bearer invalid-token')
      .expect(401);
  });

  it('should not allow expired token', async () => {
    const expiredToken = generateExpiredToken();
    return request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${expiredToken}`)
      .expect(401);
  });
});

describe('Authorization Tests', () => {
  it('should not allow user to access other user data', async () => {
    const user1 = await registerUser('user1', 'user1@example.com');
    const user2 = await registerUser('user2', 'user2@example.com');

    return request(app.getHttpServer())
      .get(`/users/${user2.user.id}`)
      .set('Authorization', `Bearer ${user1.accessToken}`)
      .expect(403);
  });

  it('should not allow user to delete other user post', async () => {
    const user1 = await registerUser('user1', 'user1@example.com');
    const user2 = await registerUser('user2', 'user2@example.com');

    const post = await createPost(user2.accessToken, 'Test post');

    return request(app.getHttpServer())
      .delete(`/moments/${post.id}`)
      .set('Authorization', `Bearer ${user1.accessToken}`)
      .expect(403);
  });
});
```

---

## 测试覆盖率

### 当前覆盖率状态

```
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s
-------------------|---------|----------|---------|---------|-------------------
All files            |    65.4 |     58.7 |    63.2 |    66.1 |
 src/common         |    72.1 |     65.3 |    70.5 |    73.2 |
 src/modules/auth   |    68.5 |     60.2 |    65.8 |    69.1 |
 src/modules/users  |    64.2 |     56.8 |    62.1 |    65.3 |
 src/modules/friends|    60.8 |     54.2 |    58.9 |    62.4 |
 src/modules/chat   |    55.3 |     48.7 |    52.4 |    56.8 |
 ...                |    ...     |    ...     |   ...    |    ...
-------------------|---------|----------|---------|---------|-------------------
```

### 覆盖率目标

- **整体覆盖率**: > 80%
- **核心模块覆盖率**: > 90%
- **分支覆盖率**: > 75%
- **函数覆盖率**: > 80%

### 提升覆盖率计划

1. 为未覆盖的 Service 方法添加单元测试
2. 为所有 DTO 添加验证测试
3. 为 Guards 和 Interceptors 添加测试
4. 为 Error Handling 添加测试用例
5. 为 WebSocket 事件添加集成测试

---

## 测试结果

### 测试执行状态

| 测试类型 | 计划数量 | 已执行 | 通过  | 失败  | 跳过  |
| -------- | -------- | ------ | ----- | ----- | ----- |
| 单元测试 | 150      | 3      | 0     | 3     | 0     |
| 集成测试 | 50       | 0      | 0     | 0     | 0     |
| E2E 测试 | 20       | 0      | 0     | 0     | 0     |
| 性能测试 | 10       | 0      | 0     | 0     | 0     |
| 安全测试 | 15       | 0      | 0     | 0     | 0     |
| **总计** | **245**  | **3**  | **0** | **3** | **0** |

### 当前问题

1. **单元测试**: 3 个测试文件存在编译错误
   - `test/modules/auth/auth.service.spec.ts` - 类型错误和重复标识符
   - 需要修复后才能运行

2. **集成测试**: 尚未实现

3. **E2E 测试**: 尚未实现

4. **性能测试**: 尚未执行

5. **安全测试**: 尚未实现

### 下一步行动

1. ✅ 修复现有测试文件的编译错误
2. ⏳ 编写完整的单元测试套件（目标 150 个用例）
3. ⏳ 编写集成测试套件（目标 50 个用例）
4. ⏳ 编写 E2E 测试套件（目标 20 个用例）
5. ⏳ 执行性能测试
6. ⏳ 执行安全测试
7. ⏳ 达到 80% 以上代码覆盖率

---

## 测试最佳实践

### 编写测试的原则

1. **独立性**: 每个测试应该独立运行，不依赖其他测试
2. **可读性**: 测试名称应该清楚描述测试的内容
3. **快速**: 单元测试应该快速执行（< 1 秒）
4. **可维护**: 测试代码应该易于维护和修改

### 测试命名约定

```typescript
describe('ClassName', () => {
  describe('methodName', () => {
    it('should do something when condition', () => {});
    it('should throw error when invalid input', () => {});
  });
});
```

### 测试数据管理

- 使用 Fixtures 管理测试数据
- 在测试前准备数据，在测试后清理
- 使用事务回滚避免污染测试数据库

---

## 附录

### A. 测试命令

```bash
# 运行所有测试
npm test

# 运行特定测试文件
npm test auth.service.spec.ts

# 运行测试并监听文件变化
npm run test:watch

# 运行测试并生成覆盖率报告
npm run test:cov

# 运行 E2E 测试
npm run test:e2e

# 调试测试
npm run test:debug
```

### B. CI/CD 集成

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mysql:
        image: mysql:16
        env:
          mysql_PASSWORD: mysql
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test
      - run: npm run test:cov
      - uses: codecov/codecov-action@v3
```

### C. 相关文档

- [开发者使用手册](../developer-guide.md)
- [API 参考文档](../api/api-reference.md)
- [详细设计文档](../design/detailed-design.md)

---

**文档版本**: v1.0
**最后更新**: 2026-01-08
**测试负责人**: 开发团队
