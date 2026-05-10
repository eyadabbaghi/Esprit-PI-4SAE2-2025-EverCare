package tn.esprit.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.esprit.user.entity.PatientCaregiverRelationship;
import tn.esprit.user.entity.PatientCaregiverRelationshipId;

import java.util.List;

public interface PatientCaregiverRelationshipRepository extends JpaRepository<PatientCaregiverRelationship, PatientCaregiverRelationshipId> {
    List<PatientCaregiverRelationship> findByPatientId(String patientId);
    List<PatientCaregiverRelationship> findByCaregiverId(String caregiverId);
    boolean existsByPatientIdAndCaregiverId(String patientId, String caregiverId);

    @Modifying
    @Query(value = """
            INSERT INTO patient_caregiver (patient_id, caregiver_id, relationship_type)
            VALUES (:patientId, :caregiverId, :relationshipType)
            ON DUPLICATE KEY UPDATE relationship_type = VALUES(relationship_type)
            """, nativeQuery = true)
    void upsertRelationshipType(
            @Param("patientId") String patientId,
            @Param("caregiverId") String caregiverId,
            @Param("relationshipType") String relationshipType
    );

    @Modifying
    @Query("delete from PatientCaregiverRelationship r where r.patientId = :patientId and r.caregiverId = :caregiverId")
    void deleteByPatientAndCaregiver(@Param("patientId") String patientId, @Param("caregiverId") String caregiverId);
}
