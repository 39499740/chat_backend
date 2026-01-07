import { IsString, IsOptional, IsEnum, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { SearchType } from '../services/search.service';

export class SearchDto {
  @ApiProperty({ description: '搜索关键词' })
  @IsString()
  query: string;

  @ApiProperty({ description: '搜索类型', enum: SearchType, required: false })
  @IsOptional()
  @IsEnum(SearchType)
  type?: SearchType = SearchType.ALL;

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
}

export class SearchSuggestionsDto {
  @ApiProperty({ description: '搜索关键词' })
  @IsString()
  query: string;

  @ApiProperty({ description: '返回数量', required: false })
  @IsOptional()
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
