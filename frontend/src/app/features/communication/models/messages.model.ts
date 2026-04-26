export interface Message {
  id: number;
  senderId: string;
  content: string;
  sentAt: Date;
  isRead: boolean;
  updatedAt?: Date;
  showMenu?: boolean;
  // NOUVEAUX ATTRIBUTS
  fileUrl?: string;
  fileType?: string;
}

export interface Conversation {
  id: number;
  user1Id: string;
  user2Id: string;
  createdAt?: Date;
  isActive?: boolean;
  messages: Message[];
  interlocutorName?: string;
  interlocutorAvatar?: string;
  status?: string;
}

export enum CallStatus {
  INITIATED = 'INITIATED',
  ONGOING = 'ONGOING',
  COMPLETED = 'COMPLETED',
  MISSED = 'MISSED',
  REJECTED = 'REJECTED'
}

export interface Call {
  id: number;
  callerId: string;
  status: CallStatus;
  startTime: string;
  endTime?: string;
  durationInSeconds?: number;
}
