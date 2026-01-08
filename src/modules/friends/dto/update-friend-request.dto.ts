import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum FriendRequestStatus {
  PENDING = 0,
  ACCEPTED = 1,
  REJECTED = 2,
}

export class UpdateFriendRequestDto {
  @ApiProperty({ description: '请求状态', enum: FriendRequestStatus })
  @IsEnum(FriendRequestStatus)
  status: FriendRequestStatus;
}
