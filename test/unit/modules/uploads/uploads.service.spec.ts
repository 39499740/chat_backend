import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { UploadsService } from '../../../../src/modules/uploads/services/uploads.service';
import { DatabaseService } from '../../../../src/common/database/database.service';
import { ConfigService } from '@nestjs/config';
import { Client } from 'minio';

describe('UploadsService', () => {
  let service: UploadsService;
  let mockDb: any;
  let mockMinioClient: any;
  let mockConfigService: any;

  beforeEach(async () => {
    mockMinioClient = {
      bucketExists: jest.fn(),
      makeBucket: jest.fn(),
      putObject: jest.fn(),
      removeObject: jest.fn(),
      getObject: jest.fn(),
    };

    mockConfigService = {
      get: jest.fn((key: string) => {
        const config = {
          'minio.endpoint': 'localhost',
          'minio.port': 9000,
          'minio.accessKey': 'accessKey',
          'minio.secretKey': 'secretKey',
          'minio.useSSL': false,
          'minio.bucket': 'uploads',
        };
        return config[key];
      }),
    };

    mockDb = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UploadsService,
        {
          provide: DatabaseService,
          useValue: mockDb,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<UploadsService>(UploadsService);
    (service as any).minioClient = mockMinioClient;
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('should create bucket if it does not exist', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(false);
      mockMinioClient.makeBucket.mockResolvedValue(undefined);

      await service.onModuleInit();

      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('uploads');
      expect(mockMinioClient.makeBucket).toHaveBeenCalledWith('uploads');
    });

    it('should not create bucket if it already exists', async () => {
      mockMinioClient.bucketExists.mockResolvedValue(true);

      await service.onModuleInit();

      expect(mockMinioClient.bucketExists).toHaveBeenCalledWith('uploads');
      expect(mockMinioClient.makeBucket).not.toHaveBeenCalled();
    });
  });

  describe('uploadFile', () => {
    it('should upload file successfully', async () => {
      const file = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;
      const userId = '1';

      mockMinioClient.putObject.mockResolvedValue(undefined);
      mockDb.query.mockResolvedValue({
        rows: [{ id: '1' }],
      });

      const result = await service.uploadFile(file, userId);

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('fileName');
      expect(mockMinioClient.putObject).toHaveBeenCalled();
      expect(mockDb.query).toHaveBeenCalled();
    });

    it('should generate correct file name with userId and UUID', async () => {
      const file = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;
      const userId = '1';

      mockMinioClient.putObject.mockResolvedValue(undefined);
      mockDb.query.mockResolvedValue({
        rows: [{ id: '1' }],
      });

      await service.uploadFile(file, userId);

      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'uploads',
        expect.stringMatching(/^1\/[0-9a-f-]+-test\.jpg$/),
        file.buffer,
        file.size,
        { 'Content-Type': 'image/jpeg' },
      );
    });

    it('should set correct metadata for file', async () => {
      const file = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;
      const userId = '1';

      mockMinioClient.putObject.mockResolvedValue(undefined);
      mockDb.query.mockResolvedValue({
        rows: [{ id: '1' }],
      });

      await service.uploadFile(file, userId);

      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'uploads',
        expect.any(String),
        file.buffer,
        file.size,
        { 'Content-Type': 'image/jpeg' },
      );
    });

    it('should save file to database with correct media type', async () => {
      const file = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;
      const userId = '1';

      mockMinioClient.putObject.mockResolvedValue(undefined);
      mockDb.query.mockResolvedValue({
        rows: [{ id: '1' }],
      });

      await service.uploadFile(file, userId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO media_files'),
        expect.arrayContaining([userId, 'test.jpg', 'image/jpeg', 1024, expect.any(String), 0]),
      );
    });

    it('should handle video file', async () => {
      const file = {
        originalname: 'test.mp4',
        mimetype: 'video/mp4',
        size: 2048,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;
      const userId = '1';

      mockMinioClient.putObject.mockResolvedValue(undefined);
      mockDb.query.mockResolvedValue({
        rows: [{ id: '1' }],
      });

      await service.uploadFile(file, userId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO media_files'),
        expect.arrayContaining([userId, 'test.mp4', 'video/mp4', 2048, expect.any(String), 1]),
      );
    });

    it('should handle audio file', async () => {
      const file = {
        originalname: 'test.mp3',
        mimetype: 'audio/mpeg',
        size: 512,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;
      const userId = '1';

      mockMinioClient.putObject.mockResolvedValue(undefined);
      mockDb.query.mockResolvedValue({
        rows: [{ id: '1' }],
      });

      await service.uploadFile(file, userId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO media_files'),
        expect.arrayContaining([userId, 'test.mp3', 'audio/mpeg', 512, expect.any(String), 2]),
      );
    });

    it('should handle other file types', async () => {
      const file = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 4096,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;
      const userId = '1';

      mockMinioClient.putObject.mockResolvedValue(undefined);
      mockDb.query.mockResolvedValue({
        rows: [{ id: '1' }],
      });

      await service.uploadFile(file, userId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO media_files'),
        expect.arrayContaining([
          userId,
          'test.pdf',
          'application/pdf',
          4096,
          expect.any(String),
          3,
        ]),
      );
    });

    it('should return file URL and file name', async () => {
      const file = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;
      const userId = '1';

      mockMinioClient.putObject.mockResolvedValue(undefined);
      mockDb.query.mockResolvedValue({
        rows: [{ id: '1' }],
      });

      const result = await service.uploadFile(file, userId);

      expect(result.url).toMatch(/^http:\/\/localhost:9000\/uploads\//);
      expect(result.fileName).toMatch(/^1\/[0-9a-f-]+-test\.jpg$/);
    });
  });

  describe('uploadAvatar', () => {
    it('should upload avatar successfully', async () => {
      const file = {
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;
      const userId = '1';

      mockMinioClient.putObject.mockResolvedValue(undefined);

      const result = await service.uploadAvatar(file, userId);

      expect(result).toHaveProperty('url');
      expect(mockMinioClient.putObject).toHaveBeenCalled();
    });

    it('should generate correct avatar file name', async () => {
      const file = {
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;
      const userId = '1';

      mockMinioClient.putObject.mockResolvedValue(undefined);

      await service.uploadAvatar(file, userId);

      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'uploads',
        expect.stringMatching(/^avatars\/1-[0-9a-f-]+\.jpg$/),
        file.buffer,
        file.size,
        { 'Content-Type': 'image/jpeg' },
      );
    });

    it('should use correct file extension from original name', async () => {
      const file = {
        originalname: 'avatar.png',
        mimetype: 'image/png',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;
      const userId = '1';

      mockMinioClient.putObject.mockResolvedValue(undefined);

      await service.uploadAvatar(file, userId);

      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'uploads',
        expect.stringMatching(/\.png$/),
        file.buffer,
        file.size,
        { 'Content-Type': 'image/png' },
      );
    });

    it('should set correct metadata for avatar', async () => {
      const file = {
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;
      const userId = '1';

      mockMinioClient.putObject.mockResolvedValue(undefined);

      await service.uploadAvatar(file, userId);

      expect(mockMinioClient.putObject).toHaveBeenCalledWith(
        'uploads',
        expect.any(String),
        file.buffer,
        file.size,
        { 'Content-Type': 'image/jpeg' },
      );
    });

    it('should return correct avatar URL', async () => {
      const file = {
        originalname: 'avatar.jpg',
        mimetype: 'image/jpeg',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File;
      const userId = '1';

      mockMinioClient.putObject.mockResolvedValue(undefined);

      const result = await service.uploadAvatar(file, userId);

      expect(result.url).toMatch(/^http:\/\/localhost:9000\/uploads\/avatars\//);
    });
  });

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const fileName = '1/test.jpg';

      mockMinioClient.removeObject.mockResolvedValue(undefined);

      await service.deleteFile(fileName);

      expect(mockMinioClient.removeObject).toHaveBeenCalledWith('uploads', fileName);
    });
  });

  describe('getFile', () => {
    it('should get file successfully', async () => {
      const fileName = '1/test.jpg';
      const fileStream = Buffer.from('file content');

      mockMinioClient.getObject.mockResolvedValue(fileStream);

      const result = await service.getFile(fileName);

      expect(result).toBe(fileStream);
      expect(mockMinioClient.getObject).toHaveBeenCalledWith('uploads', fileName);
    });

    it('should throw NotFoundException if file does not exist', async () => {
      const fileName = 'non-existent.jpg';

      mockMinioClient.getObject.mockRejectedValue(new Error('File not found'));

      await expect(service.getFile(fileName)).rejects.toThrow(NotFoundException);
      await expect(service.getFile(fileName)).rejects.toThrow('文件不存在');
    });
  });

  describe('getFileUrl (private method)', () => {
    it('should generate correct HTTP URL for non-SSL', async () => {
      const fileName = '1/test.jpg';

      const url = await (service as any).getFileUrl(fileName);

      expect(url).toBe('http://localhost:9000/uploads/1/test.jpg');
    });

    it('should generate correct HTTPS URL for SSL', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config = {
          'minio.endpoint': 'localhost',
          'minio.port': 443,
          'minio.useSSL': true,
          'minio.bucket': 'uploads',
        };
        return config[key];
      });

      const serviceSSL = new UploadsService(mockConfigService, mockDb);
      (serviceSSL as any).minioClient = mockMinioClient;

      const fileName = '1/test.jpg';
      const url = await (serviceSSL as any).getFileUrl(fileName);

      expect(url).toBe('https://localhost/uploads/1/test.jpg');
    });

    it('should not include port for standard HTTP port', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        const config = {
          'minio.endpoint': 'localhost',
          'minio.port': 80,
          'minio.useSSL': false,
          'minio.bucket': 'uploads',
        };
        return config[key];
      });

      const serviceHTTP = new UploadsService(mockConfigService, mockDb);
      (serviceHTTP as any).minioClient = mockMinioClient;

      const fileName = '1/test.jpg';
      const url = await (serviceHTTP as any).getFileUrl(fileName);

      expect(url).toBe('http://localhost/uploads/1/test.jpg');
    });
  });

  describe('getMediaType (private method)', () => {
    it('should return 0 for image files', () => {
      const result = (service as any).getMediaType('image/jpeg');
      expect(result).toBe(0);
    });

    it('should return 1 for video files', () => {
      const result = (service as any).getMediaType('video/mp4');
      expect(result).toBe(1);
    });

    it('should return 2 for audio files', () => {
      const result = (service as any).getMediaType('audio/mpeg');
      expect(result).toBe(2);
    });

    it('should return 3 for other file types', () => {
      const result = (service as any).getMediaType('application/pdf');
      expect(result).toBe(3);
    });
  });
});
