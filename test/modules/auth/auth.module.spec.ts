import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthModule } from './auth.module';
import { AuthService } from './services/auth.service';
import { AuthController } from './controllers/auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { DatabaseModule } from '../../../common/database/database.module';
import { JwtStrategy } from './strategies/jwt.strategy';

describe('AuthModule', () => {
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          load: [
            () => ({
              jwt: {
                secret: 'test-secret',
                expiresIn: '7d',
                refreshSecret: 'test-refresh-secret',
                refreshExpiresIn: '30d',
              },
            }),
          ],
        }),
        DatabaseModule,
        PassportModule,
        JwtModule.registerAsync({
          imports: [ConfigModule],
          useFactory: async (config: ConfigService) => ({
            secret: configService.get<string>('jwt.secret'),
            signOptions: {
              expiresIn: configService.get<string>('jwt.expiresIn'),
            },
          }),
          inject: [ConfigService],
        }),
        PassportModule,
        AuthModule,
      ],
    }).compile();
  });

  afterEach(async () => {
    await module.close();
  });

  it('应该被定义', () => {
    expect(module).toBeDefined();
  });

  it('应该导入AuthModule', () => {
    const authModule = module.get<AuthModule>(AuthModule);
    expect(authModule).toBeDefined();
  });

  it('应该提供AuthService', () => {
    const authService = module.get<AuthService>(AuthService);
    expect(authService).toBeInstanceOf(AuthService);
  });

  it('应该提供AuthController', () => {
    const authController = module.get<AuthController>(AuthController);
    expect(authController).toBeInstanceOf(AuthController);
  });

  it('应该提供JwtAuthGuard', () => {
    const jwtAuthGuard = module.get<JwtAuthGuard>(JwtAuthGuard);
    expect(jwtAuthGuard).toBeDefined();
  });
  });
});
