package tn.esprit.user.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class CommunicationReferenceService {

    private static final Logger log = LoggerFactory.getLogger(CommunicationReferenceService.class);

    private final RestTemplate restTemplate;

    @Value("${communication.email-reference-update-url:http://localhost:8086/api/internal/email-reference-update}")
    private String emailReferenceUpdateUrl;

    public void updateEmailReferences(String oldEmail, String newEmail) {
        if (oldEmail == null || newEmail == null || oldEmail.isBlank() || newEmail.isBlank()
                || oldEmail.equalsIgnoreCase(newEmail)) {
            return;
        }

        try {
            restTemplate.postForEntity(
                    emailReferenceUpdateUrl,
                    Map.of("oldEmail", oldEmail, "newEmail", newEmail),
                    Void.class
            );
        } catch (Exception ex) {
            log.warn("Could not update communication email references from {} to {}: {}",
                    oldEmail, newEmail, ex.getMessage());
        }
    }
}
