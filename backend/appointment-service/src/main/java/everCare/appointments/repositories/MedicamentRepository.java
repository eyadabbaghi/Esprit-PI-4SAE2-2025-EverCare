package everCare.appointments.repositories;

import everCare.appointments.dtos.MedicamentUsageStatsDTO;
import everCare.appointments.entities.Medicament;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface MedicamentRepository extends JpaRepository<Medicament, String>, JpaSpecificationExecutor<Medicament> {

    // Find by name
    List<Medicament> findByNomCommercialContainingIgnoreCase(String nom);

    List<Medicament> findByDenominationCommuneInternationaleContainingIgnoreCase(String dci);

    // Find by code CIP
    Medicament findByCodeCIP(String codeCIP);

    // Find active medicaments
    List<Medicament> findByActifTrue();

    // Find by laboratoire
    List<Medicament> findByLaboratoireContainingIgnoreCase(String laboratoire);

    // Find by forme
    List<Medicament> findByForme(String forme);

    // Search by multiple criteria
    @Query("SELECT m FROM Medicament m WHERE " +
            "LOWER(m.nomCommercial) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(m.denominationCommuneInternationale) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
            "LOWER(m.codeCIP) LIKE LOWER(CONCAT('%', :keyword, '%'))")
    List<Medicament> searchMedicaments(@Param("keyword") String keyword);

    // Check if exists
    boolean existsByCodeCIP(String codeCIP);

    @Query("""
            SELECT new everCare.appointments.dtos.MedicamentUsageStatsDTO(
                m.medicamentId,
                m.nomCommercial,
                m.actif,
                COUNT(p),
                SUM(CASE WHEN p.statut = 'ACTIVE' THEN 1 ELSE 0 END),
                MAX(p.datePrescription)
            )
            FROM Medicament m
            LEFT JOIN Prescription p ON p.medicament = m AND (:doctorId IS NULL OR p.doctorId = :doctorId)
            GROUP BY m.medicamentId, m.nomCommercial, m.actif
            ORDER BY COUNT(p) DESC, m.nomCommercial ASC
            """)
    List<MedicamentUsageStatsDTO> getUsageStats(@Param("doctorId") String doctorId);
}
