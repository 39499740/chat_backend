import { ApiProperty } from '@nestjs/swagger';

export class ResponseDto<T> {
  @ApiProperty({ example: true })
  success: boolean;

  @ApiProperty({ example: 'SUCCESS' })
  code: string;

  @ApiProperty()
  data: T;

  @ApiProperty({ example: '2024-01-07T12:00:00.000Z' })
  timestamp: string;
}

export class ErrorDto {
  @ApiProperty({ example: false })
  success: boolean;

  @ApiProperty({ example: 'BAD_REQUEST' })
  code: string;

  @ApiProperty({ example: '请求参数错误' })
  message: string;

  @ApiProperty({ example: '/api/users' })
  path: string;

  @ApiProperty({ example: '2024-01-07T12:00:00.000Z' })
  timestamp: string;
}

export class PaginationDto {
  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 10 })
  totalPages: number;
}

export class UserDto {
  @ApiProperty({ description: '用户ID' })
  id: string;

  @ApiProperty({ description: '用户名' })
  username: string;

  @ApiProperty({ description: '邮箱' })
  email: string;

  @ApiProperty({ description: '昵称', required: false })
  nickname?: string;

  @ApiProperty({ description: '头像URL', required: false })
  avatar_url?: string;

  @ApiProperty({ description: '创建时间' })
  created_at: string;
}
