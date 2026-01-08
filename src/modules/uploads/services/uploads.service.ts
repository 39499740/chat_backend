import { Injectable, NotFoundException } from '@nestjs/common';
import { Client } from 'minio';
import { v4 as uuidv4 } from 'uuid';
import { ConfigService } from '@nestjs/config';
import { DatabaseService } from '../../../common/database/database.service';

@Injectable()
export class UploadsService {
  private minioClient: Client;
  private bucketName: string;

  constructor(
    private configService: ConfigService,
    private db: DatabaseService,
  ) {
    const endpoint = this.configService.get<string>('minio.endpoint');
    const port = this.configService.get<number>('minio.port');
    const accessKey = this.configService.get<string>('minio.accessKey');
    const secretKey = this.configService.get<string>('minio.secretKey');
    const useSSL = this.configService.get<boolean>('minio.useSSL');
    this.bucketName = this.configService.get<string>('minio.bucket');

    this.minioClient = new Client({
      endPoint: endpoint,
      port: port,
      useSSL: useSSL,
      accessKey: accessKey,
      secretKey: secretKey,
    });
  }

  async onModuleInit() {
    await this.ensureBucketExists();
  }

  private async ensureBucketExists() {
    const exists = await this.minioClient.bucketExists(this.bucketName);
    if (!exists) {
      await this.minioClient.makeBucket(this.bucketName);
    }
  }

  async uploadFile(file: Express.Multer.File, userId: string) {
    const fileName = `${userId}/${uuidv4()}-${file.originalname}`;
    const metaData = {
      'Content-Type': file.mimetype,
    };

    await this.minioClient.putObject(this.bucketName, fileName, file.buffer, file.size, metaData);

    const fileUrl = await this.getFileUrl(fileName);

    // 保存到数据库
    await this.saveFileToDatabase(file, userId, fileName, fileUrl);

    return { url: fileUrl, fileName };
  }

  async uploadAvatar(file: Express.Multer.File, userId: string) {
    const ext = file.originalname.split('.').pop();
    const fileName = `avatars/${userId}-${uuidv4()}.${ext}`;
    const metaData = {
      'Content-Type': file.mimetype,
    };

    await this.minioClient.putObject(this.bucketName, fileName, file.buffer, file.size, metaData);

    const fileUrl = await this.getFileUrl(fileName);

    return { url: fileUrl };
  }

  private async getFileUrl(fileName: string): Promise<string> {
    const port = this.configService.get<number>('minio.port');
    const useSSL = this.configService.get<boolean>('minio.useSSL');
    const protocol = useSSL ? 'https' : 'http';
    const portSuffix = (port === 80 && !useSSL) || (port === 443 && useSSL) ? '' : `:${port}`;

    return `${protocol}://localhost${portSuffix}/${this.bucketName}/${fileName}`;
  }

  private async saveFileToDatabase(
    file: Express.Multer.File,
    userId: string,
    fileName: string,
    fileUrl: string,
  ) {
    const result = await this.db.query(
      `INSERT INTO media_files (user_id, file_name, file_type, file_size, file_url, media_type)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        userId,
        file.originalname,
        file.mimetype,
        file.size,
        fileUrl,
        this.getMediaType(file.mimetype),
      ],
    );
    return result.rows[0];
  }

  private getMediaType(mimeType: string): number {
    if (mimeType.startsWith('image/')) return 0;
    if (mimeType.startsWith('video/')) return 1;
    if (mimeType.startsWith('audio/')) return 2;
    return 3; // 文件
  }

  async deleteFile(fileName: string) {
    await this.minioClient.removeObject(this.bucketName, fileName);
  }

  async getFile(fileName: string) {
    try {
      return await this.minioClient.getObject(this.bucketName, fileName);
    } catch (error) {
      throw new NotFoundException('文件不存在');
    }
  }
}
