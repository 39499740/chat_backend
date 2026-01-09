import { Test, TestingModule } from '@nestjs/testing';
import { WebRTCService, CallStatus, ActiveCall } from '@/modules/websocket/services/webrtc.service';
import { DatabaseService } from '@/common/database/database.service';
import { ChatGateway } from '@/modules/websocket/chat.gateway';

describe('WebRTCService', () => {
  let service: WebRTCService;
  let mockDb: jest.Mocked<DatabaseService>;
  let mockChatGateway: Partial<ChatGateway>;

  beforeEach(async () => {
    mockDb = {
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    } as unknown as jest.Mocked<DatabaseService>;

    mockChatGateway = {
      server: {
        to: jest.fn().mockReturnValue({
          emit: jest.fn(),
        }),
      },
    } as any;

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
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('initiateCall', () => {
    it('should initiate a call successfully', async () => {
      const callerId = 'caller1';
      const calleeId = 'callee1';
      const conversationId = 'conv1';
      const type = 'audio' as const;
      const sdp = { type: 'offer' as 'offer', sdp: 'sdp-string' };

      jest.spyOn(service as any, 'getSocketIdByUserId').mockReturnValue('callee-socket-id');

      const result = await service.initiateCall(callerId, calleeId, conversationId, type, sdp);

      expect(result.callId).toBeDefined();
      expect(result.status).toBe(CallStatus.CALLING);
      expect(result.callId.startsWith('call_')).toBe(true);
    });

    it('should throw error if callee is already in a call', async () => {
      const callerId = 'caller1';
      const calleeId = 'callee1';
      const conversationId = 'conv1';
      const type = 'audio' as const;
      const sdp = { type: 'offer', sdp: 'sdp-string' } as any;

      service['userCallStatus'].set(calleeId, 'existing-call');

      await expect(
        service.initiateCall(callerId, calleeId, conversationId, type, sdp),
      ).rejects.toThrow('对方正在通话中');
    });

    it('should throw error if caller is already in a call', async () => {
      const callerId = 'caller1';
      const calleeId = 'callee1';
      const conversationId = 'conv1';
      const type = 'audio' as const;
      const sdp = { type: 'offer', sdp: 'sdp-string' } as any;

      service['userCallStatus'].set(callerId, 'existing-call');

      await expect(
        service.initiateCall(callerId, calleeId, conversationId, type, sdp),
      ).rejects.toThrow('你正在通话中');
    });
  });

  describe('answerCall', () => {
    it('should answer a call successfully', async () => {
      const callId = 'call1';
      const calleeId = 'callee1';
      const sdp = { type: 'answer' as 'answer', sdp: 'sdp-string' };

      const activeCall: ActiveCall = {
        callId,
        callerId: 'caller1',
        calleeId,
        type: 'audio',
        status: CallStatus.CALLING,
        conversationId: 'conv1',
        startedAt: new Date(),
      };

      service['activeCalls'].set(callId, activeCall);

      const result = await service.answerCall(calleeId, callId, sdp);

      expect(result.callId).toBe(callId);
      expect(result.status).toBe(CallStatus.ACCEPTED);
      expect(activeCall.status).toBe(CallStatus.ACCEPTED);
    });

    it('should throw error if call does not exist', async () => {
      const callId = 'non-existent-call';
      const calleeId = 'callee1';
      const sdp = { type: 'answer' as 'answer', sdp: 'sdp-string' };

      await expect(service.answerCall(calleeId, callId, sdp)).rejects.toThrow('通话不存在');
    });

    it('should throw error if user is not the callee', async () => {
      const callId = 'call1';
      const wrongCalleeId = 'wrong-callee';
      const sdp = { type: 'answer' as 'answer', sdp: 'sdp-string' };

      const activeCall: ActiveCall = {
        callId,
        callerId: 'caller1',
        calleeId: 'callee1',
        type: 'audio',
        status: CallStatus.CALLING,
        conversationId: 'conv1',
        startedAt: new Date(),
      };

      service['activeCalls'].set(callId, activeCall);

      await expect(service.answerCall(wrongCalleeId, callId, sdp)).rejects.toThrow(
        '你不是该通话的参与者',
      );
    });
  });

  describe('declineCall', () => {
    it('should decline a call successfully', async () => {
      const callId = 'call1';
      const calleeId = 'callee1';

      const activeCall: ActiveCall = {
        callId,
        callerId: 'caller1',
        calleeId,
        type: 'audio',
        status: CallStatus.CALLING,
        conversationId: 'conv1',
        startedAt: new Date(),
      };

      service['activeCalls'].set(callId, activeCall);
      service['userCallStatus'].set(activeCall.callerId, callId);

      const result = await service.declineCall(calleeId, callId);

      expect(result.callId).toBe(callId);
      expect(result.status).toBe(CallStatus.DECLINED);
      expect(service['activeCalls'].has(callId)).toBe(false);
      expect(service['userCallStatus'].has(activeCall.callerId)).toBe(false);
    });
  });

  describe('endCall', () => {
    it('should end a call successfully', async () => {
      const callId = 'call1';
      const status = CallStatus.ENDED;

      const activeCall: ActiveCall = {
        callId,
        callerId: 'caller1',
        calleeId: 'callee1',
        type: 'audio',
        status: CallStatus.ACCEPTED,
        conversationId: 'conv1',
        startedAt: new Date(),
      };

      service['activeCalls'].set(callId, activeCall);
      service['userCallStatus'].set(activeCall.callerId, callId);
      service['userCallStatus'].set(activeCall.calleeId, callId);

      const result = await service.endCall(callId, status);

      expect(result.callId).toBe(callId);
      expect(result.status).toBe(status);
      expect(result.duration).toBeGreaterThanOrEqual(0);
      expect(activeCall.endedAt).toBeDefined();
    });

    it('should throw error if call does not exist', async () => {
      const callId = 'non-existent-call';

      await expect(service.endCall(callId)).rejects.toThrow('通话不存在');
    });
  });

  describe('sendIceCandidate', () => {
    it('should send ICE candidate successfully', async () => {
      const callId = 'call1';
      const userId = 'caller1';
      const candidate = { candidate: 'candidate-string', sdpMid: '0', sdpMLineIndex: 0 } as any;

      const activeCall: ActiveCall = {
        callId,
        callerId: 'caller1',
        calleeId: 'callee1',
        type: 'audio',
        status: CallStatus.ACCEPTED,
        conversationId: 'conv1',
        startedAt: new Date(),
      };

      service['activeCalls'].set(callId, activeCall);

      const result = await service.sendIceCandidate(callId, userId, candidate);

      expect(result.success).toBe(true);
    });

    it('should throw error if call does not exist', async () => {
      const callId = 'non-existent-call';
      const userId = 'caller1';
      const candidate = { candidate: 'candidate-string', sdpMid: '0', sdpMLineIndex: 0 } as any;

      await expect(service.sendIceCandidate(callId, userId, candidate)).rejects.toThrow(
        '通话不存在',
      );
    });

    it('should throw error if user is not a participant', async () => {
      const callId = 'call1';
      const userId = 'user-not-in-call';
      const candidate = { candidate: 'candidate-string', sdpMid: '0', sdpMLineIndex: 0 } as any;

      const activeCall: ActiveCall = {
        callId,
        callerId: 'caller1',
        calleeId: 'callee1',
        type: 'audio',
        status: CallStatus.ACCEPTED,
        conversationId: 'conv1',
        startedAt: new Date(),
      };

      service['activeCalls'].set(callId, activeCall);

      await expect(service.sendIceCandidate(callId, userId, candidate)).rejects.toThrow(
        '你不是该通话的参与者',
      );
    });
  });

  describe('getCallStatus', () => {
    it('should get call status for participant', async () => {
      const callId = 'call1';
      const userId = 'caller1';

      const activeCall: ActiveCall = {
        callId,
        callerId: 'caller1',
        calleeId: 'callee1',
        type: 'audio',
        status: CallStatus.ACCEPTED,
        conversationId: 'conv1',
        startedAt: new Date(),
      };

      service['activeCalls'].set(callId, activeCall);

      const result = await service.getCallStatus(callId, userId);

      expect(result.callId).toBe(callId);
      expect(result.status).toBe(CallStatus.ACCEPTED);
      expect(result.callerId).toBe('caller1');
      expect(result.calleeId).toBe('callee1');
    });

    it('should throw error if call does not exist', async () => {
      const callId = 'non-existent-call';
      const userId = 'caller1';

      await expect(service.getCallStatus(callId, userId)).rejects.toThrow('通话不存在');
    });

    it('should throw error if user is not a participant', async () => {
      const callId = 'call1';
      const userId = 'user-not-in-call';

      const activeCall: ActiveCall = {
        callId,
        callerId: 'caller1',
        calleeId: 'callee1',
        type: 'audio',
        status: CallStatus.ACCEPTED,
        conversationId: 'conv1',
        startedAt: new Date(),
      };

      service['activeCalls'].set(callId, activeCall);

      await expect(service.getCallStatus(callId, userId)).rejects.toThrow('你不是该通话的参与者');
    });
  });

  describe('getUserCallStatus', () => {
    it('should get call status for user in call', async () => {
      const userId = 'caller1';
      const callId = 'call1';

      const activeCall: ActiveCall = {
        callId,
        callerId: 'caller1',
        calleeId: 'callee1',
        type: 'audio',
        status: CallStatus.ACCEPTED,
        conversationId: 'conv1',
        startedAt: new Date(),
      };

      service['activeCalls'].set(callId, activeCall);
      service['userCallStatus'].set(userId, callId);

      const result = await service.getUserCallStatus(userId);

      expect(result.inCall).toBe(true);
      expect(result.callId).toBe(callId);
      expect(result.status).toBe(CallStatus.ACCEPTED);
    });

    it('should get call status for user not in call', async () => {
      const userId = 'caller1';

      const result = await service.getUserCallStatus(userId);

      expect(result.inCall).toBe(false);
      expect(result.callId).toBe(null);
    });
  });
});
