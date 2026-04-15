package tn.esprit.dailymeservice.Service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.dailymeservice.Model.DailyMeAlert;
import tn.esprit.dailymeservice.Repository.DailyMeAlertRepository;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class DailyMeAlertService {

    private final DailyMeAlertRepository repo;

    private static final String SOURCE = "DAILYME_INSIGHTS";

    @Transactional
    public void createHighRiskIfNeeded(String patientId, String reason) {

        // ✅ if there is already a NEW alert from DAILYME_INSIGHTS, don't spam
        boolean already = repo.existsByPatientIdAndStatusAndSource(patientId, "NEW", SOURCE);
        if (already) return;

        DailyMeAlert a = new DailyMeAlert();
        a.setPatientId(patientId);
        a.setRiskLevel("HIGH");
        a.setStatus("NEW");
        a.setReason(reason);
        a.setSource(SOURCE);
        a.setCreatedAt(LocalDateTime.now());
        a.setResolvedAt(null);

        repo.save(a);
    }

    public List<DailyMeAlert> getNew() {
        return repo.findByStatusOrderByCreatedAtDesc("NEW");
    }

    public List<DailyMeAlert> getByPatient(String patientId) {
        return repo.findByPatientIdOrderByCreatedAtDesc(patientId);
    }

    @Transactional
    public DailyMeAlert markStatus(Long id, String status) {
        DailyMeAlert a = repo.findById(id).orElseThrow(() -> new RuntimeException("Alert not found"));
        a.setStatus(status);

        if ("RESOLVED".equalsIgnoreCase(status)) {
            a.setResolvedAt(LocalDateTime.now());
        }
        return repo.save(a);
    }
}