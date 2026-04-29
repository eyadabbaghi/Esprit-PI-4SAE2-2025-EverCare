import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import {
  CognitiveGame,
  CognitiveGameRequest,
  CognitiveProgress,
  CreateGameSessionRequest,
  GameSession,
  UpdateGameSessionRequest,
} from '../models/cognitive-stimulation.model';

@Injectable({
  providedIn: 'root'
})
export class CognitiveStimulationService {
  private readonly apiUrl = environment.cognitiveStimulationApiUrl;

  constructor(private readonly http: HttpClient) {}

  listGames(): Observable<CognitiveGame[]> {
    return this.http.get<CognitiveGame[]>(`${this.apiUrl}/cognitive-games`);
  }

  getGame(id: string): Observable<CognitiveGame> {
    return this.http.get<CognitiveGame>(`${this.apiUrl}/cognitive-games/${id}`);
  }

  createGame(payload: CognitiveGameRequest): Observable<CognitiveGame> {
    return this.http.post<CognitiveGame>(`${this.apiUrl}/cognitive-games`, payload);
  }

  updateGame(id: string, payload: CognitiveGameRequest): Observable<CognitiveGame> {
    return this.http.put<CognitiveGame>(`${this.apiUrl}/cognitive-games/${id}`, payload);
  }

  deleteGame(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/cognitive-games/${id}`);
  }

  getRecommendedGames(medicalRecordId: string): Observable<CognitiveGame[]> {
    return this.http.get<CognitiveGame[]>(`${this.apiUrl}/medical-records/${medicalRecordId}/recommended-games`);
  }

  listSessions(medicalRecordId: string): Observable<GameSession[]> {
    return this.http.get<GameSession[]>(`${this.apiUrl}/medical-records/${medicalRecordId}/game-sessions`);
  }

  getProgress(medicalRecordId: string): Observable<CognitiveProgress> {
    return this.http.get<CognitiveProgress>(`${this.apiUrl}/medical-records/${medicalRecordId}/game-progress`);
  }

  createSession(medicalRecordId: string, payload: CreateGameSessionRequest): Observable<GameSession> {
    return this.http.post<GameSession>(`${this.apiUrl}/medical-records/${medicalRecordId}/game-sessions`, payload);
  }

  updateSession(sessionId: string, payload: UpdateGameSessionRequest): Observable<GameSession> {
    return this.http.put<GameSession>(`${this.apiUrl}/game-sessions/${sessionId}`, payload);
  }

  deleteSession(sessionId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/game-sessions/${sessionId}`);
  }
}
