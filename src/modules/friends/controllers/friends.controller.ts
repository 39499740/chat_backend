import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { FriendsService } from '../services/friends.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { SendFriendRequestDto } from '../dto/send-friend-request.dto';
import { UpdateFriendRequestDto } from '../dto/update-friend-request.dto';

@ApiTags('friends')
@Controller('friends')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class FriendsController {
  constructor(private readonly friendsService: FriendsService) {}

  @Post('request')
  @ApiOperation({ summary: '发送好友请求' })
  @ApiResponse({ status: 201, description: '发送成功' })
  async sendRequest(
    @CurrentUser() user: any,
    @Body() sendFriendRequestDto: SendFriendRequestDto,
  ) {
    return await this.friendsService.sendFriendRequest(
      user.id,
      sendFriendRequestDto.friendId,
      sendFriendRequestDto.message,
    );
  }

  @Post('request/:requestId/accept')
  @ApiOperation({ summary: '接受好友请求' })
  @ApiResponse({ status: 200, description: '接受成功' })
  async acceptRequest(
    @CurrentUser() user: any,
    @Param('requestId') requestId: string,
  ) {
    return await this.friendsService.acceptFriendRequest(user.id, requestId);
  }

  @Post('request/:requestId/reject')
  @ApiOperation({ summary: '拒绝好友请求' })
  @ApiResponse({ status: 200, description: '拒绝成功' })
  async rejectRequest(
    @CurrentUser() user: any,
    @Param('requestId') requestId: string,
  ) {
    return await this.friendsService.rejectFriendRequest(user.id, requestId);
  }

  @Get()
  @ApiOperation({ summary: '获取好友列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getFriendsList(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return await this.friendsService.getFriendsList(user.id, page, limit);
  }

  @Get('pending')
  @ApiOperation({ summary: '获取待处理的好友请求' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPendingRequests(@CurrentUser() user: any) {
    return await this.friendsService.getPendingRequests(user.id);
  }

  @Get('sent')
  @ApiOperation({ summary: '获取已发送的好友请求' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getSentRequests(@CurrentUser() user: any) {
    return await this.friendsService.getSentRequests(user.id);
  }

  @Delete(':friendId')
  @ApiOperation({ summary: '删除好友' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteFriend(
    @CurrentUser() user: any,
    @Param('friendId') friendId: string,
  ) {
    return await this.friendsService.deleteFriend(user.id, friendId);
  }

  @Get('check/:friendId')
  @ApiOperation({ summary: '检查是否为好友' })
  @ApiResponse({ status: 200, description: '检查成功' })
  async checkFriendship(
    @CurrentUser() user: any,
    @Param('friendId') friendId: string,
  ) {
    return await this.friendsService.checkFriendship(user.id, friendId);
  }
}
