import { IsUUID, IsString, IsOptional, IsEnum, IsBoolean, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { NotificationType } from '../services/notification.service';

export class CreateNotificationDto {
  @ApiProperty({ description: '用户ID' })
  @IsUUID()
  userId: string;

  @ApiProperty({ description: '通知类型', enum: NotificationType })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ description: '通知标题' })
  @IsString()
  title: string;

  @ApiProperty({ description: '通知内容' })
  @IsString()
  content: string;

  @ApiProperty({ description: '通知数据', required: false })
  @IsOptional()
  data?: any;

  @ApiProperty({ description: '关联实体ID', required: false })
  @IsOptional()
  @IsUUID()
  relatedId?: string;

  @ApiProperty({ description: '关联实体类型', required: false })
  @IsOptional()
  @IsString()
  relatedType?: string;

  @ApiProperty({ description: '元数据', required: false })
  @IsOptional()
  metadata?: any;
}

export class GetNotificationsDto {
  @ApiProperty({ description: '页码', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({ description: '每页数量', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 20;

  @ApiProperty({ description: '通知类型', required: false })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType;

  @ApiProperty({ description: '仅未读', required: false })
  @IsOptional()
  @IsBoolean()
  onlyUnread?: boolean;
}
