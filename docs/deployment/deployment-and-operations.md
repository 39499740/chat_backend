# 微信社交应用后端系统 - 部署文档和运维手册

## 文档信息

| 项目         | 内容                                                |
| ------------ | --------------------------------------------------- |
| **文档名称** | 部署文档和运维手册 (Deployment & Operations Manual) |
| **版本**     | v1.0                                                |
| **日期**     | 2026-01-08                                          |
| **项目名称** | 微信社交应用后端系统                                |
| **文档状态** | 正式发布                                            |
| **适用范围** | 开发、测试、生产环境                                |

## 目录

1. [引言](#引言)
2. [部署环境要求](#部署环境要求)
3. [开发环境部署](#开发环境部署)
4. [Docker部署](#docker部署)
5. [生产环境部署](#生产环境部署)
6. [系统配置](#系统配置)
7. [运维手册](#运维手册)
8. [监控和日志](#监控和日志)
9. [备份和恢复](#备份和恢复)
10. [故障排查](#故障排查)
11. [附录](#附录)

---

## 1. 引言

### 1.1 文档目的

本文档详细说明微信社交应用后端系统的部署流程、运维操作和故障排查方法，适用于开发人员、测试人员和运维人员。

### 1.2 文档范围

本文档涵盖以下内容：

- 部署环境要求和准备
- 开发环境部署步骤
- Docker容器化部署
- 生产环境部署方案
- 系统配置说明
- 日常运维操作
- 系统监控和日志管理
- 数据备份和恢复
- 常见问题故障排查

### 1.3 术语定义

| 术语         | 定义                                   |
| ------------ | -------------------------------------- |
| **容器化**   | 使用Docker将应用和依赖打包成轻量级容器 |
| **编排**     | 使用Docker Compose管理多容器应用       |
| **负载均衡** | 将请求分发到多个应用实例               |
| **主从复制** | 数据库的高可用架构                     |
| **读写分离** | 将读操作和写操作分发到不同的数据库实例 |
| **集群**     | Redis的分布式部署模式                  |
| **CDN**      | 内容分发网络，用于加速静态资源访问     |

---

## 2. 部署环境要求

### 2.1 硬件要求

#### 2.1.1 最小配置（开发/测试）

| 组件     | 配置    | 说明           |
| -------- | ------- | -------------- |
| **CPU**  | 2核     | 2 GHz或更高    |
| **内存** | 4GB     | 最低4GB RAM    |
| **硬盘** | 50GB    | SSD推荐        |
| **网络** | 100Mbps | 稳定的网络连接 |

#### 2.1.2 推荐配置（小规模生产）

| 组件     | 配置  | 说明          |
| -------- | ----- | ------------- |
| **CPU**  | 4核   | 2.5 GHz或更高 |
| **内存** | 8GB   | 建议16GB      |
| **硬盘** | 200GB | SSD推荐       |
| **网络** | 1Gbps | 低延迟网络    |

#### 2.1.3 生产配置（中大规模）

| 组件     | 配置    | 说明           |
| -------- | ------- | -------------- |
| **CPU**  | 8核+    | 多核处理器     |
| **内存** | 32GB+   | 大内存用于缓存 |
| **硬盘** | 500GB+  | 高性能SSD      |
| **网络** | 10Gbps+ | 冗余网络连接   |

### 2.2 软件要求

#### 2.2.1 操作系统

- **开发/测试**：Windows 10/11, macOS 10.14+, Ubuntu 20.04+
- **生产**：Ubuntu 20.04 LTS, CentOS 8+, Debian 11+

#### 2.2.2 运行时环境

| 软件               | 版本      | 用途       |
| ------------------ | --------- | ---------- |
| **Node.js**        | >=18.0.0  | 应用运行时 |
| **npm**            | >=9.0.0   | 包管理器   |
| **Docker**         | >=20.10.0 | 容器化     |
| **Docker Compose** | >=2.0.0   | 容器编排   |
| **Git**            | >=2.30.0  | 版本控制   |

#### 2.2.3 依赖服务

| 服务           | 版本   | 用途               |
| -------------- | ------ | ------------------ |
| **MySQL** | >=16.0 | 关系型数据库       |
| **Redis**      | >=7.0  | 缓存和会话存储     |
| **MinIO**      | 最新   | 对象存储（S3兼容） |

---

## 3. 开发环境部署

### 3.1 环境准备

#### 3.1.1 安装Node.js

```bash
# Ubuntu/Debian
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 验证安装
node -v  # 应该显示 v18.x.x 或更高
npm -v   # 应该显示 9.x.x 或更高
```

#### 3.1.2 安装Git

```bash
# Ubuntu/Debian
sudo apt-get install -y git

# 验证安装
git --version
```

#### 3.1.3 安装Docker（可选）

```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 安装Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 验证安装
docker --version
docker-compose --version

# 将当前用户添加到docker组（避免每次使用sudo）
sudo usermod -aG docker $USER
newgrp docker
```

### 3.2 项目部署

#### 3.2.1 克隆代码仓库

```bash
# 克隆代码
git clone <repository-url>
cd chat_backend

# 查看分支
git branch -a
git checkout master  # 或其他开发分支

# 查看提交历史
git log --oneline -10
```

#### 3.2.2 安装依赖

```bash
# 安装npm依赖
npm install

# 如果遇到npm镜像问题，使用国内镜像
npm config set registry https://registry.npmmirror.com

# 清理缓存并重新安装
rm -rf node_modules package-lock.json
npm install
```

#### 3.2.3 配置环境变量

```bash
# 复制环境变量模板
cp .env.example .env

# 编辑环境变量
vi .env  # 或使用其他编辑器

# 基本配置示例
NODE_ENV=development
PORT=3000
API_PREFIX=api

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=chat_backend
DB_USER=chat_user
DB_PASSWORD=chat_password

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=redis_password

# MinIO配置
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_USE_SSL=false
MINIO_BUCKET=chat-files

# JWT配置
JWT_SECRET=your-secret-key-change-in-production
JWT_ACCESS_EXPIRATION=900      # 15分钟
JWT_REFRESH_EXPIRATION=604800    # 7天

# CORS配置
WS_CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# WebSocket配置
WS_PORT=3001
WS_CORS_ORIGIN=http://localhost:3000,http://localhost:5173

# 文件上传配置
UPLOAD_MAX_SIZE=10485760      # 10MB
UPLOAD_ALLOWED_TYPES=image/jpeg,image/png,image/gif,video/mp4,video/webm

# 安全配置
SECURITY_BCRYPT_ROUNDS=10
SECURITY_RATE_LIMIT_TTL=600000    # 10分钟
SECURITY_RATE_LIMIT_MAX=100           # 每分钟最多100次请求
```

### 3.3 启动依赖服务

#### 3.3.1 启动Docker服务

```bash
# 进入docker目录
cd docker

# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看服务日志
docker-compose logs -f

# 停止所有服务
docker-compose down

# 重启服务
docker-compose restart

# 删除服务并删除数据卷（谨慎使用）
docker-compose down -v
```

#### 3.3.2 验证服务连接

```bash
# 测试MySQL连接
docker exec -it mysql psql -U chat_user -d chat_backend -c "SELECT 1;"

# 测试Redis连接
docker exec -it redis redis-cli -a redis_password PING

# 测试MinIO连接
curl http://localhost:9000/minio/health/live

# 或者使用MinIO客户端（mc）
mc alias set local http://localhost:9000 minioadmin minioadmin
mc ls local/chat-files
```

### 3.4 启动应用

#### 3.4.1 开发模式启动

```bash
# 开发模式（热重载）
npm run start:dev

# 带调试的开发模式
npm run start:debug

# 使用Nodemon启动（推荐）
npx nodemon
```

#### 3.4.2 生产模式启动

```bash
# 构建项目
npm run build

# 生产模式启动
npm run start:prod

# 或者使用PM2启动（推荐生产环境）
npm install -g pm2
pm2 start dist/main.js --name "chat-backend"
```

#### 3.4.3 验证应用启动

```bash
# 检查应用是否正常启动
curl http://localhost:3000/api

# 访问Swagger文档
open http://localhost:3000/api

# 或在浏览器中打开
http://localhost:3000/api
```

### 3.5 数据库初始化

#### 3.5.1 运行数据库迁移

```bash
# MySQL会自动运行初始化脚本
# docker/mysql/init/01-init.sql

# 查看数据库表
docker exec -it mysql psql -U chat_user -d chat_backend -c "\dt"

# 查看表结构
docker exec -it mysql psql -U chat_user -d chat_backend -c "\d users"
```

#### 3.5.2 插入测试数据

```bash
# 连接到MySQL
docker exec -it mysql psql -U chat_user -d chat_backend

# 插入测试用户
INSERT INTO users (id, username, email, password_hash, nickname, is_active, created_at)
VALUES (
  gen_random_uuid(),
  'testuser',
  'test@example.com',
  '$2a$10$testhashedpassword',
  'Test User',
  TRUE,
  NOW()
);

# 插入测试好友关系
INSERT INTO friendships (id, user_a_id, user_b_id, status, created_at)
VALUES (
  gen_random_uuid(),
  (SELECT id FROM users WHERE username = 'testuser' LIMIT 1),
  (SELECT id FROM users WHERE username = 'anotheruser' LIMIT 1),
  0,
  NOW()
);

# 退出MySQL
\q
```

---

## 4. Docker部署

### 4.1 Docker Compose配置

#### 4.1.1 服务定义

```yaml
version: '3.8'

services:
  # MySQL数据库
  mysql:
    image: mysql:16-alpine
    container_name: chat_mysql
    environment:
      mysql_DB: ${DB_NAME:-chat_backend}
      mysql_USER: ${DB_USER:-chat_user}
      mysql_PASSWORD: ${DB_PASSWORD:-chat_password}
    volumes:
      - mysql_data:/var/lib/MySQL/data
      - ./docker/mysql/init:/docker-entrypoint-initdb.d
    ports:
      - "${DB_PORT:-5432}:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-chat_user} -d ${DB_NAME:-chat_backend}"]
      interval: 10s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    networks:
      - chat_network

  # Redis缓存
  redis:
    image: redis:7-alpine
    container_name: chat_redis
    command: redis-server --requirepass ${REDIS_PASSWORD:-redis_password}
    volumes:
      - redis_data:/data
    ports:
      - "${REDIS_PORT:-6379}:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD:-redis_password}", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    restart: unless-stopped
    networks:
      - chat_network

  # MinIO对象存储
  minio:
    image: minio/minio:latest
    container_name: chat_minio
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: ${MINIO_ACCESS_KEY:-minioadmin}
      MINIO_ROOT_PASSWORD: ${MINIO_SECRET_KEY:-minioadmin}
    volumes:
      - minio_data:/data
    ports:
      - "${MINIO_PORT:-9000}:9000"
      - "9001:9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
    restart: unless-stopped
    networks:
      - chat_network

  # NestJS应用
  app:
    build: .
    container_name: chat_app
    depends_on:
      mysql:
        condition: service_healthy
      redis:
        condition: service_healthy
      minio:
        condition: service_healthy
    environment:
      NODE_ENV: ${NODE_ENV:-production}
      PORT: ${PORT:-3000}
      API_PREFIX: ${API_PREFIX:-api}
      DB_HOST: mysql
      DB_PORT: 5432
      DB_NAME: ${DB_NAME:-chat_backend}
      DB_USER: ${DB_USER:-chat_user}
      DB_PASSWORD: ${DB_PASSWORD:-chat_password}
      REDIS_HOST: redis
      REDIS_PORT: 6379
      REDIS_PASSWORD: ${REDIS_PASSWORD:-redis_password}
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      MINIO_ACCESS_KEY: ${MINIO_ACCESS_KEY:-minioadmin}
      MINIO_SECRET_KEY: ${MINIO_SECRET_KEY:-minioadmin}
      MINIO_USE_SSL: ${MINIO_USE_SSL:-false}
      MINIO_BUCKET: ${MINIO_BUCKET:-chat-files}
      JWT_SECRET: ${JWT_SECRET}
      JWT_ACCESS_EXPIRATION: ${JWT_ACCESS_EXPIRATION:-900}
      JWT_REFRESH_EXPIRATION: ${JWT_REFRESH_EXPIRATION:-604800}
      WS_CORS_ORIGIN: ${WS_CORS_ORIGIN}
      WS_PORT: ${WS_PORT:-3001}
      WS_CORS_ORIGIN: ${WS_CORS_ORIGIN}
      UPLOAD_MAX_SIZE: ${UPLOAD_MAX_SIZE:-10485760}
      UPLOAD_ALLOWED_TYPES: ${UPLOAD_ALLOWED_TYPES}
      SECURITY_BCRYPT_ROUNDS: ${SECURITY_BCRYPT_ROUNDS:-10}
      SECURITY_RATE_LIMIT_TTL: ${SECURITY_RATE_LIMIT_TTL:-600000}
      SECURITY_RATE_LIMIT_MAX: ${SECURITY_RATE_LIMIT_MAX:-100}
    ports:
      - "${PORT:-3000}:3000"
      - "${WS_PORT:-3001}:3001"
    restart: unless-stopped
    networks:
      - chat_network

volumes:
  mysql_data:
  redis_data:
  minio_data:

networks:
  chat_network:
    driver: bridge
```

#### 4.1.2 生产环境优化配置

```yaml
# 生产环境Docker Compose配置
version: '3.8'

services:
  mysql:
    image: mysql:16-alpine
    container_name: chat_mysql
    environment:
      mysql_DB: ${DB_NAME}
      mysql_USER: ${DB_USER}
      mysql_PASSWORD: ${DB_PASSWORD}
      # 性能优化
      mysql_SHARED_BUFFERS: 256MB
      mysql_EFFECTIVE_CACHE_SIZE: 2GB
      mysql_WORK_MEM: 1GB
      mysql_MAINTENANCE_WORK_MEM: 256MB
    volumes:
      - mysql_data:/var/lib/MySQL/data
      - ./docker/mysql/init:/docker-entrypoint-initdb.d
    ports:
      - '5432:5432'
    deploy:
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
    restart: unless-stopped

  redis:
    image: redis:7-alpine
    container_name: chat_redis
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 1gb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    ports:
      - '6379:6379'
    deploy:
      resources:
        limits:
          cpus: '1.0'
          memory: 1G
    restart: unless-stopped

  app:
    image: chat-backend:latest
    container_name: chat_app
    depends_on:
      - mysql
      - redis
    environment:
      NODE_ENV: production
      # ... 其他环境变量
    ports:
      - '3000:3000'
      - '3001:3001'
    deploy:
      replicas: 2 # 运行2个实例
      resources:
        limits:
          cpus: '2.0'
          memory: 2G
        reservations:
          cpus: '1.0'
          memory: 1G
      restart_policy:
        condition: on-failure
        delay: 5s
        max_attempts: 3
        window: 120s
    restart: unless-stopped
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
```

### 4.2 容器管理

#### 4.2.1 镜像构建

```bash
# 构建应用镜像
docker-compose build app

# 为服务添加标签
docker-compose build app --tag chat-backend:v1.0.0

# 查看镜像
docker images | grep chat-backend
```

#### 4.2.2 镜像导出和导入

```bash
# 导出镜像
docker save chat-backend:latest | gzip > chat-backend.tar.gz

# 导入镜像
docker load < chat-backend.tar.gz

# 推送到镜像仓库
docker tag chat-backend:latest your-registry/chat-backend:latest
docker push your-registry/chat-backend:latest
```

#### 4.2.3 容器监控

```bash
# 查看容器资源使用情况
docker stats

# 查看特定容器状态
docker ps -a

# 查看容器日志
docker logs chat_app

# 查看容器详细信息
docker inspect chat_app

# 进入容器
docker exec -it chat_app /bin/sh

# 停止容器
docker stop chat_app

# 启动容器
docker start chat_app

# 重启容器
docker restart chat_app

# 删除容器
docker rm chat_app

# 强制删除运行中的容器
docker rm -f chat_app
```

---

## 5. 生产环境部署

### 5.1 服务器配置

#### 5.1.1 系统优化

```bash
# 调整系统文件描述符限制
sudo vi /etc/sysctl.conf

# 添加以下配置
fs.file-max = 100000
fs.inotify.max_user_watches = 89100
net.ipv4.tcp_max_syn_backlog = 20480
net.core.somaxconn = 1024
net.ipv4.tcp_max_tw_buckets = 4096
net.ipv4.tcp_fastopen = 3

# 应用配置
sudo sysctl -p

# 永久化配置
sudo vi /etc/sysctl.conf
```

#### 5.1.2 防火墙配置

```bash
# 使用UFW配置防火墙（Ubuntu）
sudo ufw enable
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw reload

# 使用firewall-cmd配置防火墙（CentOS）
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --permanent --add-port=3000/tcp
sudo firewall-cmd --reload
```

### 5.2 Nginx负载均衡

#### 5.2.1 Nginx配置

```nginx
# /etc/nginx/conf.d/chat-backend.conf

upstream chat_backend {
    least_conn;
    server app1:3000 weight=3;
    server app2:3000 weight=3;
    server app3:3000 weight=2;
    keepalive 32;
}

server {
    listen 80;
    server_name api.example.com;

    # 重定向到HTTPS
    return 301 https://$server_name$request_uri;

    access_log /var/log/nginx/chat-backend-access.log;
    error_log /var/log/nginx/chat-backend-error.log;

    client_max_body_size 50M;

    location / {
        proxy_pass http://chat_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        # 超时设置
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket代理
    location /socket.io/ {
        proxy_pass http://chat_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;

        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}

# HTTPS配置
server {
    listen 443 ssl http2;
    server_name api.example.com;

    ssl_certificate /etc/letsencrypt/live/api.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;

    # 其他配置同上...
}
```

#### 5.2.2 Nginx优化

```nginx
# 性能优化配置

# 开启Gzip压缩
gzip on;
gzip_vary on;
gzip_proxied any;
gzip_comp_level 6;
gzip_types text/plain text/css text/xml application/json application/javascript application/rss+xml application/atom+xml image/svg+xml;

# 缓存静态资源
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 7d;
    add_header Cache-Control "public, immutable";
}

# 连接优化
keepalive_timeout 65s;
keepalive_requests 100;
```

### 5.3 数据库高可用

#### 5.3.1 MySQL主从复制

```sql
-- 主库配置（MySQL.conf）
listen_addresses = '*'
max_connections = 200
shared_buffers = 256MB
effective_cache_size = 2GB
maintenance_work_mem = 256MB

-- 复制配置
wal_level = replica
max_wal_senders = 4
wal_keep_size = 1GB
synchronous_commit = on

-- 归档配置
archive_mode = on
archive_command = 'cp %p /var/lib/MySQL/archive/%f'
```

```bash
# 配置从库（standby）
docker exec -it mysql_standby psql -U replication_user -d chat_backend -c "SELECT pg_is_in_recovery();"
```

### 5.4 Redis集群

```bash
# 启动Redis集群
docker-compose -f docker-compose.redis-cluster.yml up -d

# 创建集群
redis-cli --cluster create 127.0.0.1:7001 127.0.0.1:7002 127.0.0.1:7003 127.0.0.1:7004

# 查看集群状态
redis-cli --cluster info

# 添加节点
redis-cli --cluster add-node 127.0.0.1:7006 'redis-node-6' 127.0.0.1:7001
```

### 5.5 CI/CD流水线

#### 5.5.1 GitHub Actions配置

```yaml
# .github/workflows/deploy.yml

name: Deploy to Production

on:
  push:
    branches: [master]
  workflow_dispatch:

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code
        uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18.x'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Build application
        run: npm run build

      - name: Build Docker image
        run: docker build -t chat-backend:${{ github.sha }} .

      - name: Login to Docker Hub
        uses: docker/login-action@v2
        with:
          username: ${{ secrets.DOCKER_USERNAME }}
          password: ${{ secrets.DOCKER_PASSWORD }}

      - name: Push Docker image
        run: docker push chat-backend:${{ github.sha }}

      - name: Deploy to server
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.SERVER_HOST }}
          username: ${{ secrets.SERVER_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            docker pull chat-backend:${{ github.sha }}
            docker stop chat_backend
            docker rm chat_backend
            docker run -d --name chat_backend -p 3000:3000 chat_backend:${{ github.sha }}
```

---

## 6. 系统配置

### 6.1 环境变量配置

#### 6.1.1 必需配置

| 环境变量           | 说明          | 默认值           | 必需 |
| ------------------ | ------------- | ---------------- | ---- |
| `NODE_ENV`         | 运行环境      | `development`    | 是   |
| `PORT`             | 应用端口      | `3000`           | 是   |
| `API_PREFIX`       | API前缀       | `api`            | 是   |
| `DB_HOST`          | 数据库主机    | `localhost`      | 是   |
| `DB_PORT`          | 数据库端口    | `5432`           | 是   |
| `DB_NAME`          | 数据库名称    | `chat_backend`   | 是   |
| `DB_USER`          | 数据库用户    | `chat_user`      | 是   |
| `DB_PASSWORD`      | 数据库密码    | `chat_password`  | 是   |
| `REDIS_HOST`       | Redis主机     | `localhost`      | 是   |
| `REDIS_PORT`       | Redis端口     | `6379`           | 是   |
| `REDIS_PASSWORD`   | Redis密码     | `redis_password` | 是   |
| `MINIO_ENDPOINT`   | MinIO端点     | `localhost`      | 是   |
| `MINIO_PORT`       | MinIO端口     | `9000`           | 是   |
| `MINIO_ACCESS_KEY` | MinIO访问密钥 | `minioadmin`     | 是   |
| `MINIO_SECRET_KEY` | MinIO密钥     | `minioadmin`     | 是   |
| `MINIO_BUCKET`     | MinIO桶名     | `chat-files`     | 是   |
| `JWT_SECRET`       | JWT密钥       | `your-secret`    | 是   |

#### 6.1.2 可选配置

| 环境变量                  | 说明                   | 默认值                    |
| ------------------------- | ---------------------- | ------------------------- |
| `WS_PORT`                 | WebSocket端口          | `3001`                    |
| `WS_CORS_ORIGIN`          | WebSocket CORS         | `http://localhost:3000`   |
| `JWT_ACCESS_EXPIRATION`   | 访问令牌过期时间（秒） | `900`                     |
| `JWT_REFRESH_EXPIRATION`  | 刷新令牌过期时间（秒） | `604800`                  |
| `UPLOAD_MAX_SIZE`         | 最大上传大小（字节）   | `10485760`                |
| `UPLOAD_ALLOWED_TYPES`    | 允许的文件类型         | `image/jpeg,image/png...` |
| `SECURITY_BCRYPT_ROUNDS`  | bcrypt rounds          | `10`                      |
| `SECURITY_RATE_LIMIT_TTL` | 速率限制TTL（毫秒）    | `600000`                  |
| `SECURITY_RATE_LIMIT_MAX` | 速率限制最大请求数     | `100`                     |

### 6.2 配置文件结构

```
chat_backend/
├── .env                    # 环境变量
├── .env.example            # 环境变量模板
├── config/
│   ├── configuration.ts    # 配置管理
│   └── validation.ts       # 配置验证
├── docker/
│   ├── mysql/
│   │   └── init/
│   │       └── 01-init.sql
│   └── docker-compose.yml
└── uploads/                 # 上传文件存储
```

---

## 7. 运维手册

### 7.1 日常运维操作

#### 7.1.1 应用监控

```bash
# 检查应用状态
curl http://localhost:3000/api/health

# 检查进程状态
pm2 status
pm2 logs chat-backend --lines 100

# 检查Docker容器状态
docker-compose ps
docker stats chat_app

# 检查系统资源
top
htop
free -h
df -h
```

#### 7.1.2 日志查看

```bash
# 应用日志
pm2 logs chat-backend
tail -f logs/app.log

# Docker日志
docker-compose logs -f app
docker logs chat_app --tail 100

# Nginx日志
tail -f /var/log/nginx/chat-backend-access.log
tail -f /var/log/nginx/chat-backend-error.log

# 系统日志
journalctl -u nginx -f
journalctl -u docker -f
```

#### 7.1.3 性能分析

```bash
# 数据库查询分析
docker exec -it chat_mysql psql -U chat_user -d chat_backend -c "
  SELECT query, calls, total_time, mean_time, max_time
  FROM pg_stat_statements
  ORDER BY total_time DESC
  LIMIT 10;
"

# 慢查询日志
docker exec -it chat_mysql psql -U chat_user -d chat_backend -c "
  SELECT * FROM pg_stat_statements
  WHERE mean_time > 1000
  ORDER BY mean_time DESC;
"

# Redis性能分析
docker exec -it chat_redis redis-cli --slowlog get 10

# 应用性能分析
# 使用New Relic或类似工具
# 或使用pm2监控
pm2 show chat-backend
```

### 7.2 更新部署

#### 7.2.1 滚动更新策略

```bash
# 1. 备份数据库
docker exec chat_mysql pg_dump -U chat_user chat_backend > backup_$(date +%Y%m%d).sql

# 2. 拉取最新代码
git pull origin master

# 3. 构建新版本
npm run build

# 4. 停止当前应用
pm2 stop chat-backend

# 5. 部署新版本
pm2 start dist/main.js --name "chat-backend"

# 6. 验证部署
curl http://localhost:3000/api/health

# 7. 回滚（如果需要）
pm2 restart chat-backend  # 回滚到上一个版本
```

#### 7.2.2 蓝绿部署策略

```bash
# 1. 配置蓝绿部署
# 将当前版本设为blue
docker tag chat-backend:latest chat-backend:blue
docker tag chat-backend:latest chat-backend:green

# 2. 部署新版本到green
docker run -d --name chat_backend_green chat_backend:green

# 3. 验证green版本
curl http://localhost:3001/api/health

# 4. 切换流量到green
docker exec nginx nginx -s reload
# 更新Nginx配置指向green

# 5. 监控一段时间
# 如果出现问题，立即切回blue

# 6. 停止blue版本
docker stop chat_backend_blue
```

---

## 8. 监控和日志

### 8.1 应用监控

#### 8.1.1 健康检查端点

```typescript
// 添加健康检查端点
@Get('health')
async healthCheck() {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: await this.checkDatabase(),
    redis: await this.checkRedis(),
    minio: await this.checkMinIO(),
  };
}

async checkDatabase() {
  try {
    await this.db.query('SELECT 1');
    return { status: 'connected' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

async checkRedis() {
  try {
    await this.redisService.get('health-check');
    return { status: 'connected' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}

async checkMinIO() {
  try {
    await this.minioService.listBuckets();
    return { status: 'connected' };
  } catch (error) {
    return { status: 'error', message: error.message };
  }
}
```

#### 8.1.2 Prometheus指标

```typescript
// 集成Prometheus监控
import { Controller, Get } from '@nestjs/common';
import { Counter, Histogram } from 'prom-client';

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
});

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
});

@Controller('metrics')
export class MetricsController {
  @Get()
  getMetrics() {
    return register.metrics();
  }
}
```

### 8.2 日志管理

#### 8.2.1 日志级别配置

```typescript
// 日志级别配置
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal',
}

// 开发环境：DEBUG
// 生产环境：INFO
const LOG_LEVEL =
  process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? LogLevel.INFO : LogLevel.DEBUG);
```

#### 8.2.2 日志轮转配置

```yaml
# 日志轮转配置
winston:
  transports:
    - type: 'File'
      filename: 'logs/app.log'
      maxsize: 20m
      maxFiles: 14d
      tailable: true
    - type: 'Console'
      colorize: true
```

#### 8.2.3 结构化日志

```typescript
// 使用Winston记录结构化日志
logger.info({
  level: 'info',
  timestamp: new Date().toISOString(),
  userId: req.user?.id,
  method: req.method,
  url: req.url,
  ip: req.ip,
  userAgent: req.headers['user-agent'],
  statusCode: res.statusCode,
  responseTime: responseTime,
  message: 'Request completed',
});
```

---

## 9. 备份和恢复

### 9.1 数据库备份

#### 9.1.1 自动备份脚本

```bash
#!/bin/bash
# backup-database.sh

BACKUP_DIR="/backups/mysql"
DATE=$(date +%Y%m%d_%H%M%S)
FILENAME="chat_backend_${DATE}.sql"

# 创建备份目录
mkdir -p $BACKUP_DIR

# 执行备份
docker exec chat_mysql pg_dump -U chat_user chat_backend > $BACKUP_DIR/$FILENAME

# 压缩备份
gzip $BACKUP_DIR/$FILENAME

# 删除30天前的备份
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/${FILENAME}.gz"

# 记录备份日志
echo "[$(date)] Database backup completed" >> $BACKUP_DIR/backup.log
```

#### 9.1.2 定时备份

```bash
# 添加到crontab
crontab -e

# 每天凌晨2点自动备份
0 2 * * * /path/to/backup-database.sh >> /var/log/backup.log 2>&1

# 每周日凌晨3点全量备份
0 3 * * 0 /path/to/full-backup.sh >> /var/log/backup.log 2>&1
```

### 9.2 恢复操作

#### 9.2.1 数据库恢复

```bash
#!/bin/bash
# restore-database.sh

BACKUP_FILE=$1
BACKUP_DIR="/backups/mysql"

if [ -z "$BACKUP_FILE" ]; then
  echo "Usage: $0 <backup_file>"
  exit 1
fi

# 解压备份文件
gunzip -c $BACKUP_DIR/$BACKUP_FILE | docker exec -i chat_mysql psql -U chat_user -d chat_backend

# 或者直接恢复SQL文件
docker exec -i chat_mysql psql -U chat_user -d chat_backend < $BACKUP_DIR/$BACKUP_FILE

echo "Restore completed: $BACKUP_FILE"
```

### 9.3 文件备份

#### 9.3.1 MinIO备份

```bash
#!/bin/bash
# backup-minio.sh

BACKUP_DIR="/backups/minio"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# 使用MinIO客户端（mc）同步文件
mc mirror local/chat-files/ $BACKUP_DIR/chat-files_${DATE}/

# 压缩备份
tar -czf $BACKUP_DIR/minio_${DATE}.tar.gz -C $BACKUP_DIR chat-files_${DATE}

# 删除7天前的备份
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete

echo "MinIO backup completed"
```

---

## 10. 故障排查

### 10.1 常见问题

#### 10.1.1 应用启动失败

**问题**：应用无法启动

**排查步骤**：

```bash
# 1. 检查环境变量是否正确
docker-compose config

# 2. 查看应用日志
docker-compose logs app

# 3. 检查依赖服务是否启动
docker-compose ps

# 4. 检查端口是否被占用
netstat -tuln | grep :3000

# 5. 测试数据库连接
docker exec -it mysql psql -U chat_user -d chat_backend -c "SELECT 1;"

# 6. 检查Redis连接
docker exec -it redis redis-cli -a redis_password PING

# 常见原因：
# - 环境变量配置错误
# - 数据库连接失败
# - 端口被占用
# - 依赖服务未启动
# - 依赖包缺失
```

#### 10.1.2 数据库连接失败

**问题**：无法连接到MySQL

**排查步骤**：

```bash
# 1. 检查MySQL是否运行
docker ps | grep mysql

# 2. 检查MySQL日志
docker logs chat_mysql

# 3. 测试网络连接
telnet localhost 5432

# 4. 检查数据库用户权限
docker exec -it mysql psql -U chat_user -d chat_backend -c "\du"

# 5. 检查连接池配置
# 查看数据库配置是否正确

# 常见原因：
# - MySQL服务未启动
# - 网络连接问题
# - 用户名或密码错误
# - 数据库名称不存在
# - 连接池已满
```

#### 10.1.3 性能问题

**问题**：应用响应缓慢

**排查步骤**：

```bash
# 1. 检查系统资源
top
htop
free -h

# 2. 检查数据库查询性能
docker exec -it chat_mysql psql -U chat_user -d chat_backend -c "
  SELECT query, calls, total_time, mean_time, max_time
  FROM pg_stat_statements
  ORDER BY total_time DESC
  LIMIT 10;
"

# 3. 检查Redis缓存命中率
docker exec -it chat_redis redis-cli INFO stats

# 4. 检查慢查询
docker exec -it chat_mysql psql -U chat_user -d chat_backend -c "
  SELECT * FROM pg_stat_statements
  WHERE mean_time > 1000
  ORDER BY mean_time DESC
  LIMIT 20;
"

# 优化建议：
# - 添加数据库索引
# - 优化慢查询
# - 增加Redis缓存
# - 调整数据库连接池
# - 使用读写分离
```

#### 10.1.4 内存泄漏

**问题**：应用内存占用持续增长

**排查步骤**：

```bash
# 1. 监控内存使用
docker stats chat_app --no-stream

# 2. 使用Node.js性能分析工具
node --inspect app.js

# 3. 使用PM2监控
pm2 monit

# 4. 检查内存泄漏
# 定期重启应用（临时解决方案）
pm2 restart chat-backend

# 常见原因：
# - 未正确关闭数据库连接
# - 未正确释放内存
# - 内存缓存无限增长
# - 事件监听器未移除
```

#### 10.1.5 WebSocket连接问题

**问题**：WebSocket连接不稳定或频繁断开

**排查步骤**：

```bash
# 1. 检查WebSocket服务状态
docker-compose logs websocket

# 2. 测试WebSocket连接
# 使用WebSocket客户端工具测试连接

# 3. 检查网络连接
# 检查防火墙设置
# 检查Nginx配置

# 4. 检查Socket.IO配置
# 检查pingInterval和pingTimeout
# 检查 transports配置

# 常见原因：
# - 网络连接不稳定
# - Nginx配置问题
# - 防火墙阻止WebSocket
# - 服务器资源不足
# - 负载均衡器配置问题
```

### 10.2 监控告警

#### 10.2.1 告警规则

```typescript
// 配置监控告警
const ALERT_THRESHOLDS = {
  cpu: 80,              // CPU使用率超过80%
  memory: 85,           // 内存使用率超过85%
  disk: 90,              // 磁盘使用率超过90%
  responseTime: 3000,    // 响应时间超过3秒
  errorRate: 10,         // 错误率超过10%
  downTime: 60,           // 服务宕机超过1分钟
};

async checkAlerts() {
  // CPU告警
  if (currentCPUUsage > ALERT_THRESHOLDS.cpu) {
    await sendAlert('CPU usage high', { cpu: currentCPUUsage });
  }

  // 内存告警
  if (currentMemoryUsage > ALERT_THRESHOLDS.memory) {
    await sendAlert('Memory usage high', { memory: currentMemoryUsage });
  }

  // 磁盘告警
  if (currentDiskUsage > ALERT_THRESHOLDS.disk) {
    await sendAlert('Disk usage high', { disk: currentDiskUsage });
  }

  // 响应时间告警
  if (currentResponseTime > ALERT_THRESHOLDS.responseTime) {
    await sendAlert('Response time high', { responseTime: currentResponseTime });
  }

  // 错误率告警
  if (currentErrorRate > ALERT_THRESHOLDS.errorRate) {
    await sendAlert('Error rate high', { errorRate: currentErrorRate });
  }

  // 服务宕机告警
  if (isDown && downTime > ALERT_THRESHOLDS.downTime) {
    await sendCriticalAlert('Service down', { downTime });
  }
}
```

---

## 11. 附录

### 11.1 相关文档链接

| 文档名称               | 路径                                |
| ---------------------- | ----------------------------------- |
| 需求规格说明书 (SRS)   | /docs/requirements/srs.md           |
| 系统架构设计文档 (SAD) | /docs/design/system-architecture.md |
| 数据库设计文档         | /docs/design/database-design.md     |
| 详细设计文档 (DD)      | /docs/design/detailed-design.md     |
| API接口文档            | http://localhost:3000/api           |

### 11.2 常用命令速查

```bash
# Docker操作
docker-compose up -d              # 启动所有服务
docker-compose ps                  # 查看服务状态
docker-compose logs -f            # 查看实时日志
docker-compose down                # 停止所有服务
docker-compose restart            # 重启服务

# 应用操作
npm install                    # 安装依赖
npm run start:dev             # 开发模式启动
npm run build                 # 构建项目
npm run start:prod            # 生产模式启动
npm test                       # 运行测试

# 数据库操作
docker exec -it mysql psql -U chat_user -d chat_backend  # 连接数据库
docker exec -it mysql pg_dump -U chat_user chat_backend > backup.sql  # 备份数据库

# Redis操作
docker exec -it redis redis-cli -a redis_password PING  # 测试连接
docker exec -it redis redis-cli -a redis_password FLUSHDB  # 清空所有数据

# 日志查看
tail -f logs/app.log          # 查看应用日志
pm2 logs chat-backend        # 查看PM2日志
docker logs chat_app             # 查看容器日志

# 监控操作
docker stats                    # 查看资源使用
pm2 status                    # 查看应用状态
curl http://localhost:3000/api/health  # 健康检查
```

### 11.3 端口列表

| 端口 | 服务          | 说明               |
| ---- | ------------- | ------------------ |
| 3000 | HTTP API      | RESTful API接口    |
| 3001 | WebSocket     | WebSocket服务      |
| 5432 | MySQL    | 数据库             |
| 6379 | Redis         | 缓存               |
| 9000 | MinIO API     | 对象存储API        |
| 9001 | MinIO Console | 对象存储管理控制台 |

### 11.4 技术支持

- **GitHub Issues**: https://github.com/your-org/chat_backend/issues
- **文档**: /docs/
- **API文档**: http://localhost:3000/api

---

**文档结束**
