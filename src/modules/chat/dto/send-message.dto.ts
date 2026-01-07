import {
  IsUUID,
  IsOptional,
  IsEnum,
  IsString,
  IsInt,
  MinLength,
  MaxLength,
  IsArray,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum MessageType {
  TEXT = 0,
  IMAGE = 1,
  AUDIO = 2,
  VIDEO = 3,
  EMOJI = 4,
  FILE = 5,
}

export class SendMessageDto {
  @ApiProperty({ description: '会话ID' })
  @IsUUID()
  conversationId: string;

  @ApiProperty({ description: '消息类型', enum: MessageType })
  @IsEnum(MessageType)
  type: MessageType = MessageType.TEXT;

  @ApiProperty({ description: '消息内容', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  content?: string;

  @ApiProperty({ description: '媒体URL数组', required: false })
  @IsOptional()
  @IsArray()
  media_urls?: string[];

  @ApiProperty({ description: '回复的消息ID', required: false })
  @IsOptional()
  @IsUUID()
  reply_to_id?: string;
}

export class GetMessagesDto {
  @ApiProperty({ description: '页码', required: false })
  @IsOptional()
  @IsInt()
  page?: number = 1;

  @ApiProperty({ description: '每页数量', required: false })
  @IsOptional()
  @IsInt()
  limit?: number = 20;

  @ApiProperty({ description: '消息类型', required: false })
  @IsOptional()
  @IsEnum(MessageType)
  type?: MessageType;
}

export class MarkAsReadDto {
  @ApiProperty({ description: '消息ID', required: false })
  @IsUUID()
  messageId: string;
}
