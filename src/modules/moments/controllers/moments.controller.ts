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
import { MomentsService } from '../services/moments.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CreatePostDto } from '../dto/create-post.dto';
import { GetFeedDto } from '../dto/get-feed.dto';

@ApiTags('moments')
@Controller('moments')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class MomentsController {
  constructor(private readonly momentsService: MomentsService) {}

  @Post('posts')
  @ApiOperation({ summary: '发布动态' })
  @ApiResponse({ status: 201, description: '发布成功' })
  async createPost(
    @CurrentUser() user: any,
    @Body() createPostDto: CreatePostDto,
  ) {
    return await this.momentsService.createPost(user.id, createPostDto);
  }

  @Get('feed')
  @ApiOperation({ summary: '获取动态列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'type', required: false, enum: [0, 1] })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getFeed(
    @CurrentUser() user: any,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
    @Query('type', new DefaultValuePipe(0), ParseIntPipe) type: number,
  ) {
    return await this.momentsService.getFeed(user.id, { page, limit, type });
  }

  @Get('posts/user/:userId')
  @ApiOperation({ summary: '获取指定用户的动态' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserPosts(
    @CurrentUser() user: any,
    @Param('userId') userId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return await this.momentsService.getUserPosts(user.id, userId, page, limit);
  }

  @Get('posts/:postId')
  @ApiOperation({ summary: '获取动态详情' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getPostDetail(
    @CurrentUser() user: any,
    @Param('postId') postId: string,
  ) {
    return await this.momentsService.getPostDetail(postId, user.id);
  }

  @Delete('posts/:postId')
  @ApiOperation({ summary: '删除动态' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deletePost(
    @CurrentUser() user: any,
    @Param('postId') postId: string,
  ) {
    return await this.momentsService.deletePost(postId, user.id);
  }

  @Post('posts/:postId/like')
  @ApiOperation({ summary: '点赞动态' })
  @ApiResponse({ status: 200, description: '操作成功' })
  async likePost(
    @CurrentUser() user: any,
    @Param('postId') postId: string,
  ) {
    return await this.momentsService.likePost(postId, user.id);
  }

  @Post('posts/:postId/comments')
  @ApiOperation({ summary: '添加评论' })
  @ApiResponse({ status: 201, description: '添加成功' })
  async addComment(
    @CurrentUser() user: any,
    @Param('postId') postId: string,
    @Body('content') content: string,
    @Body('parent_id') parent_id?: string,
  ) {
    return await this.momentsService.addComment(postId, user.id, { content, parent_id });
  }

  @Get('posts/:postId/comments')
  @ApiOperation({ summary: '获取评论列表' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getComments(
    @CurrentUser() user: any,
    @Param('postId') postId: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number,
  ) {
    return await this.momentsService.getComments(postId, page, limit, user.id);
  }

  @Delete('comments/:commentId')
  @ApiOperation({ summary: '删除评论' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteComment(
    @CurrentUser() user: any,
    @Param('commentId') commentId: string,
  ) {
    return await this.momentsService.deleteComment(commentId, user.id);
  }

  @Post('comments/:commentId/like')
  @ApiOperation({ summary: '点赞评论' })
  @ApiResponse({ status: 200, description: '操作成功' })
  async likeComment(
    @CurrentUser() user: any,
    @Param('commentId') commentId: string,
  ) {
    return await this.momentsService.likeComment(commentId, user.id);
  }
}
