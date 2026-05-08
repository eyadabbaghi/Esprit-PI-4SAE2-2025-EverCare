export interface WaitingRoom {
  waitingRoomId: string;
  appointmentId: string;
  patientId: string;
  patientName?: string;
  joinedAt: Date;
  consultationStartedAt?: Date;
  microphoneTested: boolean;
  cameraTested: boolean;
  soundTested: boolean;
  cognitiveStateBefore?: CognitiveState;
  cognitiveNotes?: string;
  lastVisitSummary?: string;
  memoryRefreshDisplayed: boolean;
}

export type CognitiveState = 'CALM' | 'TIRED' | 'CONFUSED' | 'ANXIOUS' | 'AGITATED';
