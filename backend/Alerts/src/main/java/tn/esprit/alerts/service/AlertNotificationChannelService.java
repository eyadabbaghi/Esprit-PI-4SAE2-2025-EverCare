package tn.esprit.alerts.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import tn.esprit.alerts.client.NotificationClient;
import tn.esprit.alerts.client.UserClient;
import tn.esprit.alerts.dto.EviCareNotificationRequest;
import tn.esprit.alerts.dto.UserDto;
import tn.esprit.alerts.entity.Alert;
import tn.esprit.alerts.entity.Incident;

import java.util.List;
import java.util.Locale;
import java.util.ArrayList;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AlertNotificationChannelService {

    private final UserClient userClient;
    private final NotificationClient notificationClient;
    private final SmsService smsService;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    public void dispatch(Alert alert, Set<String> channels) {
        if (alert == null || channels == null || channels.isEmpty()) {
            return;
        }

        UserDto recipient = resolveRecipient(alert.getTargetId());
        if (recipient == null) {
            log.warn("Alert channel dispatch skipped: target user {} could not be resolved", alert.getTargetId());
            return;
        }

        Set<String> normalizedChannels = channels.stream()
                .filter(channel -> channel != null && !channel.isBlank())
                .map(channel -> channel.trim().toLowerCase(Locale.ROOT))
                .collect(Collectors.toSet());

        if (normalizedChannels.contains("in-app")) {
            sendInApp(alert, recipient);
        }

        if (normalizedChannels.contains("email")) {
            sendEmail(alert, recipient);
        }

        if (normalizedChannels.contains("sms")) {
            sendSms(alert, recipient);
        }
    }

    private UserDto resolveRecipient(String targetId) {
        try {
            return userClient.getUserById(targetId);
        } catch (Exception byIdError) {
            try {
                return userClient.getInternalUserByEmail(targetId);
            } catch (Exception byEmailError) {
                log.warn("Could not resolve alert recipient {} by id or email", targetId);
                return null;
            }
        }
    }

    private void sendInApp(Alert alert, UserDto recipient) {
        try {
            EviCareNotificationRequest request = new EviCareNotificationRequest();
            request.setActivityId(alert.getIncident().getIncidentId());
            request.setAction("ALERT_CREATED");
            request.setDetails(buildMessage(alert));
            request.setTargetUserIds(buildNotificationTargets(recipient));
            notificationClient.send(request);
        } catch (Exception ex) {
            log.error("Failed to send in-app alert notification {}: {}", alert.getAlertId(), ex.getMessage());
        }
    }

    private void sendEmail(Alert alert, UserDto recipient) {
        if (recipient.getEmail() == null || recipient.getEmail().isBlank()) {
            log.warn("Alert email skipped: target {} has no email", recipient.getUserId());
            return;
        }

        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("Alert email skipped for {}. Configure spring.mail.* to send real alert emails.", recipient.getEmail());
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(recipient.getEmail());
            message.setSubject("EverCare Alert: " + getAlertTitle(alert));
            message.setText(buildMessage(alert));
            mailSender.send(message);
        } catch (Exception ex) {
            log.error("Failed to send alert email to {}: {}", recipient.getEmail(), ex.getMessage());
        }
    }

    private void sendSms(Alert alert, UserDto recipient) {
        if (recipient.getPhone() == null || recipient.getPhone().isBlank()) {
            log.warn("Alert SMS skipped: target {} has no phone number", recipient.getUserId());
            return;
        }

        smsService.sendSms(normalizePhone(recipient.getPhone()), buildSmsMessage(alert));
    }

    private String buildMessage(Alert alert) {
        Incident incident = alert.getIncident();
        StringBuilder message = new StringBuilder();
        message.append("EverCare alert");
        message.append(": ").append(getAlertTitle(alert));
        message.append("\n\nIncident: ").append(valueOrFallback(incident.getTitle(), "Untitled incident"));
        message.append("\nSeverity: ").append(incident.getSeverity());
        message.append("\nType: ").append(valueOrFallback(incident.getType(), "General"));
        if (incident.getLocation() != null && !incident.getLocation().isBlank()) {
            message.append("\nLocation: ").append(incident.getLocation());
        }
        if (incident.getDescription() != null && !incident.getDescription().isBlank()) {
            message.append("\n\nDetails: ").append(incident.getDescription());
        }
        return message.toString();
    }

    private String buildSmsMessage(Alert alert) {
        Incident incident = alert.getIncident();
        String title = valueOrFallback(incident.getTitle(), "incident");
        return "EverCare alert: " + getAlertTitle(alert) + ". " + title + " (" + incident.getSeverity() + ").";
    }

    private String getAlertTitle(Alert alert) {
        return valueOrFallback(alert.getLabel(), alert.getIncident().getTitle());
    }

    private String valueOrFallback(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private String normalizePhone(String phone) {
        String trimmed = phone.trim().replace(" ", "");
        if (trimmed.startsWith("+")) {
            return trimmed;
        }
        return "+216" + trimmed.replaceAll("^0+", "");
    }

    private List<String> buildNotificationTargets(UserDto recipient) {
        List<String> targets = new ArrayList<>();
        if (recipient.getUserId() != null && !recipient.getUserId().isBlank()) {
            targets.add(recipient.getUserId());
        }
        if (recipient.getEmail() != null && !recipient.getEmail().isBlank()) {
            targets.add(recipient.getEmail());
        }
        return targets;
    }
}
