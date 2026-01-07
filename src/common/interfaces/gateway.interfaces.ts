export enum MessageType {
  TEXT = 0,
  IMAGE = 1,
  AUDIO = 2,
  VIDEO = 3,
  EMOJI = 4,
  FILE = 5,
}

export interface MessagePayload {
  type: MessageType;
  content: string;
  media_urls?: string[];
  conversationId: string;
  senderId: string;
  receiverId?: string;
  createdAt: string;
  replyToId?: string;
}

export interface OnlineStatusPayload {
  userId: string;
  status: 'online' | 'offline';
  lastSeen?: string;
}

export interface TypingStatusPayload {
  conversationId: string;
  userId: string;
  typing: boolean;
}
