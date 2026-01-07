import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty({ description: '当前密码' })
  @IsString()
  @MinLength(6, { message: '密码至少需要6个字符' })
  currentPassword: string;

  @ApiProperty({ description: '新密码' })
  @IsString()
  @MinLength(6, { message: '密码至少需要6个字符' })
  newPassword: string;
}
