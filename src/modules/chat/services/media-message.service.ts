import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { DatabaseService } from '../../../common/database/database.service';

@Injectable()
export class MediaMessageService {
  private readonly logger = new Logger(MediaMessageService.name);

  // 允许的图片格式
  private readonly IMAGE_TYPES = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
  ];
  // 允许的音频格式
  private readonly AUDIO_TYPES = [
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/ogg',
    'audio/webm',
  ];
  // 允许的视频格式
  private readonly VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime', 'video/ogg'];
  // 允许的文件格式
  private readonly FILE_TYPES = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/zip',
    'application/x-rar-compressed',
    'text/plain',
  ];

  constructor(private db: DatabaseService) {}

  /**
   * 验证媒体消息类型
   */
  validateMediaType(type: number, mediaType?: string): boolean {
    switch (type) {
      case 1: // IMAGE
        return mediaType ? this.IMAGE_TYPES.includes(mediaType) : true;
      case 2: // AUDIO
        return mediaType ? this.AUDIO_TYPES.includes(mediaType) : true;
      case 3: // VIDEO
        return mediaType ? this.VIDEO_TYPES.includes(mediaType) : true;
      case 4: // EMOJI
        return true;
      case 5: // FILE
        return mediaType ? this.FILE_TYPES.includes(mediaType) : true;
      default:
        return true;
    }
  }

  /**
   * 验证媒体URL是否有效
   */
  async validateMediaUrls(urls: string[]): Promise<boolean> {
    for (const url of urls) {
      // 检查URL是否是有效的MinIO URL
      if (!this.isValidMinIOUrl(url)) {
        this.logger.warn(`Invalid media URL: ${url}`);
        return false;
      }

      // 可以在这里添加额外的验证，例如检查文件是否存在
      // const fileExists = await this.checkFileExists(url);
      // if (!fileExists) {
      //   this.logger.warn(`Media file does not exist: ${url}`);
      //   return false;
      // }
    }

    return true;
  }

  /**
   * 检查是否是有效的MinIO URL
   */
  private isValidMinIOUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      // 检查是否是HTTP或HTTPS协议
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return false;
      }

      // 可以添加更多的验证逻辑
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * 处理图片消息（生成缩略图等）
   */
  async processImageMessage(messageId: string, mediaUrls: string[]): Promise<void> {
    try {
      // TODO: 实现缩略图生成逻辑
      // for (const url of mediaUrls) {
      //   const thumbnailUrl = await this.generateThumbnail(url);
      //   await this.saveThumbnail(messageId, url, thumbnailUrl);
      // }
      void mediaUrls;

      this.logger.log(`Image message processed: ${messageId}`);
    } catch (error) {
      this.logger.error(
        `Error processing image message: ${error instanceof Error ? error.message : String(error)}`,
      );
      // 不抛出错误，允许消息发送成功
    }
  }

  /**
   * 处理视频消息（生成缩略图等）
   */
  async processVideoMessage(messageId: string, mediaUrls: string[]): Promise<void> {
    try {
      // TODO: 实现视频缩略图生成逻辑
      // for (const url of mediaUrls) {
      //   const thumbnailUrl = await this.generateVideoThumbnail(url);
      //   await this.saveThumbnail(messageId, url, thumbnailUrl);
      //
      //   // TODO: 获取视频元数据（时长、分辨率等）
      //   const metadata = await this.getVideoMetadata(url);
      //   await this.saveVideoMetadata(messageId, url, metadata);
      // }
      void mediaUrls;

      this.logger.log(`Video message processed: ${messageId}`);
    } catch (error) {
      this.logger.error(
        `Error processing video message: ${error instanceof Error ? error.message : String(error)}`,
      );
      // 不抛出错误，允许消息发送成功
    }
  }

  /**
   * 处理音频消息（获取元数据）
   */
  async processAudioMessage(messageId: string, mediaUrls: string[]): Promise<void> {
    try {
      // TODO: 获取音频元数据（时长、格式等）
      // for (const url of mediaUrls) {
      //   const metadata = await this.getAudioMetadata(url);
      //   await this.saveAudioMetadata(messageId, url, metadata);
      // }
      void mediaUrls;

      this.logger.log(`Audio message processed: ${messageId}`);
    } catch (error) {
      this.logger.error(
        `Error processing audio message: ${error instanceof Error ? error.message : String(error)}`,
      );
      // 不抛出错误，允许消息发送成功
    }
  }

  /**
   * 处理表情消息
   */
  async processEmojiMessage(messageId: string, content: string): Promise<void> {
    try {
      // TODO: 验证表情是否有效
      // 可以使用表情库或自定义表情列表进行验证
      void content;

      this.logger.log(`Emoji message processed: ${messageId}`);
    } catch (error) {
      this.logger.error(
        `Error processing emoji message: ${error instanceof Error ? error.message : String(error)}`,
      );
      // 不抛出错误，允许消息发送成功
    }
  }

  /**
   * 处理文件消息（获取文件信息）
   */
  async processFileMessage(messageId: string, mediaUrls: string[]): Promise<void> {
    try {
      // TODO: 获取文件元数据（文件名、大小、类型等）
      // for (const url of mediaUrls) {
      //   const metadata = await this.getFileMetadata(url);
      //   await this.saveFileMetadata(messageId, url, metadata);
      // }
      void mediaUrls;

      this.logger.log(`File message processed: ${messageId}`);
    } catch (error) {
      this.logger.error(
        `Error processing file message: ${error instanceof Error ? error.message : String(error)}`,
      );
      // 不抛出错误，允许消息发送成功
    }
  }

  /**
   * 验证消息内容是否符合类型要求
   */
  validateMessageContent(type: number, content?: string, mediaUrls?: string[]): void {
    switch (type) {
      case 0: // TEXT
        if (!content || content.trim().length === 0) {
          throw new BadRequestException('文本消息内容不能为空');
        }
        if (content.length > 5000) {
          throw new BadRequestException('文本消息内容不能超过5000个字符');
        }
        break;

      case 1: // IMAGE
        if (!mediaUrls || mediaUrls.length === 0) {
          throw new BadRequestException('图片消息需要提供图片URL');
        }
        if (mediaUrls.length > 9) {
          throw new BadRequestException('图片消息最多只能发送9张图片');
        }
        break;

      case 2: // AUDIO
        if (!mediaUrls || mediaUrls.length === 0) {
          throw new BadRequestException('音频消息需要提供音频URL');
        }
        break;

      case 3: // VIDEO
        if (!mediaUrls || mediaUrls.length === 0) {
          throw new BadRequestException('视频消息需要提供视频URL');
        }
        break;

      case 4: // EMOJI
        if (!content || content.trim().length === 0) {
          throw new BadRequestException('表情消息需要提供表情内容');
        }
        break;

      case 5: // FILE
        if (!mediaUrls || mediaUrls.length === 0) {
          throw new BadRequestException('文件消息需要提供文件URL');
        }
        break;

      default:
        throw new BadRequestException('未知的消息类型');
    }
  }

  /**
   * 获取消息的媒体信息
   */
  async getMessageMediaInfo(messageId: string): Promise<any[]> {
    const result = await this.db.query(
      `SELECT type, content, media_urls FROM messages WHERE id = $1 AND is_deleted = false`,
      [messageId],
    );

    if (result.rows.length === 0) {
      throw new Error('消息不存在');
    }

    const message = result.rows[0];
    const mediaInfo: any[] = [];

    if (message.type === 1 && message.media_urls) {
      // 图片消息
      mediaInfo.push(
        ...message.media_urls.map((url: string) => ({
          type: 'image',
          url,
          thumbnail: this.getThumbnailUrl(url),
        })),
      );
    } else if (message.type === 2 && message.media_urls) {
      // 音频消息
      mediaInfo.push(
        ...message.media_urls.map((url: string) => ({
          type: 'audio',
          url,
          duration: 0, // TODO: 从数据库获取
        })),
      );
    } else if (message.type === 3 && message.media_urls) {
      // 视频消息
      mediaInfo.push(
        ...message.media_urls.map((url: string) => ({
          type: 'video',
          url,
          thumbnail: this.getThumbnailUrl(url),
          duration: 0, // TODO: 从数据库获取
        })),
      );
    } else if (message.type === 5 && message.media_urls) {
      // 文件消息
      mediaInfo.push(
        ...message.media_urls.map((url: string) => ({
          type: 'file',
          url,
          filename: this.getFilenameFromUrl(url),
          size: 0, // TODO: 从数据库获取
        })),
      );
    }

    return mediaInfo;
  }

  /**
   * 获取缩略图URL
   */
  private getThumbnailUrl(url: string): string {
    // TODO: 实现缩略图URL生成逻辑
    // 例如：http://minio.example.com/bucket/path/file.jpg -> http://minio.example.com/bucket/thumbnails/path/file.jpg
    return url;
  }

  /**
   * 从URL中提取文件名
   */
  private getFilenameFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const parts = pathname.split('/');
      return parts[parts.length - 1] || 'unknown';
    } catch {
      return 'unknown';
    }
  }
}
