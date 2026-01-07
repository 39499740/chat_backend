# 微信社交应用后端系统

一个基于 Node.js (NestJS) 的企业级社交应用后端系统，支持实时聊天、好友管理、朋友圈等功能。

## 项目概述

本项目是一个完整的社交应用后端系统，功能包括：
- 用户注册/登录/认证
- 实时即时通讯（文字、语音、视频、表情、群聊）
- 好友关系管理
- 朋友圈（动态发布、评论、点赞）
- 文件上传和媒体存储
- 离线消息推送
- 系统通知
- 搜索功能

## 技术栈

- **框架**: NestJS (TypeScript)
- **数据库**: PostgreSQL 16
- **缓存**: Redis 7
- **对象存储**: MinIO (S3兼容)
- **实时通信**: Socket.IO
- **认证**: JWT + 双向认证
- **测试**: Jest + Supertest
- **文档**: Swagger/OpenAPI
- **容器化**: Docker + Docker Compose

## 快速开始

### 前置要求

- Node.js >= 18.0.0
- Docker & Docker Compose
- Git

### 安装步骤

1. 克隆仓库
```bash
git clone <repository-url>
cd chat_backend
```

2. 安装依赖
```bash
npm install
```

3. 配置环境变量
```bash
cp .env.example .env
# 编辑 .env 文件，配置数据库、Redis等连接信息
```

4. 启动 Docker 服务
```bash
cd docker
docker-compose up -d
```

5. 初始化数据库
```bash
npm run migration:run
```

6. 启动开发服务器
```bash
npm run start:dev
```

访问 API 文档: http://localhost:3000/api

## 项目结构

```
chat_backend/
├── docs/                    # 项目文档
│   ├── api/                # API文档
│   ├── design/             # 设计文档
│   ├── test/               # 测试文档
│   ├── deployment/         # 部署文档
│   └── requirements/       # 需求文档
├── src/                    # 源代码
│   ├── auth/              # 认证模块
│   ├── users/             # 用户模块
│   ├── chat/              # 聊天模块
│   ├── friends/           # 好友模块
│   ├── moments/           # 朋友圈模块
│   ├── uploads/           # 文件上传模块
│   ├── notifications/     # 通知模块
│   ├── search/            # 搜索模块
│   └── common/            # 公共模块
├── test/                   # 测试文件
├── docker/                 # Docker配置
│   ├── postgres/          # PostgreSQL配置
│   ├── redis/             # Redis配置
│   └── minio/             # MinIO配置
├── uploads/               # 上传文件存储
└── logs/                  # 日志文件
```

## 开发命令

```bash
# 开发模式
npm run start:dev

# 构建项目
npm run build

# 生产模式
npm run start:prod

# 运行测试
npm run test

# 测试覆盖率
npm run test:cov

# 代码格式化
npm run format

# 代码检查
npm run lint

# 数据库迁移
npm run migration:generate -- -n MigrationName
npm run migration:run
npm run migration:revert
```

## API 文档

启动服务后访问: http://localhost:3000/api

## 数据库设计

详细的数据库设计文档请参考: `docs/design/database-design.md`

## 部署

详细的部署文档请参考: `docs/deployment/`

## 测试

```bash
# 运行所有测试
npm run test

# 运行单元测试
npm run test:unit

# 运行集成测试
npm run test:e2e

# 生成测试覆盖率报告
npm run test:cov
```

## CMMI3 合规性

本项目遵循 CMMI Level 3 标准，包含完整的文档体系：
- 需求规格说明书 (SRS)
- 系统架构设计文档 (SAD)
- 详细设计文档 (DD)
- 数据库设计文档
- API 接口文档
- 测试计划和测试报告
- 部署文档
- 运维手册

所有文档位于 `docs/` 目录下。

## 许可证

[MIT License](LICENSE)

## 联系方式

- 项目维护者: Sisyphus AI
- 问题反馈: 通过 GitHub Issues

## 更新日志

详细的更新日志请参考: [CHANGELOG.md](CHANGELOG.md)
