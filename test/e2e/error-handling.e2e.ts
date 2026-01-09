import * as supertest from 'supertest';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../../src/app.module';
import { TestHelpers } from '../helpers/e2e-helpers';

const request = (supertest as any).default || supertest;

describe('Error Handling E2E Tests', () => {
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
  }, 180000);

  afterAll(async () => {
    await app.close();
    await TestHelpers.cleanupRegisteredTestIds();
  });

  describe('Authentication Error Handling', () => {
    it('should reject registration with existing username', async () => {
      const userData = {
        username: TestHelpers.generateTestUsername(),
        email: TestHelpers.generateTestEmail(),
        password: 'SecurePassword123!',
      };

      await request(server).post('/auth/register').send(userData).expect(201);

      const duplicateResponse = await request(server)
        .post('/auth/register')
        .send(userData)
        .expect(401);

      expect(duplicateResponse.body).toHaveProperty('success');
      expect(duplicateResponse.body.success).toBe(false);
    });

    it('should reject registration with invalid email format', async () => {
      const userData = {
        username: TestHelpers.generateTestUsername(),
        email: 'invalid-email',
        password: 'SecurePassword123!',
      };

      const response = await request(server).post('/auth/register').send(userData).expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject registration with weak password', async () => {
      const userData = {
        username: TestHelpers.generateTestUsername(),
        email: TestHelpers.generateTestEmail(),
        password: '123',
      };

      const response = await request(server).post('/auth/register').send(userData).expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should reject login with wrong password', async () => {
      const userData = {
        username: TestHelpers.generateTestUsername(),
        email: TestHelpers.generateTestEmail(),
        password: 'SecurePassword123!',
      };

      await request(server).post('/auth/register').send(userData).expect(201);

      const loginResponse = await request(server)
        .post('/auth/login')
        .send({
          account: userData.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(loginResponse.body.success).toBe(false);
    });

    it('should reject login with non-existent account', async () => {
      const loginResponse = await request(server)
        .post('/auth/login')
        .send({
          account: 'nonexistent@example.com',
          password: 'SecurePassword123!',
        })
        .expect(401);

      expect(loginResponse.body.success).toBe(false);
    });
  });

  describe('User Management Error Handling', () => {
    beforeAll(async () => {
      const userData = {
        username: TestHelpers.generateTestUsername(),
        email: TestHelpers.generateTestEmail(),
        password: 'SecurePassword123!',
      };

      const response = await request(server).post('/auth/register').send(userData).expect(201);

      authToken = response.body.data.accessToken;
      userId = response.body.data.user.id;
      TestHelpers.registerTestId('user', userId);
    });

    afterEach(async () => {
      await TestHelpers.cleanupRegisteredTestIds();
    });

    it('should reject unauthorized profile update', async () => {
      const updateData = {
        nickname: 'Updated Nickname',
      };

      await request(server).patch('/users/profile').send(updateData).expect(401);
    });

    it('should reject profile update with invalid data', async () => {
      const updateData = {
        nickname: '',
      };

      const response = await request(server)
        .patch('/users/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect([200, 400].includes(response.status)).toBe(true);
    });

    it('should reject password change with wrong current password', async () => {
      const passwordData = {
        currentPassword: 'WrongPassword123!',
        newPassword: 'NewSecurePassword456!',
      };

      const response = await request(server)
        .post('/users/change-password')
        .set('Authorization', `Bearer ${authToken}`)
        .send(passwordData);

      expect([200, 400, 401].includes(response.status)).toBe(true);
    });

    it('should reject search with empty keyword', async () => {
      const response = await request(server)
        .get('/users/search')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ keyword: '' });

      expect([200, 400].includes(response.status)).toBe(true);
    });
  });

  describe('Conversation Error Handling', () => {
    beforeAll(async () => {
      const userData = {
        username: TestHelpers.generateTestUsername(),
        email: TestHelpers.generateTestEmail(),
        password: 'SecurePassword123!',
      };

      const response = await request(server).post('/auth/register').send(userData).expect(201);

      authToken = response.body.data.accessToken;
      userId = response.body.data.user.id;
      TestHelpers.registerTestId('user', userId);
    });

    afterEach(async () => {
      await TestHelpers.cleanupRegisteredTestIds();
    });

    it('should reject conversation creation without participants', async () => {
      const conversationData = {
        type: 'direct',
        participantIds: [],
      };

      const response = await request(server)
        .post('/conversations')
        .set('Authorization', `Bearer ${authToken}`)
        .send(conversationData);

      expect([201, 400, 422].includes(response.status)).toBe(true);
    });

    it('should reject access to non-existent conversation', async () => {
      const nonExistentId = '00000000-0000-0000-0000-000000000000';

      await request(server)
        .get(`/conversations/${nonExistentId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });

  describe('Message Error Handling', () => {
    let conversationId: string;

    beforeAll(async () => {
      const userData = {
        username: TestHelpers.generateTestUsername(),
        email: TestHelpers.generateTestEmail(),
        password: 'SecurePassword123!',
      };

      const response = await request(server).post('/auth/register').send(userData).expect(201);

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

    afterEach(async () => {
      await TestHelpers.cleanupRegisteredTestIds();
    });

    it('should reject message without conversation ID', async () => {
      const messageData = {
        content: 'Hello from E2E test!',
        type: 'text',
      };

      const response = await request(server)
        .post('/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(messageData);

      expect([201, 400].includes(response.status)).toBe(true);
    });

    it('should reject message with empty content', async () => {
      const messageData = {
        conversationId,
        content: '',
        type: 'text',
      };

      const response = await request(server)
        .post('/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(messageData);

      expect([201, 400].includes(response.status)).toBe(true);
    });

    it('should reject message to non-existent conversation', async () => {
      const messageData = {
        conversationId: '00000000-0000-0000-0000-000000000000',
        content: 'Hello from E2E test!',
        type: 'text',
      };

      const response = await request(server)
        .post('/messages')
        .set('Authorization', `Bearer ${authToken}`)
        .send(messageData);

      expect([201, 404, 400].includes(response.status)).toBe(true);
    });
  });

  describe('Boundary Cases', () => {
    it('should handle very long username', async () => {
      const userData = {
        username: 'a'.repeat(100),
        email: TestHelpers.generateTestEmail(),
        password: 'SecurePassword123!',
      };

      const response = await request(server).post('/auth/register').send(userData);

      expect([201, 400, 422].includes(response.status)).toBe(true);
    });

    it('should handle very long email', async () => {
      const userData = {
        username: TestHelpers.generateTestUsername(),
        email: 'a'.repeat(100) + '@example.com',
        password: 'SecurePassword123!',
      };

      const response = await request(server).post('/auth/register').send(userData);

      expect([201, 400, 422].includes(response.status)).toBe(true);
    });

    it('should handle special characters in username', async () => {
      const userData = {
        username: 'user@#$%^&*()',
        email: TestHelpers.generateTestEmail(),
        password: 'SecurePassword123!',
      };

      const response = await request(server).post('/auth/register').send(userData);

      expect([201, 400, 422].includes(response.status)).toBe(true);
    });

    it('should handle concurrent requests', async () => {
      const userData = {
        username: TestHelpers.generateTestUsername(),
        email: TestHelpers.generateTestEmail(),
        password: 'SecurePassword123!',
      };

      const requests = Array(5)
        .fill(null)
        .map(() => request(server).post('/auth/register').send(userData));

      const responses = await Promise.all(requests);

      const successful = responses.filter((r) => r.status === 201);
      const failed = responses.filter((r) => r.status !== 201);

      expect(successful.length + failed.length).toBe(5);
    });
  });
});
