import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { WebRTCService } from '../../../../src/modules/websocket/services/webrtc.service';
import { DatabaseService } from '../../../../src/common/database/database.service';
import { ChatGateway } from '../../../../src/modules/websocket/chat.gateway';

describe('WebRTCService', () => {
  let service: WebRTCService;
  let mockDb: any;
  let mockChatGateway: any;

  beforeEach(async () => {
    mockChatGateway = {
      server: {
        to: jest.fn().mockReturnThis(),
        emit: jest.fn(),
      },
    };

    mockDb = {
      query: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebRTCService,
        {
          provide: DatabaseService,
          useValue: mockDb,
        },
        {
          provide: ChatGateway,
          useValue: mockChatGateway,
        },
      ],
    }).compile();

    service = module.get<WebRTCService>(WebRTCService);
    jest.clearAllMocks();
  });

  afterEach(() => {
    (service as any).activeCalls.clear();
    (service as any).userCallStatus.clear();
  });

  describe('initiateCall', () => {
    it('should initiate call successfully', async () => {
      const callerId = '1';
      const calleeId = '2';
      const conversationId = 'conv1';
      const type = 'video';
      const sdp = { type: 'offer', sdp: 'test-sdp' };

      (service as any).getSocketIdByUserId = jest.fn().mockReturnValue('socket-2');

      const result = await service.initiateCall(callerId, calleeId, conversationId, type, sdp);

      expect(result).toHaveProperty('callId');
      expect(result).toHaveProperty('status');
      expect(mockChatGateway.server.to).toHaveBeenCalledWith('socket-2');
      expect(mockChatGateway.server.to().emit).toHaveBeenCalledWith(
        'call_offer',
        expect.objectContaining({
          callId: result.callId,
          callerId,
          calleeId,
          type,
          conversationId,
          sdp,
        }),
      );
    });

    it('should throw if callee already in call', async () => {
      const callerId = '1';
      const calleeId = '2';
      const conversationId = 'conv1';
      const type = 'audio';
      const sdp = { type: 'offer', sdp: 'test' };

      (service as any).userCallStatus.set(calleeId, 'existing-call');

      await expect(
        service.initiateCall(callerId, calleeId, conversationId, type, sdp),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.initiateCall(callerId, calleeId, conversationId, type, sdp),
      ).rejects.toThrow('对方正在通话中');
    });

    it('should throw if caller already in call', async () => {
      const callerId = '1';
      const calleeId = '2';
      const conversationId = 'conv1';
      const type = 'video';
      const sdp = { type: 'offer', sdp: 'test' };

      (service as any).userCallStatus.set(callerId, 'existing-call');

      await expect(
        service.initiateCall(callerId, calleeId, conversationId, type, sdp),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.initiateCall(callerId, calleeId, conversationId, type, sdp),
      ).rejects.toThrow('你正在通话中');
    });

    it('should throw if callee offline', async () => {
      const callerId = '1';
      const calleeId = '2';
      const conversationId = 'conv1';
      const type = 'video';
      const sdp = { type: 'offer', sdp: 'test' };

      (service as any).getSocketIdByUserId = jest.fn().mockReturnValue(null);

      await expect(
        service.initiateCall(callerId, calleeId, conversationId, type, sdp),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.initiateCall(callerId, calleeId, conversationId, type, sdp),
      ).rejects.toThrow('对方不在线');
    });
  });

  describe('answerCall', () => {
    it('should answer call successfully', async () => {
      const calleeId = '2';
      const callId = 'call_1';
      const sdp = { type: 'answer', sdp: 'answer-sdp' };

      const activeCall: any = {
        callId,
        callerId: '1',
        calleeId,
        type: 'video',
        status: 'calling',
        conversationId: 'conv1',
        startedAt: new Date(),
      };

      (service as any).activeCalls.set(callId, activeCall);
      (service as any).getSocketIdByUserId = jest.fn().mockReturnValue('socket-1');

      const result = await service.answerCall(calleeId, callId, sdp);

      expect(result).toHaveProperty('callId', callId);
      expect(result).toHaveProperty('status');
      expect(mockChatGateway.server.to).toHaveBeenCalledWith('socket-1');
      expect(mockChatGateway.server.to().emit).toHaveBeenCalledWith(
        'call_answer',
        expect.objectContaining({
          callId,
          calleeId,
          sdp,
        }),
      );
    });

    it('should throw if call does not exist', async () => {
      const calleeId = '2';
      const callId = 'non-existent';
      const sdp = { type: 'answer', sdp: 'test' };

      await expect(service.answerCall(calleeId, callId, sdp)).rejects.toThrow(BadRequestException);
      await expect(service.answerCall(calleeId, callId, sdp)).rejects.toThrow('通话不存在');
    });

    it('should throw if user not participant', async () => {
      const calleeId = '3';
      const callId = 'call_1';
      const sdp = { type: 'answer', sdp: 'test' };

      const activeCall: any = {
        callId,
        callerId: '1',
        calleeId: '2',
        status: 'calling',
        conversationId: 'conv1',
        startedAt: new Date(),
      };

      (service as any).activeCalls.set(callId, activeCall);

      await expect(service.answerCall(calleeId, callId, sdp)).rejects.toThrow(BadRequestException);
      await expect(service.answerCall(calleeId, callId, sdp)).rejects.toThrow(
        '你不是该通话的参与者',
      );
    });

    it('should throw if call already ended', async () => {
      const calleeId = '2';
      const callId = 'call_1';
      const sdp = { type: 'answer', sdp: 'test' };

      const activeCall: any = {
        callId,
        callerId: '1',
        calleeId,
        type: 'video',
        status: 'ended',
        conversationId: 'conv1',
        startedAt: new Date(),
      };

      (service as any).activeCalls.set(callId, activeCall);

      await expect(service.answerCall(calleeId, callId, sdp)).rejects.toThrow(BadRequestException);
      await expect(service.answerCall(calleeId, callId, sdp)).rejects.toThrow('通话已结束');
    });
  });

  describe('declineCall', () => {
    it('should decline call successfully', async () => {
      const calleeId = '2';
      const callId = 'call_1';

      const activeCall: any = {
        callId,
        callerId: '1',
        calleeId,
        type: 'video',
        status: 'calling',
        conversationId: 'conv1',
        startedAt: new Date(),
      };

      (service as any).activeCalls.set(callId, activeCall);
      (service as any).getSocketIdByUserId = jest.fn().mockReturnValue('socket-1');

      const result = await service.declineCall(calleeId, callId);

      expect(result).toHaveProperty('callId', callId);
      expect(result).toHaveProperty('status', 'declined');
      expect(mockChatGateway.server.to).toHaveBeenCalledWith('socket-1');
      expect(mockChatGateway.server.to().emit).toHaveBeenCalledWith(
        'call_declined',
        expect.objectContaining({
          callId,
          calleeId,
        }),
      );
    });

    it('should throw if call does not exist', async () => {
      const calleeId = '2';
      const callId = 'non-existent';

      await expect(service.declineCall(calleeId, callId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('endCall', () => {
    it('should end call successfully', async () => {
      const callId = 'call_1';
      const userId = '1';

      const activeCall: any = {
        callId,
        callerId: '1',
        calleeId: '2',
        type: 'video',
        status: 'accepted',
        conversationId: 'conv1',
        startedAt: new Date(Date.now() - 60000),
      };

      (service as any).activeCalls.set(callId, activeCall);
      (service as any).userCallStatus.set('1', callId);
      (service as any).userCallStatus.set('2', callId);
      (service as any).getSocketIdByUserId = jest.fn().mockReturnValue('socket-1');
      (service as any).getSocketIdByUserId = jest.fn().mockReturnValue('socket-2');

      const result = await service.endCall(callId, 'ended', userId);

      expect(result).toHaveProperty('callId');
      expect(result).toHaveProperty('status', 'ended');
      expect(result).toHaveProperty('duration');
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should throw if call does not exist', async () => {
      const callId = 'non-existent';

      await expect(service.endCall(callId, 'ended')).rejects.toThrow(BadRequestException);
    });
  });

  describe('sendIceCandidate', () => {
    it('should send ICE candidate successfully', async () => {
      const callId = 'call_1';
      const userId = '1';
      const candidate = { candidate: 'test', sdpMid: '0', sdpMLineIndex: 0 };

      const activeCall: any = {
        callId,
        callerId: '1',
        calleeId: '2',
        type: 'video',
        status: 'accepted',
        conversationId: 'conv1',
        startedAt: new Date(),
      };

      (service as any).activeCalls.set(callId, activeCall);
      (service as any).getSocketIdByUserId = jest.fn().mockReturnValue('socket-2');

      const result = await service.sendIceCandidate(callId, userId, candidate);

      expect(result).toHaveProperty('success', true);
      expect(mockChatGateway.server.to).toHaveBeenCalledWith('socket-2');
    });

    it('should throw if call does not exist', async () => {
      const callId = 'non-existent';
      const userId = '1';
      const candidate = { candidate: 'test' };

      await expect(service.sendIceCandidate(callId, userId, candidate)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw if user not participant', async () => {
      const callId = 'call_1';
      const userId = '3';
      const candidate = { candidate: 'test' };

      const activeCall: any = {
        callId,
        callerId: '1',
        calleeId: '2',
        type: 'video',
        status: 'accepted',
        conversationId: 'conv1',
        startedAt: new Date(),
      };

      (service as any).activeCalls.set(callId, activeCall);

      await expect(service.sendIceCandidate(callId, userId, candidate)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getCallStatus', () => {
    it('should get call status successfully', async () => {
      const callId = 'call_1';
      const userId = '1';

      const activeCall: any = {
        callId,
        callerId: '1',
        calleeId: '2',
        type: 'video',
        status: 'accepted',
        conversationId: 'conv1',
        startedAt: new Date(),
      };

      (service as any).activeCalls.set(callId, activeCall);

      const result = await service.getCallStatus(callId, userId);

      expect(result).toHaveProperty('callId', callId);
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('callerId');
      expect(result).toHaveProperty('calleeId');
    });

    it('should throw if call does not exist', async () => {
      const callId = 'non-existent';
      const userId = '1';

      await expect(service.getCallStatus(callId, userId)).rejects.toThrow(BadRequestException);
    });

    it('should throw if user not participant', async () => {
      const callId = 'call_1';
      const userId = '3';

      const activeCall: any = {
        callId,
        callerId: '1',
        calleeId: '2',
        type: 'video',
        status: 'accepted',
        conversationId: 'conv1',
        startedAt: new Date(),
      };

      (service as any).activeCalls.set(callId, activeCall);

      await expect(service.getCallStatus(callId, userId)).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserCallStatus', () => {
    it('should return not in call status', async () => {
      const userId = '1';

      const result = await service.getUserCallStatus(userId);

      expect(result).toHaveProperty('inCall', false);
      expect(result).toHaveProperty('callId', null);
    });

    it('should return active call status', async () => {
      const userId = '1';
      const callId = 'call_1';

      const activeCall: any = {
        callId,
        callerId: '1',
        calleeId: '2',
        type: 'video',
        status: 'calling',
        conversationId: 'conv1',
        startedAt: new Date(),
      };

      (service as any).activeCalls.set(callId, activeCall);
      (service as any).userCallStatus.set(userId, callId);

      const result = await service.getUserCallStatus(userId);

      expect(result).toHaveProperty('inCall', true);
      expect(result).toHaveProperty('callId', callId);
      expect(result).toHaveProperty('status');
    });

    it('should remove stale call record', async () => {
      const userId = '1';
      const callId = 'call_1';

      (service as any).activeCalls.set(callId, {});
      (service as any).userCallStatus.set(userId, callId);

      const result = await service.getUserCallStatus(userId);

      expect(result).toHaveProperty('inCall', false);
      expect(result).toHaveProperty('callId', null);
    });
  });
});
