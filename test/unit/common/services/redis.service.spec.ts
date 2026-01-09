import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '@/common/services/redis.service';
import { createClient } from 'redis';

jest.mock('redis');

describe('RedisService', () => {
  let service: RedisService;
  let mockClient: any;
  let createClientMock: jest.Mock;

  beforeEach(async () => {
    createClientMock = createClient as jest.Mock;

    // Mock Redis client
    mockClient = {
      connect: jest.fn().mockResolvedValue(undefined),
      quit: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      get: jest.fn().mockResolvedValue('value'),
      set: jest.fn().mockResolvedValue('OK'),
      setEx: jest.fn().mockResolvedValue('OK'),
      del: jest.fn().mockResolvedValue(1),
      expire: jest.fn().mockResolvedValue(1),
      lPush: jest.fn().mockResolvedValue(1),
      rPush: jest.fn().mockResolvedValue(1),
      lRange: jest.fn().mockResolvedValue(['item1', 'item2']),
      lLen: jest.fn().mockResolvedValue(2),
    };

    createClientMock.mockReturnValue(mockClient);

    const module: TestingModule = await Test.createTestingModule({
      providers: [RedisService],
    }).compile();

    service = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should connect to Redis', async () => {
      await service.onModuleInit();

      expect(createClientMock).toHaveBeenCalledWith({
        socket: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
        },
        password: process.env.REDIS_PASSWORD || 'redis_password',
      });
      expect(mockClient.on).toHaveBeenCalledWith('error', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('connect', expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith('disconnect', expect.any(Function));
      expect(mockClient.connect).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should disconnect from Redis', async () => {
      await service.onModuleInit();
      service['isConnected'] = true;
      await service.onModuleDestroy();

      expect(mockClient.quit).toHaveBeenCalled();
    });
  });

  describe('getClient', () => {
    it('should return client when connected', () => {
      service['isConnected'] = true;
      service['client'] = mockClient;

      const client = service.getClient();

      expect(client).toBe(mockClient);
    });

    it('should throw error when not connected', () => {
      service['isConnected'] = false;

      expect(() => service.getClient()).toThrow('Redis client is not connected');
    });
  });

  describe('set', () => {
    it('should set value without TTL', async () => {
      service['isConnected'] = true;
      service['client'] = mockClient;

      await service.set('key', 'value');

      expect(mockClient.set).toHaveBeenCalledWith('key', 'value');
    });

    it('should set value with TTL', async () => {
      service['isConnected'] = true;
      service['client'] = mockClient;

      await service.set('key', 'value', 60);

      expect(mockClient.setEx).toHaveBeenCalledWith('key', 60, 'value');
    });
  });

  describe('get', () => {
    it('should get value', async () => {
      service['isConnected'] = true;
      service['client'] = mockClient;
      mockClient.get.mockResolvedValue('test-value');

      const result = await service.get('key');

      expect(mockClient.get).toHaveBeenCalledWith('key');
      expect(result).toBe('test-value');
    });

    it('should return null for non-existent key', async () => {
      service['isConnected'] = true;
      service['client'] = mockClient;
      mockClient.get.mockResolvedValue(null);

      const result = await service.get('non-existent-key');

      expect(result).toBeNull();
    });
  });

  describe('del', () => {
    it('should delete key', async () => {
      service['isConnected'] = true;
      service['client'] = mockClient;
      mockClient.del.mockResolvedValue(1);

      const result = await service.del('key');

      expect(mockClient.del).toHaveBeenCalledWith('key');
      expect(result).toBe(1);
    });
  });

  describe('expire', () => {
    it('should set expire time', async () => {
      service['isConnected'] = true;
      service['client'] = mockClient;
      mockClient.expire.mockResolvedValue(1);

      const result = await service.expire('key', 60);

      expect(mockClient.expire).toHaveBeenCalledWith('key', 60);
      expect(result).toBe(1);
    });
  });

  describe('lPush', () => {
    it('should push to left side of list', async () => {
      service['isConnected'] = true;
      service['client'] = mockClient;
      mockClient.lPush.mockResolvedValue(1);

      const result = await service.lPush('list', 'item1', 'item2');

      expect(mockClient.lPush).toHaveBeenCalledWith('list', ['item1', 'item2']);
      expect(result).toBe(1);
    });
  });

  describe('rPush', () => {
    it('should push to right side of list', async () => {
      service['isConnected'] = true;
      service['client'] = mockClient;
      mockClient.rPush.mockResolvedValue(2);

      const result = await service.rPush('list', 'item1', 'item2');

      expect(mockClient.rPush).toHaveBeenCalledWith('list', ['item1', 'item2']);
      expect(result).toBe(2);
    });
  });

  describe('lRange', () => {
    it('should get range from list', async () => {
      service['isConnected'] = true;
      service['client'] = mockClient;
      mockClient.lRange.mockResolvedValue(['item1', 'item2']);

      const result = await service.lRange('list', 0, -1);

      expect(mockClient.lRange).toHaveBeenCalledWith('list', 0, -1);
      expect(result).toEqual(['item1', 'item2']);
    });
  });

  describe('lLen', () => {
    it('should get length of list', async () => {
      service['isConnected'] = true;
      service['client'] = mockClient;
      mockClient.lLen.mockResolvedValue(5);

      const result = await service.lLen('list');

      expect(mockClient.lLen).toHaveBeenCalledWith('list');
      expect(result).toBe(5);
    });
  });
});
