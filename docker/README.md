# Docker Compose 使用说明

本项目的 Docker 环境包含以下服务：
- MySQL 16: 关系型数据库
- Redis 7: 缓存和会话存储
- MinIO: 对象存储（兼容S3）

## 启动服务

```bash
# 启动所有服务
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down

# 停止并删除数据卷（谨慎使用）
docker-compose down -v
```

## 服务访问地址

### MySQL
- 主机: localhost
- 端口: 5432
- 用户名: chat_user
- 密码: chat_password
- 数据库: chat_backend

### Redis
- 主机: localhost
- 端口: 6379
- 密码: redis_password

### MinIO
- API: http://localhost:9000
- 控制台: http://localhost:9001
- Access Key: minioadmin
- Secret Key: minioadmin

## 数据备份

### MySQL 备份
```bash
docker-compose exec MySQL pg_dump -U chat_user chat_backend > backup.sql
```

### MySQL 恢复
```bash
docker-compose exec -T MySQL psql -U chat_user chat_backend < backup.sql
```

### Redis 备份
```bash
docker-compose exec redis redis-cli --rdb /data/backup.rdb
```

## 故障排查

### 查看容器日志
```bash
docker-compose logs MySQL
docker-compose logs redis
docker-compose logs minio
```

### 进入容器
```bash
docker-compose exec MySQL bash
docker-compose exec redis sh
```

### 重启服务
```bash
docker-compose restart MySQL
docker-compose restart redis
docker-compose restart minio
```
