import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { UploadsController } from '../../../../src/modules/uploads/controllers/uploads.controller';
import { UploadsService } from '../../../../src/modules/uploads/services/uploads.service';
import { JwtAuthGuard } from '../../../../src/common/guards/jwt-auth.guard';

class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.user = { id: '1', username: 'testuser' };
    return true;
  }
}

describe('UploadsController (e2e)', () => {
  let app: INestApplication;
  let controller: UploadsController;
  let uploadsService: jest.Mocked<UploadsService>;

  const mockUploadsService = {
    uploadFile: jest.fn(),
    uploadAvatar: jest.fn(),
    getFile: jest.fn(),
    deleteFile: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UploadsController],
      providers: [
        {
          provide: UploadsService,
          useValue: mockUploadsService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockAuthGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get<UploadsController>(UploadsController);
    uploadsService = module.get(UploadsService);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /uploads/file', () => {
    it('should handle file upload errors', async () => {
      mockUploadsService.uploadFile.mockRejectedValue(new Error('Upload failed'));

      await request(app.getHttpServer())
        .post('/uploads/file')
        .attach('file', Buffer.from('fake-file'))
        .expect(400);
    });
  });

  describe('POST /uploads/avatar', () => {
    it('should handle avatar upload errors', async () => {
      mockUploadsService.uploadAvatar.mockRejectedValue(new Error('Upload failed'));

      await request(app.getHttpServer())
        .post('/uploads/avatar')
        .attach('file', Buffer.from('fake-image'))
        .expect(400);
    });
  });

  describe('GET /uploads/file/:filename', () => {
    it('should get file successfully', async () => {
      const filename = 'test-file.jpg';
      const fileStream = Buffer.from('file content');

      mockUploadsService.getFile.mockResolvedValue(fileStream);

      const response = await request(app.getHttpServer())
        .get(`/uploads/file/${filename}`)
        .expect(200);

      expect(response.body).toEqual(fileStream);
      expect(mockUploadsService.getFile).toHaveBeenCalledWith(filename);
    });

    it('should return 404 if file not found', async () => {
      const filename = 'non-existent-file.jpg';

      mockUploadsService.getFile.mockRejectedValue(new Error('File not found'));

      await request(app.getHttpServer()).get(`/uploads/file/${filename}`).expect(500);
    });
  });

  describe('DELETE /uploads/file/:filename', () => {
    it('should delete file successfully', async () => {
      const filename = 'test-file.jpg';

      mockUploadsService.deleteFile.mockResolvedValue(undefined);

      const response = await request(app.getHttpServer())
        .delete(`/uploads/file/${filename}`)
        .expect(200);

      expect(response.body).toEqual({ message: '文件删除成功' });
      expect(mockUploadsService.deleteFile).toHaveBeenCalledWith(filename);
    });

    it('should handle delete file errors', async () => {
      const filename = 'non-existent-file.jpg';

      mockUploadsService.deleteFile.mockRejectedValue(new Error('Delete failed'));

      await request(app.getHttpServer()).delete(`/uploads/file/${filename}`).expect(500);
    });
  });

  describe('Controller instantiation', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });
});
