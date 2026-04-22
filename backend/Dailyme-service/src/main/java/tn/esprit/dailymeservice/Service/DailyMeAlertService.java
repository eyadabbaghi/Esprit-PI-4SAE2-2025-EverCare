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
    private static final String HIGH = "HIGH";
    private static final String NEW = "NEW";
    private static final String RESOLVED = "RESOLVED";

    // Change this if you want 12h, 48h, etc.
    private static final int COOLDOWN_HOURS = 24;

    @Transactional
    public void createHighRiskIfNeeded(String patientId, String reason) {

        // ✅ Anti-spam: do not create another NEW HIGH alert if there is one created in last 24h
        LocalDateTime since = LocalDateTime.now().minusHours(COOLDOWN_HOURS);

        boolean alreadyRecent = repo.existsRecentNewByPatientAndSourceAndRisk(
                patientId, SOURCE, HIGH, NEW, since
        );

        if (alreadyRecent) {
            return;
        }

        DailyMeAlert a = new DailyMeAlert();
        a.setPatientId(patientId);
        a.setRiskLevel(HIGH);
        a.setStatus(NEW);
        a.setReason(reason);
        a.setSource(SOURCE);
        a.setCreatedAt(LocalDateTime.now());
        a.setResolvedAt(null);

        repo.save(a);
    }

    // ⚠️ This returns NEW alerts for ALL patients
    // Keep it only if admin needs to see all alerts.
    public List<DailyMeAlert> getNew() {
        return repo.findByStatusOrderByCreatedAtDesc(NEW);
    }

    // ✅ Better for patient dashboard
    public List<DailyMeAlert> getNewByPatient(String patientId) {
        return repo.findByPatientIdAndStatusOrderByCreatedAtDesc(patientId, NEW);
    }

    public List<DailyMeAlert> getByPatient(String patientId) {
        return repo.findByPatientIdOrderByCreatedAtDesc(patientId);
    }

    @Transactional
    public DailyMeAlert markStatus(Long id, String status) {
        DailyMeAlert a = repo.findById(id)
                .orElseThrow(() -> new RuntimeException("Alert not found"));

        a.setStatus(status);

        if (RESOLVED.equalsIgnoreCase(status)) {
            a.setResolvedAt(LocalDateTime.now());
        }

        return repo.save(a);
    }
}