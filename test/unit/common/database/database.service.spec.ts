import { Test, TestingModule } from '@nestjs/testing';
import { DatabaseService } from '@/common/database/database.service';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'mysql2/promise';

jest.mock('mysql2/promise');

describe('DatabaseService', () => {
  let service: DatabaseService;
  let pool: jest.Mocked<Pool>;
  let configService: jest.Mocked<ConfigService>;
  let mockPoolConstructor: jest.Mock;

  beforeEach(async () => {
    mockPoolConstructor = Pool as jest.Mock;

    // Mock Pool
    pool = {
      connect: jest.fn(),
      query: jest.fn(),
      end: jest.fn(),
    } as unknown as jest.Mocked<Pool>;

    mockPoolConstructor.mockReturnValue(pool as any);

    // Mock ConfigService
    configService = {
      get: jest.fn((key: string) => {
        const config = {
          'database.host': 'localhost',
          'database.port': 3306,
          'database.username': 'test_user',
          'database.password': 'test_password',
          'database.database': 'test_db',
        };
        return config[key] || null;
      }),
    } as unknown as jest.Mocked<ConfigService>;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatabaseService,
        {
          provide: ConfigService,
          useValue: configService,
        },
      ],
    }).compile();

    service = module.get<DatabaseService>(DatabaseService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should create a pool and test connection', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(mockClient as any);

      await service.onModuleInit();

      expect(pool.connect).toHaveBeenCalled();
      expect(mockClient.query).toHaveBeenCalledWith('SELECT NOW()');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });

  describe('onModuleDestroy', () => {
    it('should close the pool', async () => {
      pool.end.mockResolvedValue(undefined);
      service['pool'] = pool;

      await service.onModuleDestroy();

      expect(pool.end).toHaveBeenCalled();
    });
  });

  describe('query', () => {
    it('should execute a query and return result', async () => {
      const mockResult = { rows: [{ id: 1 }], rowCount: 1 };
      pool.query.mockResolvedValue(mockResult as any);
      service['pool'] = pool;

      const result = await service.query('SELECT * FROM users', [1]);

      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM users', [1]);
      expect(result).toEqual(mockResult);
    });

    it('should execute a query without parameters', async () => {
      const mockResult = { rows: [{ id: 1 }], rowCount: 1 };
      pool.query.mockResolvedValue(mockResult as any);
      service['pool'] = pool;

      const result = await service.query('SELECT * FROM users');

      expect(pool.query).toHaveBeenCalledWith('SELECT * FROM users', undefined);
      expect(result).toEqual(mockResult);
    });
  });

  describe('getClient', () => {
    it('should return a client from pool', async () => {
      const mockClient = { query: jest.fn(), release: jest.fn() };
      pool.connect.mockResolvedValue(mockClient as any);
      service['pool'] = pool;

      const client = await service.getClient();

      expect(pool.connect).toHaveBeenCalled();
      expect(client).toEqual(mockClient);
    });
  });

  describe('transaction', () => {
    it('should execute a transaction successfully', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(mockClient as any);
      service['pool'] = pool;

      const callback = jest.fn().mockResolvedValue('transaction result');
      const result = await service.transaction(callback);

      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
      expect(mockClient.release).toHaveBeenCalled();
      expect(result).toBe('transaction result');
    });

    it('should rollback on error', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
        release: jest.fn(),
      };
      pool.connect.mockResolvedValue(mockClient as any);
      service['pool'] = pool;

      const error = new Error('Transaction error');
      const callback = jest.fn().mockRejectedValue(error);

      await expect(service.transaction(callback)).rejects.toThrow(error);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(callback).toHaveBeenCalledWith(mockClient);
      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });
  });
});
