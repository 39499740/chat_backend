import { Controller, Get, Query, UseGuards, DefaultValuePipe, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SearchService, SearchType } from '../services/search.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { SearchDto, SearchSuggestionsDto } from '../dto/search.dto';

@ApiTags('search')
@Controller('search')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  @ApiOperation({ summary: '搜索内容' })
  @ApiQuery({ name: 'query', description: '搜索关键词' })
  @ApiQuery({ name: 'type', enum: SearchType, required: false })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '搜索成功' })
  async search(
    @CurrentUser() user: any,
    @Query('query') query: string,
    @Query('type') type?: SearchType,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return await this.searchService.search(user.id, query, type, { page, limit });
  }

  @Get('users')
  @ApiOperation({ summary: '搜索用户' })
  @ApiQuery({ name: 'query', description: '搜索关键词' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '搜索成功' })
  async searchUsers(
    @CurrentUser() user: any,
    @Query('query') query: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return await this.searchService.searchUsers(user.id, query, { page, limit });
  }

  @Get('posts')
  @ApiOperation({ summary: '搜索帖子' })
  @ApiQuery({ name: 'query', description: '搜索关键词' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '搜索成功' })
  async searchPosts(
    @CurrentUser() user: any,
    @Query('query') query: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return await this.searchService.searchPosts(user.id, query, { page, limit });
  }

  @Get('messages')
  @ApiOperation({ summary: '搜索消息' })
  @ApiQuery({ name: 'query', description: '搜索关键词' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '搜索成功' })
  async searchMessages(
    @CurrentUser() user: any,
    @Query('query') query: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return await this.searchService.searchMessages(user.id, query, { page, limit });
  }

  @Get('conversations')
  @ApiOperation({ summary: '搜索会话' })
  @ApiQuery({ name: 'query', description: '搜索关键词' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '搜索成功' })
  async searchConversations(
    @CurrentUser() user: any,
    @Query('query') query: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return await this.searchService.searchConversations(user.id, query, { page, limit });
  }

  @Get('suggestions')
  @ApiOperation({ summary: '获取搜索建议（自动补全）' })
  @ApiQuery({ name: 'query', description: '搜索关键词' })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getSearchSuggestions(
    @CurrentUser() user: any,
    @Query('query') query: string,
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit?: number,
  ) {
    return await this.searchService.getSearchSuggestions(user.id, query, limit);
  }
}
