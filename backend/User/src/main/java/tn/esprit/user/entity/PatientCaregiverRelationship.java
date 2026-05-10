package tn.esprit.user.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.IdClass;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "patient_caregiver")
@IdClass(PatientCaregiverRelationshipId.class)
@Getter
@Setter
@NoArgsConstructor
public class PatientCaregiverRelationship {

    @Id
    @Column(name = "patient_id")
    private String patientId;

    @Id
    @Column(name = "caregiver_id")
    private String caregiverId;

    @Column(name = "relationship_type")
    private String relationshipType;

    public PatientCaregiverRelationship(String patientId, String caregiverId, String relationshipType) {
        this.patientId = patientId;
        this.caregiverId = caregiverId;
        this.relationshipType = relationshipType;
    }
}
