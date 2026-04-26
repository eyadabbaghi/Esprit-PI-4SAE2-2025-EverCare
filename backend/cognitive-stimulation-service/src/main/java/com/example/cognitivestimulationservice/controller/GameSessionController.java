package com.example.cognitivestimulationservice.controller;

import com.example.cognitivestimulationservice.dto.CognitiveGameResponse;
import com.example.cognitivestimulationservice.dto.CognitiveProgressResponse;
import com.example.cognitivestimulationservice.dto.GameSessionCreateRequest;
import com.example.cognitivestimulationservice.dto.GameSessionResponse;
import com.example.cognitivestimulationservice.dto.GameSessionUpdateRequest;
import com.example.cognitivestimulationservice.service.GameSessionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@Validated
public class GameSessionController {

    private final GameSessionService gameSessionService;

    public GameSessionController(GameSessionService gameSessionService) {
        this.gameSessionService = gameSessionService;
    }

    @GetMapping("/api/medical-records/{medicalRecordId}/recommended-games")
    public ResponseEntity<List<CognitiveGameResponse>> recommendedGames(@PathVariable UUID medicalRecordId) {
        return ResponseEntity.ok(gameSessionService.getRecommendedGames(medicalRecordId));
    }

    @PostMapping("/api/medical-records/{medicalRecordId}/game-sessions")
    public ResponseEntity<GameSessionResponse> create(
            @PathVariable UUID medicalRecordId,
            @Valid @RequestBody GameSessionCreateRequest request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(gameSessionService.create(medicalRecordId, request));
    }

    @GetMapping("/api/medical-records/{medicalRecordId}/game-sessions")
    public ResponseEntity<List<GameSessionResponse>> listByMedicalRecord(@PathVariable UUID medicalRecordId) {
        return ResponseEntity.ok(gameSessionService.listByMedicalRecord(medicalRecordId));
    }

    @GetMapping("/api/medical-records/{medicalRecordId}/game-progress")
    public ResponseEntity<CognitiveProgressResponse> progress(@PathVariable UUID medicalRecordId) {
        return ResponseEntity.ok(gameSessionService.getProgress(medicalRecordId));
    }

    @PutMapping("/api/game-sessions/{sessionId}")
    public ResponseEntity<GameSessionResponse> update(
            @PathVariable UUID sessionId,
            @Valid @RequestBody GameSessionUpdateRequest request
    ) {
        return ResponseEntity.ok(gameSessionService.update(sessionId, request));
    }

    @DeleteMapping("/api/game-sessions/{sessionId}")
    public ResponseEntity<Void> delete(@PathVariable UUID sessionId) {
        gameSessionService.delete(sessionId);
        return ResponseEntity.noContent().build();
    }
}
