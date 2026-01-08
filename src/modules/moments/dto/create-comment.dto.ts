import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum CommentStatus {
  NORMAL = 0,
  DELETED = 1,
}

export class CreateCommentDto {
  @ApiProperty({ description: '评论内容' })
  @IsString()
  content: string;

  @ApiProperty({ description: '父评论ID（用于回复评论）', required: false })
  @IsOptional()
  @IsString()
  parent_id?: string;
}
