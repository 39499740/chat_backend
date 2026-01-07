import { IsUUID, IsString, IsOptional, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendFriendRequestDto {
  @ApiProperty({ description: '好友ID' })
  @IsUUID()
  friendId: string;

  @ApiProperty({ description: '申请消息', required: false })
  @IsOptional()
  @IsString()
  @MinLength(1)
  message?: string;
}
