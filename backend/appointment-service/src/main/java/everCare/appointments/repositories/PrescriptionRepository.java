package everCare.appointments.repositories;

import everCare.appointments.dtos.StatusCountDTO;
import everCare.appointments.dtos.TopMedicamentDTO;
import everCare.appointments.entities.Prescription;
import everCare.appointments.entities.User;
import everCare.appointments.entities.Medicament;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.time.LocalDate;
import java.util.List;

@Repository
public interface PrescriptionRepository extends JpaRepository<Prescription, String>, JpaSpecificationExecutor<Prescription> {

    // Find by patient
    List<Prescription> findByPatient(User patient);

    // Find by doctor
    List<Prescription> findByDoctor(User doctor);

    // Find by medicament
    List<Prescription> findByMedicament(Medicament medicament);

    // Find by status
    List<Prescription> findByStatut(String statut);

    // Find active prescriptions for a patient
    @Query("SELECT p FROM Prescription p WHERE p.patient = :patient AND p.statut = 'ACTIVE'")
    List<Prescription> findActiveByPatient(@Param("patient") User patient);

    // Find by date range
    List<Prescription> findByDatePrescriptionBetween(LocalDate start, LocalDate end);

    // Find prescriptions expiring soon
    @Query("SELECT p FROM Prescription p WHERE p.dateFin BETWEEN :start AND :end AND p.statut = 'ACTIVE'")
    List<Prescription> findExpiringBetween(@Param("start") LocalDate start, @Param("end") LocalDate end);

    // Find by patient and medicament
    List<Prescription> findByPatientAndMedicament(User patient, Medicament medicament);

    // Find by appointment
    List<Prescription> findByAppointment_AppointmentId(String appointmentId);

    // Count by medicament
    @Query("SELECT COUNT(p) FROM Prescription p WHERE p.medicament = :medicament")
    long countByMedicament(@Param("medicament") Medicament medicament);

    @Query("SELECT COUNT(p) FROM Prescription p WHERE (:doctorId IS NULL OR p.doctor.userId = :doctorId)")
    long countScoped(@Param("doctorId") String doctorId);

    @Query("SELECT COUNT(p) FROM Prescription p WHERE (:doctorId IS NULL OR p.doctor.userId = :doctorId) AND p.statut = :status")
    long countByStatusScoped(@Param("doctorId") String doctorId, @Param("status") String status);

    @Query("""
            SELECT COUNT(p) FROM Prescription p
            WHERE (:doctorId IS NULL OR p.doctor.userId = :doctorId)
              AND p.dateFin IS NOT NULL
              AND p.dateFin < :today
            """)
    long countExpiredScoped(@Param("doctorId") String doctorId, @Param("today") LocalDate today);

    @Query("""
            SELECT COUNT(p) FROM Prescription p
            WHERE (:doctorId IS NULL OR p.doctor.userId = :doctorId)
              AND p.statut = 'ACTIVE'
              AND p.dateFin IS NOT NULL
              AND p.dateFin BETWEEN :today AND :endDate
            """)
    long countExpiringSoonScoped(@Param("doctorId") String doctorId,
                                 @Param("today") LocalDate today,
                                 @Param("endDate") LocalDate endDate);

    @Query("""
            SELECT new everCare.appointments.dtos.StatusCountDTO(p.statut, COUNT(p))
            FROM Prescription p
            WHERE (:doctorId IS NULL OR p.doctor.userId = :doctorId)
            GROUP BY p.statut
            ORDER BY COUNT(p) DESC
            """)
    List<StatusCountDTO> getStatusBreakdown(@Param("doctorId") String doctorId);

    @Query("""
            SELECT new everCare.appointments.dtos.TopMedicamentDTO(m.medicamentId, m.nomCommercial, COUNT(p))
            FROM Prescription p
            JOIN p.medicament m
            WHERE (:doctorId IS NULL OR p.doctor.userId = :doctorId)
            GROUP BY m.medicamentId, m.nomCommercial
            ORDER BY COUNT(p) DESC
            """)
    List<TopMedicamentDTO> getTopMedicaments(@Param("doctorId") String doctorId);

    @Query("""
            SELECT COUNT(p) > 0 FROM Prescription p
            WHERE p.patient = :patient
              AND p.medicament = :medicament
              AND (:excludedPrescriptionId IS NULL OR p.prescriptionId <> :excludedPrescriptionId)
              AND p.statut NOT IN ('INTERROMPUE', 'TERMINEE')
              AND p.dateDebut IS NOT NULL
              AND p.dateFin IS NOT NULL
              AND p.dateDebut <= :dateFin
              AND p.dateFin >= :dateDebut
            """)
    boolean existsOverlappingPrescription(
            @Param("patient") User patient,
            @Param("medicament") Medicament medicament,
            @Param("dateDebut") LocalDate dateDebut,
            @Param("dateFin") LocalDate dateFin,
            @Param("excludedPrescriptionId") String excludedPrescriptionId
    );

    // Find renewals
    @Query("SELECT p FROM Prescription p WHERE p.renouvelable = true AND p.nombreRenouvellements > 0")
    List<Prescription> findRenewable();
}
