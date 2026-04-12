package tn.esprit.dailymeservice.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tn.esprit.dailymeservice.Model.DailyMeAlert;

import java.time.LocalDateTime;
import java.util.List;

public interface DailyMeAlertRepository extends JpaRepository<DailyMeAlert, Long> {

    List<DailyMeAlert> findByStatusOrderByCreatedAtDesc(String status);

    List<DailyMeAlert> findByPatientIdOrderByCreatedAtDesc(String patientId);

    List<DailyMeAlert> findByPatientIdAndStatusOrderByCreatedAtDesc(String patientId, String status);

    boolean existsByPatientIdAndStatusAndSource(String patientId, String status, String source);

    @Query("""
        SELECT COUNT(a) > 0
        FROM DailyMeAlert a
        WHERE a.patientId = :patientId
          AND a.source = :source
          AND a.riskLevel = :riskLevel
          AND a.status = :status
          AND a.createdAt >= :since
    """)
    boolean existsRecentNewByPatientAndSourceAndRisk(
            @Param("patientId") String patientId,
            @Param("source") String source,
            @Param("riskLevel") String riskLevel,
            @Param("status") String status,
            @Param("since") LocalDateTime since
    );
}