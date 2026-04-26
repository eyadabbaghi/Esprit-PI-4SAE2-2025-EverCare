package com.example.cognitivestimulationservice.dto;

import com.example.cognitivestimulationservice.entity.AlzheimerStage;
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
public class GameSessionResponse {

    private UUID id;
    private UUID medicalRecordId;
    private String patientId;
    private UUID cognitiveGameId;
    private String gameTitle;
    private CognitiveGameType gameType;
    private AlzheimerStage stageAtPlay;
    private LocalDateTime playedAt;
    private String playerAnswer;
    private boolean correct;
    private int score;
    private int difficultyAtPlay;
    private boolean assistanceNeeded;
    private int frustrationLevel;
    private int enjoymentLevel;
    private boolean abandoned;
    private String notes;
}
