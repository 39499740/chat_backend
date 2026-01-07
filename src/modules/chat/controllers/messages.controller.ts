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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { MessagesService } from '../services/messages.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { SendMessageDto, GetMessagesDto, MarkAsReadDto } from '../dto/send-message.dto';

@ApiTags('chat')
@Controller('chat')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  @ApiOperation({ summary: '发送消息' })
  @ApiResponse({ status: 201, description: '发送成功' })
  async sendMessage(@CurrentUser() user: any, @Body() sendMessageDto: SendMessageDto) {
    return await this.messagesService.sendMessage(
      user.id,
      sendMessageDto.conversationId,
      sendMessageDto,
    );
  }

  @Get('conversations/:conversationId')
  @ApiOperation({ summary: '获取消息列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: [0, 1, 2, 3, 4, 5] })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getMessages(
    @CurrentUser() user: any,
    @Param('conversationId') conversationId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('type') type?: number,
  ) {
    return await this.messagesService.getMessages(conversationId, user.id, { page, limit, type });
  }

  @Get('messages/:messageId')
  @ApiOperation({ summary: '获取消息详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getMessage(@CurrentUser() user: any, @Param('messageId') messageId: string) {
    return await this.messagesService.getMessage(messageId, user.id);
  }

  @Get('messages/:messageId/media')
  @ApiOperation({ summary: '获取消息的媒体信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getMessageMediaInfo(@CurrentUser() user: any, @Param('messageId') messageId: string) {
    return await this.messagesService.getMessageMediaInfo(messageId, user.id);
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: '删除消息' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteMessage(@CurrentUser() user: any, @Param('messageId') messageId: string) {
    return await this.messagesService.deleteMessage(messageId, user.id);
  }

  @Post('messages/:messageId/read')
  @ApiOperation({ summary: '标记消息为已读' })
  @ApiResponse({ status: 200, description: '标记成功' })
  async markAsRead(
    @CurrentUser() user: any,
    @Param('messageId') messageId: string,
    @Body() markAsReadDto: MarkAsReadDto,
  ) {
    return await this.messagesService.markAsRead(messageId, user.id);
  }
}
