import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // 全局验证管道
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // 启用CORS
  app.enableCors({
    origin: process.env.WS_CORS_ORIGIN || '*',
    credentials: true,
  });

  // 全局前缀
  const apiPrefix = process.env.API_PREFIX || 'api';
  app.setGlobalPrefix(apiPrefix);

  // Swagger文档配置
  const config = new DocumentBuilder()
    .setTitle('社交应用后端 API')
    .setDescription('类微信社交应用的后端API文档')
    .setVersion('1.0')
    .addTag('auth', '认证相关接口')
    .addTag('users', '用户相关接口')
    .addTag('friends', '好友相关接口')
    .addTag('chat', '聊天相关接口')
    .addTag('moments', '朋友圈相关接口')
    .addTag('uploads', '文件上传接口')
    .addTag('notifications', '通知相关接口')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: '请输入JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: '社交应用 API 文档',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);

  Logger.log(`🚀 Application is running on: http://localhost:${port}/${apiPrefix}`);
  Logger.log(`📚 Swagger documentation available at: http://localhost:${port}/api`);
}

bootstrap();
