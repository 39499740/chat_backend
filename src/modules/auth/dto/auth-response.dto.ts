import { ApiProperty } from '@nestjs/swagger';
import { UserDto } from '../../../common/dto/common.dto';

export class AuthResponseDto {
  @ApiProperty({ description: '访问令牌' })
  accessToken: string;

  @ApiProperty({ description: '刷新令牌' })
  refreshToken: string;

  @ApiProperty({ description: '用户信息' })
  user: UserDto;
}
