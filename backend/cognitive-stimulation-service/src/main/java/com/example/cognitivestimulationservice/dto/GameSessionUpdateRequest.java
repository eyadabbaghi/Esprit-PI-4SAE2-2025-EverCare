package com.example.cognitivestimulationservice.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GameSessionUpdateRequest {

    @Size(max = 2000, message = "playerAnswer must be at most 2000 characters")
    private String playerAnswer;

    private Boolean correct;

    @Min(value = 0, message = "score must be >= 0")
    @Max(value = 100, message = "score must be <= 100")
    private Integer score;

    @Min(value = 1, message = "difficultyAtPlay must be >= 1")
    @Max(value = 5, message = "difficultyAtPlay must be <= 5")
    private Integer difficultyAtPlay;

    private Boolean assistanceNeeded;

    @Min(value = 1, message = "frustrationLevel must be >= 1")
    @Max(value = 5, message = "frustrationLevel must be <= 5")
    private Integer frustrationLevel;

    @Min(value = 1, message = "enjoymentLevel must be >= 1")
    @Max(value = 5, message = "enjoymentLevel must be <= 5")
    private Integer enjoymentLevel;

    private Boolean abandoned;

    @Size(max = 2000, message = "notes must be at most 2000 characters")
    private String notes;
}
