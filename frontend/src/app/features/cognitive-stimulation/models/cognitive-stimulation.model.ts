export type CognitiveGameType =
  | 'MEMORY'
  | 'LANGUAGE'
  | 'LOGIC'
  | 'ATTENTION'
  | 'PRAXIS'
  | 'GNOSIS';

export type CognitiveAlzheimerStage = 'EARLY' | 'MIDDLE' | 'LATE';

export interface CognitiveGame {
  id: string;
  title: string;
  description: string;
  gameType: CognitiveGameType;
  difficultyLevel: number;
  estimatedDuration: number;
  instructions: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CognitiveGameRequest {
  title: string;
  description: string;
  gameType: CognitiveGameType;
  difficultyLevel: number;
  estimatedDuration: number;
  instructions: string;
  active?: boolean;
}

export interface GameSession {
  id: string;
  medicalRecordId: string;
  patientId: string;
  cognitiveGameId: string;
  gameTitle: string;
  gameType: CognitiveGameType;
  stageAtPlay: CognitiveAlzheimerStage;
  playedAt: string;
  playerAnswer: string | null;
  correct: boolean;
  score: number;
  difficultyAtPlay: number;
  assistanceNeeded: boolean;
  frustrationLevel: number;
  enjoymentLevel: number;
  abandoned: boolean;
  notes: string | null;
}

export interface CreateGameSessionRequest {
  cognitiveGameId: string;
  playerAnswer?: string | null;
  correct: boolean;
  score: number;
  difficultyAtPlay?: number | null;
  assistanceNeeded: boolean;
  frustrationLevel: number;
  enjoymentLevel: number;
  abandoned: boolean;
  notes?: string | null;
}

export interface UpdateGameSessionRequest {
  playerAnswer?: string | null;
  correct?: boolean;
  score?: number;
  difficultyAtPlay?: number;
  assistanceNeeded?: boolean;
  frustrationLevel?: number;
  enjoymentLevel?: number;
  abandoned?: boolean;
  notes?: string | null;
}

export interface CognitiveProgress {
  medicalRecordId: string;
  patientId: string;
  alzheimerStage: CognitiveAlzheimerStage;
  totalSessions: number;
  averageScoreLast7Days: number;
  averageScoreLast30Days: number;
  recommendedDifficulty: number | null;
  recommendedGameType: CognitiveGameType | null;
  declineDetected: boolean;
  easierGameSuggested: boolean;
  recommendation: string;
}
