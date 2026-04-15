package com.example.cognitivestimulationservice.dto;

import com.example.cognitivestimulationservice.entity.CognitiveGameType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CognitiveGameResponse {

    private UUID id;
    private String title;
    private String description;
    private CognitiveGameType gameType;
    private int difficultyLevel;
    private int estimatedDuration;
    private String instructions;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
