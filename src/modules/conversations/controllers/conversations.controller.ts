import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  UseGuards,
  Body,
  Query,
  ParseIntPipe,
  DefaultValuePipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ConversationsService } from '../services/conversations.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CreateConversationDto } from '../dto/create-conversation.dto';
import { UpdateConversationDto } from '../dto/update-conversation.dto';

@ApiTags('conversations')
@Controller('conversations')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Post()
  @ApiOperation({ summary: '创建会话' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async createConversation(
    @CurrentUser() user: any,
    @Body() createConversationDto: CreateConversationDto,
  ) {
    return await this.conversationsService.createConversation(user.id, createConversationDto);
  }

  @Get()
  @ApiOperation({ summary: '获取会话列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: [0, 1] })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getConversations(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('type') type: number,
  ) {
    return await this.conversationsService.getConversations(user.id, { page, limit, type });
  }

  @Get(':conversationId')
  @ApiOperation({ summary: '获取会话详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getConversationDetail(
    @CurrentUser() user: any,
    @Param('conversationId') conversationId: string,
  ) {
    return await this.conversationsService.getConversationDetail(conversationId, user.id);
  }

  @Put(':conversationId')
  @ApiOperation({ summary: '更新会话' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateConversation(
    @CurrentUser() user: any,
    @Param('conversationId') conversationId: string,
    @Body() updateConversationDto: UpdateConversationDto,
  ) {
    return await this.conversationsService.updateConversation(
      conversationId,
      user.id,
      updateConversationDto,
    );
  }

  @Delete(':conversationId')
  @ApiOperation({ summary: '退出会话' })
  @ApiResponse({ status: 200, description: '退出成功' })
  async leaveConversation(
    @CurrentUser() user: any,
    @Param('conversationId') conversationId: string,
  ) {
    return await this.conversationsService.leaveConversation(conversationId, user.id);
  }

  @Post(':conversationId/members')
  @ApiOperation({ summary: '添加会话成员' })
  @ApiResponse({ status: 201, description: '添加成功' })
  async addMember(
    @CurrentUser() user: any,
    @Param('conversationId') conversationId: string,
    @Body('memberId') memberUserId: string,
  ) {
    return await this.conversationsService.addMember(conversationId, user.id, memberUserId);
  }

  @Delete(':conversationId/members/:memberId')
  @ApiOperation({ summary: '移除会话成员' })
  @ApiResponse({ status: 200, description: '移除成功' })
  async removeMember(
    @CurrentUser() user: any,
    @Param('conversationId') conversationId: string,
    @Param('memberId') memberUserId: string,
  ) {
    return await this.conversationsService.removeMember(conversationId, user.id, memberUserId);
  }
}
