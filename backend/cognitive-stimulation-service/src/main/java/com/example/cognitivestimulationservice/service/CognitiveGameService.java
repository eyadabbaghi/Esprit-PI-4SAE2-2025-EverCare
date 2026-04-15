package com.example.cognitivestimulationservice.service;

import com.example.cognitivestimulationservice.dto.CognitiveGameRequest;
import com.example.cognitivestimulationservice.dto.CognitiveGameResponse;
import com.example.cognitivestimulationservice.entity.CognitiveGame;
import com.example.cognitivestimulationservice.repository.CognitiveGameRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CognitiveGameService {

    private final CognitiveGameRepository cognitiveGameRepository;

    public CognitiveGameResponse create(CognitiveGameRequest request) {
        CognitiveGame game = CognitiveGame.builder()
                .title(request.getTitle().trim())
                .description(request.getDescription().trim())
                .gameType(request.getGameType())
                .difficultyLevel(request.getDifficultyLevel())
                .estimatedDuration(request.getEstimatedDuration())
                .instructions(request.getInstructions().trim())
                .active(request.getActive() == null || request.getActive())
                .build();

        return toResponse(cognitiveGameRepository.save(game));
    }

    public List<CognitiveGameResponse> list(Boolean active) {
        List<CognitiveGame> games;
        if (Boolean.FALSE.equals(active)) {
            games = cognitiveGameRepository.findAll().stream()
                    .filter(game -> !game.isActive())
                    .sorted((left, right) -> {
                        int difficultyOrder = Integer.compare(left.getDifficultyLevel(), right.getDifficultyLevel());
                        if (difficultyOrder != 0) {
                            return difficultyOrder;
                        }
                        return left.getTitle().compareToIgnoreCase(right.getTitle());
                    })
                    .toList();
        } else if (Boolean.TRUE.equals(active)) {
            games = cognitiveGameRepository.findByActiveTrueOrderByDifficultyLevelAscTitleAsc();
        } else {
            games = cognitiveGameRepository.findAll().stream()
                    .sorted((left, right) -> {
                        int activeOrder = Boolean.compare(right.isActive(), left.isActive());
                        if (activeOrder != 0) {
                            return activeOrder;
                        }
                        int difficultyOrder = Integer.compare(left.getDifficultyLevel(), right.getDifficultyLevel());
                        if (difficultyOrder != 0) {
                            return difficultyOrder;
                        }
                        return left.getTitle().compareToIgnoreCase(right.getTitle());
                    })
                    .toList();
        }
        return games.stream().map(this::toResponse).toList();
    }

    public CognitiveGameResponse getById(UUID id) {
        return toResponse(findById(id));
    }

    public CognitiveGameResponse update(UUID id, CognitiveGameRequest request) {
        CognitiveGame game = findById(id);
        game.setTitle(request.getTitle().trim());
        game.setDescription(request.getDescription().trim());
        game.setGameType(request.getGameType());
        game.setDifficultyLevel(request.getDifficultyLevel());
        game.setEstimatedDuration(request.getEstimatedDuration());
        game.setInstructions(request.getInstructions().trim());
        if (request.getActive() != null) {
            game.setActive(request.getActive());
        }
        return toResponse(cognitiveGameRepository.save(game));
    }

    public void archive(UUID id) {
        CognitiveGame game = findById(id);
        if (!game.isActive()) {
            return;
        }
        game.setActive(false);
        cognitiveGameRepository.save(game);
    }

    public CognitiveGame findActiveById(UUID id) {
        CognitiveGame game = findById(id);
        if (!game.isActive()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Inactive cognitive game cannot be assigned");
        }
        return game;
    }

    private CognitiveGame findById(UUID id) {
        return cognitiveGameRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "CognitiveGame not found"));
    }

    private CognitiveGameResponse toResponse(CognitiveGame game) {
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
}
