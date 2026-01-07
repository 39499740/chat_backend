import { IsInt, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum FeedType {
  ALL = 0,
  FRIENDS = 1,
}

export class GetFeedDto {
  @ApiProperty({ description: '页码', required: false })
  @IsOptional()
  @IsInt()
  page?: number = 1;

  @ApiProperty({ description: '每页数量', required: false })
  @IsOptional()
  @IsInt()
  limit?: number = 20;

  @ApiProperty({ description: '动态类型', enum: FeedType, required: false })
  @IsOptional()
  @IsEnum(FeedType)
  type?: FeedType = FeedType.ALL;
}
