import { IsUUID, IsEnum, IsString, IsOptional, MinLength, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum ConversationType {
  PRIVATE = 0, // 单聊
  GROUP = 1, // 群聊
}

export enum MemberRole {
  MEMBER = 0,
  ADMIN = 1,
  OWNER = 2,
}

export class CreateConversationDto {
  @ApiProperty({ description: '会话类型', enum: ConversationType })
  @IsEnum(ConversationType)
  type: ConversationType;

  @ApiProperty({ description: '好友ID（单聊时使用）', required: false })
  @IsOptional()
  @IsUUID()
  friendId?: string;

  @ApiProperty({ description: '会话名称（群聊时使用）', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  name?: string;

  @ApiProperty({ description: '初始成员ID列表（群聊时使用）', required: false })
  @IsOptional()
  @IsArray()
  @IsUUID(4, { each: true })
  memberIds?: string[];
}
