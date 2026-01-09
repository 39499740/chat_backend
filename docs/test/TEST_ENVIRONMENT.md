# 测试环境管理

本项目提供了一套完整的测试环境管理工具，用于运行 E2E 测试。

## 快速开始

### 1. 启动测试环境

```bash
npm run test:env:start
```

这个命令会：

- 复制 `.env.test` 到 `.env`
- 启动独立的测试数据库、Redis 和 MinIO 服务
- 等待所有服务就绪

### 2. 运行 E2E 测试

```bash
npm run test:e2e
```

### 3. 查看测试环境状态

```bash
npm run test:env:status
```

### 4. 停止测试环境

```bash
npm run test:env:stop
```

## 可用命令

| 命令                       | 说明             |
| -------------------------- | ---------------- |
| `npm run test:env:start`   | 启动测试环境服务 |
| `npm run test:env:stop`    | 停止测试环境服务 |
| `npm run test:env:restart` | 重启测试环境服务 |
| `npm run test:env:cleanup` | 清理测试数据     |
| `npm run test:env:status`  | 查看服务状态     |

## 测试报告

### 生成覆盖率报告

```bash
npm run test:e2e:cov
```

### 生成 HTML 报告

```bash
npm run report:e2e
```

报告将生成在 `test-results/e2e-report.html`。

## 测试数据隔离

测试环境使用以下机制确保数据隔离：

1. **全局清理**: 每次测试开始前，`global-setup.ts` 会清理所有测试相关数据
2. **测试套件清理**: 每个测试套件结束后，`afterEach` 钩子会清理该套件创建的所有数据
3. **独立数据库**: 使用 `chat_backend_test` 数据库，与开发环境完全隔离
4. **唯一标识**: 使用 `TestHelpers` 生成唯一的用户名、邮箱等标识

## 故障排除

### 服务无法启动

```bash
# 检查端口占用
lsof -i :3308
lsof -i :6380

# 重启 Docker
docker-compose -f docker-compose.test.yml down
docker-compose -f docker-compose.test.yml up -d
```

### 数据库连接失败

```bash
# 检查容器状态
docker ps -a | grep chat

# 查看日志
docker logs chat_mysql_test
docker logs chat_redis_test
docker logs chat_minio_test
```

### 清理失败的数据

```bash
# 完全重置测试环境
npm run test:env:stop
docker-compose -f docker-compose.test.yml down -v
npm run test:env:start
```

## CI/CD 集成

项目包含完整的 GitHub Actions 工作流（`.github/workflows/ci-cd.yml`），包括：

- ✅ ESLint 检查
- ✅ TypeScript 类型检查
- ✅ 单元测试（带覆盖率）
- ✅ E2E 测试
- ✅ Docker 镜像构建
- ✅ 自动化部署

## 性能优化

测试环境针对性能进行了优化：

1. **启动时间优化**
   - 服务健康检查并行执行
   - 缓存 npm 依赖
   - 使用轻量级数据库配置

2. **内存优化**
   - 测试环境使用较低的 Bcrypt rounds（4 vs 10）
   - 禁用不必要的日志
   - 限制数据库连接池大小

3. **并发优化**
   - 支持并行测试执行
   - 测试数据隔离避免竞争条件

## 开发建议

1. **保持测试独立**: 每个测试应该独立运行，不依赖其他测试的状态
2. **使用 TestHelpers**: 使用 `TestHelpers` 生成测试数据，确保唯一性
3. **及时清理**: 在 `afterEach` 或 `afterAll` 中清理测试创建的数据
4. **边界测试**: 除了正常流程，测试边界情况和错误处理

## 相关文档

- [测试计划](../docs/test/test-plan.md)
- [开发者指南](../docs/developer-guide.md)
- [E2E 测试报告](../E2E_TEST_REPORT.md)
