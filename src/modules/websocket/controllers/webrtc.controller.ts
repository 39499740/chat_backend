import { Controller, Post, Put, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WebRTCService } from '../services/webrtc.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

export class InitiateCallDto {
  calleeId: string;
  conversationId: string;
  type: 'audio' | 'video';
  sdp: RTCSessionDescriptionInit;
}

export class AnswerCallDto {
  sdp: RTCSessionDescriptionInit;
}

export class IceCandidateDto {
  candidate: RTCIceCandidateInit;
}

@ApiTags('webrtc')
@Controller('webrtc')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class WebRTCController {
  constructor(private readonly webrtcService: WebRTCService) {}

  @Post('calls/initiate')
  @ApiOperation({ summary: '发起通话' })
  @ApiResponse({ status: 201, description: '通话发起成功' })
  async initiateCall(@CurrentUser() user: any, @Body() initiateCallDto: InitiateCallDto) {
    return await this.webrtcService.initiateCall(
      user.id,
      initiateCallDto.calleeId,
      initiateCallDto.conversationId,
      initiateCallDto.type,
      initiateCallDto.sdp,
    );
  }

  @Put('calls/:callId/answer')
  @ApiOperation({ summary: '接听通话' })
  @ApiResponse({ status: 200, description: '通话接听成功' })
  async answerCall(
    @CurrentUser() user: any,
    @Param('callId') callId: string,
    @Body() answerCallDto: AnswerCallDto,
  ) {
    return await this.webrtcService.answerCall(user.id, callId, answerCallDto.sdp);
  }

  @Put('calls/:callId/decline')
  @ApiOperation({ summary: '拒绝通话' })
  @ApiResponse({ status: 200, description: '通话已拒绝' })
  async declineCall(@CurrentUser() user: any, @Param('callId') callId: string) {
    return await this.webrtcService.declineCall(user.id, callId);
  }

  @Put('calls/:callId/end')
  @ApiOperation({ summary: '结束通话' })
  @ApiResponse({ status: 200, description: '通话已结束' })
  async endCall(@CurrentUser() user: any, @Param('callId') callId: string) {
    return await this.webrtcService.endCall(callId, undefined, user.id);
  }

  @Post('calls/:callId/ice')
  @ApiOperation({ summary: '发送ICE候选者' })
  @ApiResponse({ status: 200, description: 'ICE候选者发送成功' })
  async sendIceCandidate(
    @CurrentUser() user: any,
    @Param('callId') callId: string,
    @Body() iceCandidateDto: IceCandidateDto,
  ) {
    return await this.webrtcService.sendIceCandidate(callId, user.id, iceCandidateDto.candidate);
  }

  @Get('calls/:callId')
  @ApiOperation({ summary: '获取通话状态' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getCallStatus(@CurrentUser() user: any, @Param('callId') callId: string) {
    return await this.webrtcService.getCallStatus(callId, user.id);
  }

  @Get('calls/status')
  @ApiOperation({ summary: '获取当前用户的通话状态' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getUserCallStatus(@CurrentUser() user: any) {
    return await this.webrtcService.getUserCallStatus(user.id);
  }
}
