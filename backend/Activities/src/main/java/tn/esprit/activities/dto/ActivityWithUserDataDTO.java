package tn.esprit.activities.dto;

import lombok.Data;
import tn.esprit.activities.enums.AlzheimerStage;
import tn.esprit.activities.enums.DifficultyLevel;

import java.util.List;

@Data
public class ActivityWithUserDataDTO {
    // Activity fields
    private String id;
    private String name;
    private String type;
    private int duration;
    private String scheduledTime;
    private String description;
    private String imageUrl;
    private double rating;
    private int totalRatings;
    private boolean doctorSuggested;
    private String location;
    private String startTime;
    private String monitoredBy;

    // ActivityDetails fields
    private List<String> instructions;
    private DifficultyLevel difficulty;
    private List<AlzheimerStage> recommendedStage;
    private String frequency;
    private String supervision;
    private List<String> benefits;
    private List<String> precautions;

    // User-specific fields
    private boolean completed;
    private boolean favorite;
    private Integer userRating;

    // NEW: indicates this activity was recommended by the user's doctor
    private boolean recommendedByDoctor;
    private String doctorName;
    private String doctorPicture;
}