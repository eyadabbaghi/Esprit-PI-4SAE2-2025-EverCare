package tn.esprit.activities.entity;

import jakarta.persistence.*;
import lombok.*;
import tn.esprit.activities.config.StageListConverter;
import tn.esprit.activities.config.StringListConverter;
import tn.esprit.activities.enums.AlzheimerStage;
import tn.esprit.activities.enums.DifficultyLevel;

import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "activity_details")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ActivityDetails {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "activity_id", nullable = false)
    private Activity activity;

    @Convert(converter = StringListConverter.class)
    @Column(columnDefinition = "JSON")
    private List<String> instructions = new ArrayList<>();

    @Enumerated(EnumType.STRING)
    private DifficultyLevel difficulty;

    @Convert(converter = StageListConverter.class)
    @Column(columnDefinition = "JSON")
    private List<AlzheimerStage> recommendedStage = new ArrayList<>();

    private String frequency; // e.g., "Daily"

    private String supervision;

    @Convert(converter = StringListConverter.class)
    @Column(columnDefinition = "JSON")
    private List<String> benefits = new ArrayList<>();

    @Convert(converter = StringListConverter.class)
    @Column(columnDefinition = "JSON")
    private List<String> precautions = new ArrayList<>();
}