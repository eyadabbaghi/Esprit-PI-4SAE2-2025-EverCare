package tn.esprit.user.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PatientCaregiverRelationshipId implements Serializable {
    private String patientId;
    private String caregiverId;
}
