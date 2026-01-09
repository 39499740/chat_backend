import * as supertest from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { TestHelpers } from '../helpers/e2e-helpers';

const request = (supertest as any).default || supertest;

describe('Chat Backend E2E Tests', () => {
  let app: INestApplication;
  let authToken: string;
  let userId: string;
  let server: any;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    server = app.getHttpServer();
    console.log('E2E Test server started');
    console.log('Environment:', process.env.NODE_ENV);
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_PORT:', process.env.DB_PORT);
  }, 180000);

  afterAll(async () => {
    console.log('Closing E2E Test server');
    await app.close();
    await TestHelpers.cleanupRegisteredTestIds();
  });

  describe('Authentication Flow', () => {
    afterEach(async () => {
      await TestHelpers.cleanupRegisteredTestIds();
    });

    it('should complete full authentication flow', async () => {
      const registerData = {
        username: TestHelpers.generateTestUsername(),
        email: TestHelpers.generateTestEmail(),
        password: 'SecurePassword123!',
      };

      const registerResponse = await request(server)
        .post('/auth/register')
        .send(registerData)
        .expect(201);

      expect(registerResponse.body).toHaveProperty('data');
      expect(registerResponse.body.data).toHaveProperty('accessToken');
      expect(registerResponse.body.data).toHaveProperty('refreshToken');
      authToken = registerResponse.body.data.accessToken;
      userId = registerResponse.body.data.user.id;

      const loginResponse = await request(server)
        .post('/auth/login')
        .send({
          email: registerData.email,
          password: registerData.password,
        })
        .expect(201);

      expect(loginResponse.body.data).toHaveProperty('accessToken');
      expect(loginResponse.body.data.user.id).toBe(userId);
    });
  });

  describe('User Management', () => {
    afterEach(async () => {
      await TestHelpers.cleanupRegisteredTestIds();
    });

    beforeAll(async () => {
      const registerData = {
        username: TestHelpers.generateTestUsername(),
        email: TestHelpers.generateTestEmail(),
        password: 'SecurePassword123!',
      };

      const response = await request(server).post('/auth/register').send(registerData).expect(201);

      authToken = response.body.data.accessToken;
      userId = response.body.data.user.id;
      TestHelpers.registerTestId('user', userId);
    });

    it('should get user profile', async () => {
      const response = await request(server)
        .get('/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('id');
      expect(response.body.data).toHaveProperty('username');
      expect(response.body.data).toHaveProperty('email');
    });

    it('should update user profile', async () => {
      const updateData = {
        nickname: 'Updated Nickname',
        bio: 'Updated Bio',
      };

      const response = await request(server)
        .patch('/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.data.nickname).toBe(updateData.nickname);
      expect(response.body.data.bio).toBe(updateData.bio);
    });

    it('should change password', async () => {
      const passwordData = {
        currentPassword: 'SecurePassword123!',
        newPassword: 'NewSecurePassword456!',
      };

      const response = await request(server)
        .post('/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData)
        .expect(200);

      expect(response.body).toHaveProperty('message');
    });

    it('should get user settings', async () => {
      const response = await request(server)
        .get('/users/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data).toHaveProperty('user_id');
    });

    it('should update user settings', async () => {
      const settingsData = {
        notification_message: true,
        notification_sound: true,
      };

      const response = await request(server)
        .patch('/users/settings')
        .set('Authorization', `Bearer ${authToken}`)
        .send(settingsData)
        .expect(200);

      expect(response.body.data.notification_message).toBe(settingsData.notification_message);
    });

    it('should search users', async () => {
      const response = await request(server)
        .get('/users/search?keyword=test')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Conversation Management', () => {
    let conversationId: string;

    afterEach(async () => {
      await TestHelpers.cleanupRegisteredTestIds();
    });

    beforeAll(async () => {
      const registerData = {
        username: TestHelpers.generateTestUsername(),
        email: TestHelpers.generateTestEmail(),
        password: 'SecurePassword123!',
      };

      const response = await request(server).post('/auth/register').send(registerData).expect(201);

      authToken = response.body.data.accessToken;
      userId = response.body.data.user.id;
      TestHelpers.registerTestId('user', userId);

      const createResponse = await request(server)
        .post('/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'direct',
          participantIds: [userId],
        })
        .expect(201);

      conversationId = createResponse.body.id;
    });

    it('should get conversations list', async () => {
      const response = await request(server)
        .get('/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it('should get conversation details', async () => {
      const response = await request(server)
        .get(`/conversations/${conversationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.data.id).toBe(conversationId);
    });
  });

  describe('Message Sending', () => {
    let conversationId: string;

    afterEach(async () => {
      await TestHelpers.cleanupRegisteredTestIds();
    });

    beforeAll(async () => {
      const registerData = {
        username: TestHelpers.generateTestUsername(),
        email: TestHelpers.generateTestEmail(),
        password: 'SecurePassword123!',
      };

      const response = await request(server).post('/auth/register').send(registerData).expect(201);

      authToken = response.body.data.accessToken;
      userId = response.body.data.user.id;
      TestHelpers.registerTestId('user', userId);

      const createResponse = await request(server)
        .post('/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          type: 'direct',
          participantIds: [userId],
        })
        .expect(201);

      conversationId = createResponse.body.data.id;
      TestHelpers.registerTestId('conversation', conversationId);
    });

    it('should send a text message', async () => {
      const messageData = {
        conversationId,
        content: 'Hello from E2E test!',
        type: 'text',
      };

      const response = await request(server)
        .post('/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(messageData)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.data.content).toBe(messageData.content);
      expect(response.body.data.senderId).toBe(userId);
    });

    it('should get conversation messages', async () => {
      const response = await request(server)
        .get(`/messages/conversation/${conversationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});
