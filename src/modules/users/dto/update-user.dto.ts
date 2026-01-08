import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: '昵称至少需要2个字符' })
  nickname?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  gender?: number;

  @IsOptional()
  birth_date?: string;

  @IsOptional()
  @IsString()
  region?: string;
}
