package com.example.cognitivestimulationservice.dto;

import com.example.cognitivestimulationservice.entity.CognitiveGameType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CognitiveGameRequest {

    @NotBlank(message = "title is required")
    @Size(max = 255, message = "title must be at most 255 characters")
    private String title;

    @NotBlank(message = "description is required")
    @Size(max = 2000, message = "description must be at most 2000 characters")
    private String description;

    @NotNull(message = "gameType is required")
    private CognitiveGameType gameType;

    @NotNull(message = "difficultyLevel is required")
    @Min(value = 1, message = "difficultyLevel must be >= 1")
    @Max(value = 5, message = "difficultyLevel must be <= 5")
    private Integer difficultyLevel;

    @NotNull(message = "estimatedDuration is required")
    @Min(value = 1, message = "estimatedDuration must be >= 1")
    @Max(value = 60, message = "estimatedDuration must be <= 60")
    private Integer estimatedDuration;

    @NotBlank(message = "instructions are required")
    @Size(max = 4000, message = "instructions must be at most 4000 characters")
    private String instructions;

    private Boolean active;
}
