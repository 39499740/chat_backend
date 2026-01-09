export interface EnvironmentVariables {
  // 应用配置
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  API_PREFIX: string;

  // 数据库配置
  DB_TYPE: 'mysql';
  DB_HOST: string;
  DB_PORT: number;
  DB_USERNAME: string;
  DB_PASSWORD: string;
  DB_DATABASE: string;
  DB_SYNCHRONIZE: boolean;
  DB_LOGGING: boolean;

  // Redis配置
  REDIS_HOST: string;
  REDIS_PORT: number;
  REDIS_PASSWORD: string;
  REDIS_DB: number;

  // MinIO配置
  MINIO_ENDPOINT: string;
  MINIO_PORT: number;
  MINIO_ACCESS_KEY: string;
  MINIO_SECRET_KEY: string;
  MINIO_USE_SSL: boolean;
  MINIO_BUCKET: string;

  // JWT配置
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  JWT_REFRESH_SECRET: string;
  JWT_REFRESH_EXPIRES_IN: string;

  // 文件上传配置
  UPLOAD_MAX_FILE_SIZE: number;
  UPLOAD_ALLOWED_TYPES: string;

  // WebSocket配置
  WS_PORT: number;
  WS_CORS_ORIGIN: string;

  // 视频通话配置
  TURN_SERVER_URL: string;
  TURN_SERVER_USERNAME: string;
  TURN_SERVER_CREDENTIAL: string;

  // 日志配置
  LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
  LOG_DIR: string;

  // 安全配置
  BCRYPT_ROUNDS: number;
  RATE_LIMIT_WINDOW_MS: number;
  RATE_LIMIT_MAX_REQUESTS: number;

  // 通知配置
  ENABLE_EMAIL_NOTIFICATIONS: boolean;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASSWORD: string;

  // 搜索配置
  ELASTICSEARCH_ENABLED: boolean;
  ELASTICSEARCH_NODE: string;
}
