import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'john_doe', description: '用户名' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(32)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: '用户名只能包含字母、数字和下划线',
  })
  username: string;

  @ApiProperty({ example: 'user@example.com', description: '电子邮箱' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!', description: '密码' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(20)
  @Matches(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/, {
    message: '密码必须包含至少一个字母和一个数字',
  })
  password: string;

  @ApiProperty({ example: 'John Doe', description: '昵称', required: false })
  @IsString()
  @MaxLength(64)
  nickname?: string;

  @ApiProperty({ example: '13800138000', description: '手机号', required: false })
  @IsString()
  phone?: string;
}
