package tn.esprit.alerts.agent;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tn.esprit.alerts.client.NotificationClient;
import tn.esprit.alerts.dto.EviCareNotificationRequest;

@Service
@RequiredArgsConstructor
@Slf4j
public class EviCareNotificationService {

    private final NotificationClient notificationClient;

    public void notify(PatientRiskScore score) {
        if ("LOW".equals(score.getLevel())) return; // don't spam for low risk

        String message = String.format(
                "[EviCare] Risk level: %s | %s",
                score.getLevel(),
                score.getAdvice()
        );

        EviCareNotificationRequest req = new EviCareNotificationRequest(
                score.getPatientId(),
                "EVICARE_ALERT",
                message
        );

        try {
            notificationClient.send(req);
            log.info("EviCare sent notification for patient {} — level {}",
                    score.getPatientId(), score.getLevel());
        } catch (Exception e) {
            log.error("EviCare failed to notify for patient {}: {}",
                    score.getPatientId(), e.getMessage());
        }
    }
}