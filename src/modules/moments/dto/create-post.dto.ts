import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum PostVisibility {
  PUBLIC = 0,
  FRIENDS_ONLY = 1,
  PRIVATE = 2,
}

export class CreatePostDto {
  @ApiProperty({ description: '动态内容', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ description: '媒体URL数组（图片/视频）', required: false, type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  media_urls?: string[];

  @ApiProperty({ description: '位置信息', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ description: '可见性', enum: PostVisibility })
  @IsEnum(PostVisibility)
  visibility: PostVisibility = PostVisibility.PUBLIC;
}
