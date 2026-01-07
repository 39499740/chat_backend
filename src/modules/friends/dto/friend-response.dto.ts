import { ApiProperty } from '@nestjs/swagger';

export class FriendResponseDto {
  @ApiProperty({ description: '好友ID' })
  id: string;

  @ApiProperty({ description: '用户ID' })
  userId: string;

  @ApiProperty({ description: '用户名' })
  username: string;

  @ApiProperty({ description: '昵称' })
  nickname: string;

  @ApiProperty({ description: '头像URL' })
  avatar_url?: string;

  @ApiProperty({ description: '关系状态' })
  status: number;
}
