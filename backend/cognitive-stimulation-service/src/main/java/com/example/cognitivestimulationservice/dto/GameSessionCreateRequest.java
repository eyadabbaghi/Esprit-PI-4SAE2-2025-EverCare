package com.example.cognitivestimulationservice.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.util.UUID;

@Getter
@Setter
public class GameSessionCreateRequest {

    @NotNull(message = "cognitiveGameId is required")
    private UUID cognitiveGameId;

    @Size(max = 2000, message = "playerAnswer must be at most 2000 characters")
    private String playerAnswer;

    @NotNull(message = "correct is required")
    private Boolean correct;

    @NotNull(message = "score is required")
    @Min(value = 0, message = "score must be >= 0")
    @Max(value = 100, message = "score must be <= 100")
    private Integer score;

    @Min(value = 1, message = "difficultyAtPlay must be >= 1")
    @Max(value = 5, message = "difficultyAtPlay must be <= 5")
    private Integer difficultyAtPlay;

    @NotNull(message = "assistanceNeeded is required")
    private Boolean assistanceNeeded;

    @NotNull(message = "frustrationLevel is required")
    @Min(value = 1, message = "frustrationLevel must be >= 1")
    @Max(value = 5, message = "frustrationLevel must be <= 5")
    private Integer frustrationLevel;

    @NotNull(message = "enjoymentLevel is required")
    @Min(value = 1, message = "enjoymentLevel must be >= 1")
    @Max(value = 5, message = "enjoymentLevel must be <= 5")
    private Integer enjoymentLevel;

    @NotNull(message = "abandoned is required")
    private Boolean abandoned;

    @Size(max = 2000, message = "notes must be at most 2000 characters")
    private String notes;
}
