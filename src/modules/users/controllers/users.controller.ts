import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  UseGuards,
  ParseUUIDPipe,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from '../services/users.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UpdateUserDto } from '../dto/update-user.dto';
import { ChangePasswordDto } from '../dto/change-password.dto';
import { UpdateSettingsDto } from '../dto/update-settings.dto';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: '获取当前用户资料' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async getProfile(@CurrentUser() user: any) {
    return await this.usersService.getUserProfile(user.id);
  }

  @Put('profile')
  @ApiOperation({ summary: '更新用户资料' })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async updateProfile(
    @CurrentUser() user: any,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return await this.usersService.updateUserProfile(user.id, updateUserDto);
  }

  @Post('change-password')
  @ApiOperation({ summary: '修改密码' })
  @ApiResponse({ status: 200, description: '修改成功' })
  @ApiResponse({ status: 401, description: '当前密码不正确' })
  async changePassword(
    @CurrentUser() user: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return await this.usersService.changePassword(user.id, changePasswordDto);
  }

  @Post('avatar')
  @ApiOperation({ summary: '上传头像' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: '上传成功' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @CurrentUser() user: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // TODO: 实现文件上传到MinIO
    const avatarUrl = `http://localhost:3002/uploads/${file.filename}`;
    return await this.usersService.uploadAvatar(user.id, avatarUrl);
  }

  @Get('settings')
  @ApiOperation({ summary: '获取用户设置' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getSettings(@CurrentUser() user: any) {
    return await this.usersService.getUserSettings(user.id);
  }

  @Put('settings')
  @ApiOperation({ summary: '更新用户设置' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateSettings(
    @CurrentUser() user: any,
    @Body() updateSettingsDto: UpdateSettingsDto,
  ) {
    return await this.usersService.updateUserSettings(user.id, updateSettingsDto);
  }

  @Get('search/:keyword')
  @ApiOperation({ summary: '搜索用户' })
  @ApiResponse({ status: 200, description: '搜索成功' })
  async searchUsers(
    @CurrentUser() user: any,
    @Param('keyword') keyword: string,
  ) {
    return await this.usersService.searchUsers(keyword, user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取指定用户信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  async getUser(
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return await this.usersService.getUserById(id);
  }
}
