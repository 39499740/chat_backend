import { IsInt, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GetConversationsDto {
  @ApiProperty({ description: '页码', required: false })
  @IsOptional()
  @IsInt()
  page?: number = 1;

  @ApiProperty({ description: '每页数量', required: false })
  @IsOptional()
  @IsInt()
  limit?: number = 20;

  @ApiProperty({ description: '会话类型', required: false })
  @IsOptional()
  type?: number;
}
