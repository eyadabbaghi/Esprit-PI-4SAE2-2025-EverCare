package com.example.cognitivestimulationservice.service;

import com.example.cognitivestimulationservice.dto.CognitiveGameResponse;
import com.example.cognitivestimulationservice.dto.CognitiveProgressResponse;
import com.example.cognitivestimulationservice.dto.GameSessionCreateRequest;
import com.example.cognitivestimulationservice.dto.GameSessionResponse;
import com.example.cognitivestimulationservice.dto.GameSessionUpdateRequest;
import com.example.cognitivestimulationservice.dto.MedicalRecordClientResponse;
import com.example.cognitivestimulationservice.entity.AlzheimerStage;
import com.example.cognitivestimulationservice.entity.CognitiveGame;
import com.example.cognitivestimulationservice.entity.CognitiveGameType;
import com.example.cognitivestimulationservice.entity.GameSession;
import com.example.cognitivestimulationservice.repository.CognitiveGameRepository;
import com.example.cognitivestimulationservice.repository.GameSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class GameSessionService {

    private static final int DECLINE_THRESHOLD = 15;

    private final GameSessionRepository gameSessionRepository;
    private final CognitiveGameRepository cognitiveGameRepository;
    private final MedicalRecordClientService medicalRecordClientService;
    private final CognitiveGameService cognitiveGameService;

    @Transactional(readOnly = true)
    public List<CognitiveGameResponse> getRecommendedGames(UUID medicalRecordId) {
        MedicalRecordClientResponse record = getActiveMedicalRecord(medicalRecordId);
        AdaptiveRecommendation recommendation = buildAdaptiveRecommendation(record);
        int minDifficulty = 1;
        int maxDifficulty = maxDifficultyForStage(record.getAlzheimerStage());
        int targetDifficulty = recommendation.recommendedDifficulty() == null
                ? maxDifficulty
                : Math.max(minDifficulty, Math.min(recommendation.recommendedDifficulty(), maxDifficulty));

        List<CognitiveGame> games = recommendation.recommendedGameType() == null
                ? cognitiveGameRepository.findByActiveTrueAndDifficultyLevelBetweenOrderByDifficultyLevelAscTitleAsc(minDifficulty, targetDifficulty)
                : cognitiveGameRepository.findByActiveTrueAndGameTypeAndDifficultyLevelBetweenOrderByDifficultyLevelAscTitleAsc(
                        recommendation.recommendedGameType(),
                        minDifficulty,
                        targetDifficulty
                );

        if (games.isEmpty()) {
            games = cognitiveGameRepository.findByActiveTrueAndDifficultyLevelBetweenOrderByDifficultyLevelAscTitleAsc(minDifficulty, maxDifficulty);
        }

        return games.stream()
                .sorted(Comparator.comparingInt(CognitiveGame::getDifficultyLevel).thenComparing(CognitiveGame::getTitle, String.CASE_INSENSITIVE_ORDER))
                .map(this::toGameResponse)
                .toList();
    }

    @Transactional
    public GameSessionResponse create(UUID medicalRecordId, GameSessionCreateRequest request) {
        MedicalRecordClientResponse record = getActiveMedicalRecord(medicalRecordId);
        CognitiveGame game = cognitiveGameService.findActiveById(request.getCognitiveGameId());
        validateDifficultyForStage(record.getAlzheimerStage(), request.getDifficultyAtPlay(), game.getDifficultyLevel());

        GameSession session = GameSession.builder()
                .medicalRecordId(record.getId())
                .patientId(record.getPatientId())
                .cognitiveGame(game)
                .stageAtPlay(record.getAlzheimerStage())
                .playedAt(LocalDateTime.now())
                .playerAnswer(trimToNull(request.getPlayerAnswer()))
                .correct(Boolean.TRUE.equals(request.getCorrect()))
                .score(request.getScore())
                .difficultyAtPlay(request.getDifficultyAtPlay() == null ? game.getDifficultyLevel() : request.getDifficultyAtPlay())
                .assistanceNeeded(Boolean.TRUE.equals(request.getAssistanceNeeded()))
                .frustrationLevel(request.getFrustrationLevel())
                .enjoymentLevel(request.getEnjoymentLevel())
                .abandoned(Boolean.TRUE.equals(request.getAbandoned()))
                .notes(trimToNull(request.getNotes()))
                .build();

        return toSessionResponse(gameSessionRepository.save(session));
    }

    @Transactional(readOnly = true)
    public List<GameSessionResponse> listByMedicalRecord(UUID medicalRecordId) {
        getActiveMedicalRecord(medicalRecordId);
        return gameSessionRepository.findByMedicalRecordIdOrderByPlayedAtDesc(medicalRecordId)
                .stream()
                .map(this::toSessionResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public CognitiveProgressResponse getProgress(UUID medicalRecordId) {
        MedicalRecordClientResponse record = getActiveMedicalRecord(medicalRecordId);
        List<GameSession> sessions = gameSessionRepository.findByMedicalRecordIdOrderByPlayedAtDesc(medicalRecordId);
        AdaptiveRecommendation recommendation = buildAdaptiveRecommendation(record);

        double average7Days = averageScoreSince(medicalRecordId, LocalDateTime.now().minusDays(7));
        double average30Days = averageScoreSince(medicalRecordId, LocalDateTime.now().minusDays(30));
        boolean declineDetected = average30Days > 0 && average7Days < average30Days - DECLINE_THRESHOLD;

        String finalRecommendation = recommendation.message();
        if (declineDetected) {
            finalRecommendation = finalRecommendation + " Une réévaluation cognitive est recommandée.";
        }

        return CognitiveProgressResponse.builder()
                .medicalRecordId(record.getId())
                .patientId(record.getPatientId())
                .alzheimerStage(record.getAlzheimerStage())
                .totalSessions(sessions.size())
                .averageScoreLast7Days(average7Days)
                .averageScoreLast30Days(average30Days)
                .recommendedDifficulty(recommendation.recommendedDifficulty())
                .recommendedGameType(recommendation.recommendedGameType())
                .declineDetected(declineDetected)
                .easierGameSuggested(recommendation.easierGameSuggested())
                .recommendation(finalRecommendation.trim())
                .build();
    }

    @Transactional
    public GameSessionResponse update(UUID sessionId, GameSessionUpdateRequest request) {
        GameSession session = findSession(sessionId);
        MedicalRecordClientResponse record = getActiveMedicalRecord(session.getMedicalRecordId());

        if (request.getPlayerAnswer() != null) {
            session.setPlayerAnswer(trimToNull(request.getPlayerAnswer()));
        }
        if (request.getCorrect() != null) {
            session.setCorrect(request.getCorrect());
        }
        if (request.getScore() != null) {
            session.setScore(request.getScore());
        }
        if (request.getDifficultyAtPlay() != null) {
            validateDifficultyForStage(record.getAlzheimerStage(), request.getDifficultyAtPlay(), request.getDifficultyAtPlay());
            session.setDifficultyAtPlay(request.getDifficultyAtPlay());
        }
        if (request.getAssistanceNeeded() != null) {
            session.setAssistanceNeeded(request.getAssistanceNeeded());
        }
        if (request.getFrustrationLevel() != null) {
            session.setFrustrationLevel(request.getFrustrationLevel());
        }
        if (request.getEnjoymentLevel() != null) {
            session.setEnjoymentLevel(request.getEnjoymentLevel());
        }
        if (request.getAbandoned() != null) {
            session.setAbandoned(request.getAbandoned());
        }
        if (request.getNotes() != null) {
            session.setNotes(trimToNull(request.getNotes()));
        }

        session.setStageAtPlay(record.getAlzheimerStage());
        return toSessionResponse(gameSessionRepository.save(session));
    }

    @Transactional
    public void delete(UUID sessionId) {
        GameSession session = findSession(sessionId);
        getActiveMedicalRecord(session.getMedicalRecordId());
        gameSessionRepository.delete(session);
    }

    private GameSession findSession(UUID sessionId) {
        return gameSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "GameSession not found"));
    }

    private MedicalRecordClientResponse getActiveMedicalRecord(UUID medicalRecordId) {
        MedicalRecordClientResponse record = medicalRecordClientService.getMedicalRecord(medicalRecordId);
        if (!record.isActive()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Archived medical record cannot receive cognitive sessions");
        }
        return record;
    }

    private void validateDifficultyForStage(AlzheimerStage stage, Integer requestedDifficulty, int gameDifficulty) {
        int effectiveDifficulty = requestedDifficulty == null ? gameDifficulty : requestedDifficulty;
        if (effectiveDifficulty > maxDifficultyForStage(stage)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Game difficulty is too high for the current Alzheimer stage"
            );
        }
    }

    private AdaptiveRecommendation buildAdaptiveRecommendation(MedicalRecordClientResponse record) {
        List<GameSession> recentSessions = gameSessionRepository.findTop5ByMedicalRecordIdOrderByPlayedAtDesc(record.getId());
        if (recentSessions.isEmpty()) {
            return new AdaptiveRecommendation(
                    maxDifficultyForStage(record.getAlzheimerStage()),
                    null,
                    false,
                    "Aucune session enregistrée. Proposer des jeux simples adaptés au stade actuel."
            );
        }

        GameSession latestSession = recentSessions.get(0);
        CognitiveGameType gameType = latestSession.getCognitiveGame().getGameType();
        List<GameSession> typedRecentSessions = gameSessionRepository
                .findTop5ByMedicalRecordIdAndCognitiveGame_GameTypeOrderByPlayedAtDesc(record.getId(), gameType);

        double averageScore = typedRecentSessions.stream()
                .mapToInt(GameSession::getScore)
                .average()
                .orElse(latestSession.getScore());

        int recommendedDifficulty = latestSession.getDifficultyAtPlay();
        boolean easierGameSuggested = latestSession.getFrustrationLevel() >= 4;
        List<String> messages = new ArrayList<>();

        if (typedRecentSessions.size() >= 5 && averageScore >= 80) {
            recommendedDifficulty = Math.min(recommendedDifficulty + 1, maxDifficultyForStage(record.getAlzheimerStage()));
            messages.add("Les cinq dernières sessions sont très bonnes: difficulté augmentée progressivement.");
        } else if (typedRecentSessions.size() >= 5 && averageScore <= 40) {
            recommendedDifficulty = Math.max(recommendedDifficulty - 1, 1);
            easierGameSuggested = true;
            messages.add("Les cinq dernières sessions montrent une difficulté excessive: proposer un jeu plus simple.");
        } else {
            messages.add("Maintenir un niveau stable et suivre la progression sur les prochaines sessions.");
        }

        if (latestSession.getFrustrationLevel() >= 4) {
            messages.add("Le niveau de frustration est élevé: prévoir une pause et une activité plus accessible.");
        }

        if (latestSession.getEnjoymentLevel() >= 4 && latestSession.isCorrect()) {
            messages.add("Le patient apprécie ce type de jeu: recommander une activité similaire.");
        }

        return new AdaptiveRecommendation(
                recommendedDifficulty,
                gameType,
                easierGameSuggested,
                String.join(" ", messages)
        );
    }

    private double averageScoreSince(UUID medicalRecordId, LocalDateTime threshold) {
        List<GameSession> sessions = gameSessionRepository.findByMedicalRecordIdAndPlayedAtAfterOrderByPlayedAtDesc(medicalRecordId, threshold);
        if (sessions.isEmpty()) {
            return 0;
        }
        double average = sessions.stream().mapToInt(GameSession::getScore).average().orElse(0);
        return roundOneDecimal(average);
    }

    private int maxDifficultyForStage(AlzheimerStage stage) {
        if (stage == null) {
            return 3;
        }
        return switch (stage) {
            case EARLY -> 5;
            case MIDDLE -> 3;
            case LATE -> 2;
        };
    }

    private double roundOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    private CognitiveGameResponse toGameResponse(CognitiveGame game) {
        return CognitiveGameResponse.builder()
                .id(game.getId())
                .title(game.getTitle())
                .description(game.getDescription())
                .gameType(game.getGameType())
                .difficultyLevel(game.getDifficultyLevel())
                .estimatedDuration(game.getEstimatedDuration())
                .instructions(game.getInstructions())
                .active(game.isActive())
                .createdAt(game.getCreatedAt())
                .updatedAt(game.getUpdatedAt())
                .build();
    }

    private GameSessionResponse toSessionResponse(GameSession session) {
        return GameSessionResponse.builder()
                .id(session.getId())
                .medicalRecordId(session.getMedicalRecordId())
                .patientId(session.getPatientId())
                .cognitiveGameId(session.getCognitiveGame().getId())
                .gameTitle(session.getCognitiveGame().getTitle())
                .gameType(session.getCognitiveGame().getGameType())
                .stageAtPlay(session.getStageAtPlay())
                .playedAt(session.getPlayedAt())
                .playerAnswer(session.getPlayerAnswer())
                .correct(session.isCorrect())
                .score(session.getScore())
                .difficultyAtPlay(session.getDifficultyAtPlay())
                .assistanceNeeded(session.isAssistanceNeeded())
                .frustrationLevel(session.getFrustrationLevel())
                .enjoymentLevel(session.getEnjoymentLevel())
                .abandoned(session.isAbandoned())
                .notes(session.getNotes())
                .build();
    }

    private String trimToNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private record AdaptiveRecommendation(
            Integer recommendedDifficulty,
            CognitiveGameType recommendedGameType,
            boolean easierGameSuggested,
            String message
    ) {
    }
}
