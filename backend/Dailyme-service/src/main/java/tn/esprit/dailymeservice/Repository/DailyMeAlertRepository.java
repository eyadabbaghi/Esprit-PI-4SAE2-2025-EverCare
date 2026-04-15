package tn.esprit.dailymeservice.Repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.esprit.dailymeservice.Model.DailyMeAlert;

import java.time.LocalDateTime;
import java.util.List;

public interface DailyMeAlertRepository extends JpaRepository<DailyMeAlert, Long> {

    List<DailyMeAlert> findByStatusOrderByCreatedAtDesc(String status);

    List<DailyMeAlert> findByPatientIdOrderByCreatedAtDesc(String patientId);

    // ✅ anti-spam: don't create many NEW alerts
    boolean existsByPatientIdAndStatusAndSource(String patientId, String status, String source);

    // ✅ optional: allow new alert after X hours
    List<DailyMeAlert> findByPatientIdAndSourceOrderByCreatedAtDesc(String patientId, String source);
}