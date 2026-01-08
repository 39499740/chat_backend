import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, CanActivate, ExecutionContext } from '@nestjs/common';
import * as request from 'supertest';
import { WebRTCController } from '../../../../src/modules/websocket/controllers/webrtc.controller';
import { WebRTCService } from '../../../../src/modules/websocket/services/webrtc.service';
import { JwtAuthGuard } from '../../../../src/common/guards/jwt-auth.guard';

class MockAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    request.user = { id: '1', username: 'testuser' };
    return true;
  }
}

describe('WebRTCController (e2e)', () => {
  let app: INestApplication;
  let controller: WebRTCController;
  let webrtcService: jest.Mocked<WebRTCService>;

  const mockWebrtcService = {
    initiateCall: jest.fn(),
    answerCall: jest.fn(),
    declineCall: jest.fn(),
    endCall: jest.fn(),
    sendIceCandidate: jest.fn(),
    getCallStatus: jest.fn(),
    getUserCallStatus: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebRTCController],
      providers: [
        {
          provide: WebRTCService,
          useValue: mockWebrtcService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(MockAuthGuard)
      .compile();

    app = module.createNestApplication();
    await app.init();

    controller = module.get<WebRTCController>(WebRTCController);
    webrtcService = module.get(WebRTCService);

    jest.clearAllMocks();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('POST /webrtc/calls/initiate', () => {
    it('should initiate call successfully', async () => {
      const initiateCallDto = {
        calleeId: 'user-2',
        conversationId: 'conv-1',
        type: 'video' as const,
        sdp: { type: 'offer', sdp: 'mock-sdp' },
      };

      const expectedCall = {
        id: 'call-1',
        callerId: '1',
        calleeId: 'user-2',
        status: 'ringing',
      };

      mockWebrtcService.initiateCall.mockResolvedValue(expectedCall);

      const response = await request(app.getHttpServer())
        .post('/webrtc/calls/initiate')
        .send(initiateCallDto);

      expect(response.body).toMatchObject({
        id: 'call-1',
        callerId: '1',
        calleeId: 'user-2',
        status: 'ringing',
      });
      expect(mockWebrtcService.initiateCall).toHaveBeenCalledWith(
        '1',
        initiateCallDto.calleeId,
        initiateCallDto.conversationId,
        initiateCallDto.type,
        initiateCallDto.sdp,
      );
    });

    it('should handle initiate call errors', async () => {
      const initiateCallDto = {
        calleeId: 'user-999',
        conversationId: 'conv-1',
        type: 'audio' as const,
        sdp: { type: 'offer', sdp: 'mock-sdp' },
      };

      mockWebrtcService.initiateCall.mockRejectedValue(new Error('Initiate failed'));

      await request(app.getHttpServer())
        .post('/webrtc/calls/initiate')
        .send(initiateCallDto)
        .expect(500);
    });
  });

  describe('PUT /webrtc/calls/:callId/answer', () => {
    it('should answer call successfully', async () => {
      const callId = 'call-1';
      const answerCallDto = {
        sdp: { type: 'answer', sdp: 'mock-answer' },
      };

      const expectedCall = {
        id: callId,
        status: 'connected',
      };

      mockWebrtcService.answerCall.mockResolvedValue(expectedCall);

      const response = await request(app.getHttpServer())
        .put(`/webrtc/calls/${callId}/answer`)
        .send(answerCallDto);

      expect(response.body).toEqual(expectedCall);
      expect(mockWebrtcService.answerCall).toHaveBeenCalledWith('1', callId, answerCallDto.sdp);
    });

    it('should handle answer call errors', async () => {
      const callId = 'call-999';

      mockWebrtcService.answerCall.mockRejectedValue(new Error('Answer failed'));

      await request(app.getHttpServer())
        .put(`/webrtc/calls/${callId}/answer`)
        .send({ sdp: { type: 'answer', sdp: 'mock' } })
        .expect(500);
    });
  });

  describe('PUT /webrtc/calls/:callId/decline', () => {
    it('should decline call successfully', async () => {
      const callId = 'call-1';

      const expectedResponse = {
        message: 'Call declined',
        callId,
      };

      mockWebrtcService.declineCall.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .put(`/webrtc/calls/${callId}/decline`)
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockWebrtcService.declineCall).toHaveBeenCalledWith('1', callId);
    });

    it('should handle decline call errors', async () => {
      const callId = 'call-999';

      mockWebrtcService.declineCall.mockRejectedValue(new Error('Decline failed'));

      await request(app.getHttpServer()).put(`/webrtc/calls/${callId}/decline`).expect(500);
    });
  });

  describe('PUT /webrtc/calls/:callId/end', () => {
    it('should end call successfully', async () => {
      const callId = 'call-1';

      const expectedResponse = {
        message: 'Call ended',
        callId,
      };

      mockWebrtcService.endCall.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .put(`/webrtc/calls/${callId}/end`)
        .expect(200);

      expect(response.body).toEqual(expectedResponse);
      expect(mockWebrtcService.endCall).toHaveBeenCalledWith(callId, undefined, '1');
    });

    it('should handle end call errors', async () => {
      const callId = 'call-999';

      mockWebrtcService.endCall.mockRejectedValue(new Error('End failed'));

      await request(app.getHttpServer()).put(`/webrtc/calls/${callId}/end`).expect(500);
    });
  });

  describe('POST /webrtc/calls/:callId/ice', () => {
    it('should send ICE candidate successfully', async () => {
      const callId = 'call-1';
      const iceCandidateDto = {
        candidate: { candidate: 'mock-candidate', sdpMid: '0', sdpMLineIndex: 0 },
      };

      const expectedResponse = {
        message: 'ICE candidate sent',
        callId,
      };

      mockWebrtcService.sendIceCandidate.mockResolvedValue(expectedResponse);

      const response = await request(app.getHttpServer())
        .post(`/webrtc/calls/${callId}/ice`)
        .send(iceCandidateDto);

      expect(response.body).toEqual(expectedResponse);
      expect(mockWebrtcService.sendIceCandidate).toHaveBeenCalledWith(
        callId,
        '1',
        iceCandidateDto.candidate,
      );
    });

    it('should handle send ICE candidate errors', async () => {
      const callId = 'call-999';

      mockWebrtcService.sendIceCandidate.mockRejectedValue(new Error('Send failed'));

      await request(app.getHttpServer())
        .post(`/webrtc/calls/${callId}/ice`)
        .send({ candidate: { candidate: 'mock' } })
        .expect(500);
    });
  });

  describe('GET /webrtc/calls/:callId', () => {
    it('should get call status successfully', async () => {
      const callId = 'call-1';
      const expectedCall = {
        id: callId,
        callerId: '1',
        calleeId: 'user-2',
        status: 'connected',
      };

      mockWebrtcService.getCallStatus.mockResolvedValue(expectedCall);

      const response = await request(app.getHttpServer())
        .get(`/webrtc/calls/${callId}`)
        .expect(200);

      expect(response.body).toEqual(expectedCall);
      expect(mockWebrtcService.getCallStatus).toHaveBeenCalledWith(callId, '1');
    });

    it('should return 404 if call not found', async () => {
      const callId = 'call-999';

      mockWebrtcService.getCallStatus.mockRejectedValue(new Error('Call not found'));

      await request(app.getHttpServer()).get(`/webrtc/calls/${callId}`).expect(500);
    });
  });

  describe('GET /webrtc/calls/status', () => {
    it('should handle get user call status errors', async () => {
      mockWebrtcService.getUserCallStatus.mockRejectedValue(new Error('Get status failed'));

      await request(app.getHttpServer()).get('/webrtc/calls/status').expect(500);
    });
  });

  describe('Controller instantiation', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
    });
  });
});
