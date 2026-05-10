package tn.esprit.user.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @Column(name = "user_id")
    private String userId;

    @PrePersist
    public void generateId() {
        if (this.userId == null) {
            this.userId = UUID.randomUUID().toString();
        }
        this.createdAt = LocalDateTime.now();
    }

    @Column(nullable = false)
    private String name;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(unique = true)
    private String keycloakId;

    @Column
    private LocalDateTime lastSeenAt;

    @Enumerated(EnumType.STRING)
    private UserRole role;

    private String phone;
    private String recoveryEmail;
    private String address;
    private String country;

    private boolean isVerified;

    private LocalDateTime createdAt;

    // Common profile fields
    private LocalDate dateOfBirth;
    private String emergencyContact;
    private String profilePicture;

    // Doctor-specific fields
    private Integer yearsExperience;
    private String specialization;
    private String medicalLicense;
    private String workplaceType; // "hospital" or "private"
    private String workplaceName;

    private String doctorEmail;

    @Builder.Default
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
            name = "patient_doctor_emails",
            joinColumns = @JoinColumn(name = "patient_id", referencedColumnName = "user_id")
    )
    @Column(name = "doctor_email")
    private Set<String> doctorEmails = new HashSet<>();

    // Many-to-many between patients and caregivers
    @ManyToMany
    @JoinTable(
            name = "patient_caregiver",
            joinColumns = @JoinColumn(name = "patient_id"),
            inverseJoinColumns = @JoinColumn(name = "caregiver_id")
    )
    private Set<User> caregivers = new HashSet<>();

    @ManyToMany(mappedBy = "caregivers")
    private Set<User> patients = new HashSet<>();

    // Helper methods to maintain bidirectional relationship
    public void addCaregiver(User caregiver) {
        caregivers.add(caregiver);
        caregiver.getPatients().add(this);
    }

    public void removeCaregiver(User caregiver) {
        caregivers.remove(caregiver);
        caregiver.getPatients().remove(this);
    }

}
