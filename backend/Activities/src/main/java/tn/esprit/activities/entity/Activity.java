package tn.esprit.activities.entity;

import jakarta.persistence.*;
import lombok.*;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "activities")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Activity {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private String id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String type; // e.g., "Relaxation", "Cognitive"

    @Column(nullable = false)
    private int duration; // minutes

    private String scheduledTime; // e.g., "08:00 AM"

    @Column(length = 1000)
    private String description;

    private String imageUrl;

    private double rating; // global average
    private int totalRatings;

    private boolean doctorSuggested;

    private String location;
    private String startTime;
    private String monitoredBy;

    @OneToMany(mappedBy = "activity", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ActivityDetails> details = new ArrayList<>();

    @OneToMany(mappedBy = "activity", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<UserActivity> userActivities = new ArrayList<>();
}