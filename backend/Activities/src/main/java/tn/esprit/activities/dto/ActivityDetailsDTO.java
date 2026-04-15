package tn.esprit.activities.dto;

import lombok.Data;
import tn.esprit.activities.enums.AlzheimerStage;
import tn.esprit.activities.enums.DifficultyLevel;

import java.util.List;

@Data
public class ActivityDetailsDTO {
    private String id;
    private String activityId;
    private List<String> instructions;
    private DifficultyLevel difficulty;
    private List<AlzheimerStage> recommendedStage;
    private String frequency;
    private String supervision;
    private List<String> benefits;
    private List<String> precautions;
}