import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({ example: 'user@example.com', description: '登录账号（邮箱或用户名或手机号）' })
  @IsString()
  @IsNotEmpty()
  account: string;

  @ApiProperty({ example: 'Password123!', description: '密码' })
  @IsString()
  @IsNotEmpty()
  password: string;
}
