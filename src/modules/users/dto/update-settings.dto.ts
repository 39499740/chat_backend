import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSettingsDto {
  // 隐私设置
  @ApiProperty({ description: '资料是否可见', required: false })
  @IsOptional()
  @IsBoolean()
  privacy_profile_visible?: boolean;

  @ApiProperty({ description: '是否允许加好友', required: false })
  @IsOptional()
  @IsBoolean()
  privacy_add_friend?: boolean;

  @ApiProperty({ description: '是否可通过手机号搜索', required: false })
  @IsOptional()
  @IsBoolean()
  privacy_search_by_phone?: boolean;

  @ApiProperty({ description: '是否可通过邮箱搜索', required: false })
  @IsOptional()
  @IsBoolean()
  privacy_search_by_email?: boolean;

  @ApiProperty({ description: '在线状态是否可见', required: false })
  @IsOptional()
  @IsBoolean()
  privacy_online_visible?: boolean;

  // 通知设置
  @ApiProperty({ description: '消息通知', required: false })
  @IsOptional()
  @IsBoolean()
  notification_message?: boolean;

  @ApiProperty({ description: '好友请求通知', required: false })
  @IsOptional()
  @IsBoolean()
  notification_friend_request?: boolean;

  @ApiProperty({ description: '@提及通知', required: false })
  @IsOptional()
  @IsBoolean()
  notification_mention?: boolean;

  @ApiProperty({ description: '评论通知', required: false })
  @IsOptional()
  @IsBoolean()
  notification_comment?: boolean;

  @ApiProperty({ description: '通知声音', required: false })
  @IsOptional()
  @IsBoolean()
  notification_sound?: boolean;

  // 其他设置
  @ApiProperty({ description: '语言设置', required: false })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiProperty({ description: '主题设置', required: false })
  @IsOptional()
  @IsString()
  theme?: string;

  @ApiProperty({ description: '消息声音', required: false })
  @IsOptional()
  @IsString()
  message_sound?: string;
}
