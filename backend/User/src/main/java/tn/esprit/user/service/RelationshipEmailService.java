package tn.esprit.user.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import tn.esprit.user.entity.User;

@Service
@RequiredArgsConstructor
public class RelationshipEmailService {

    private static final Logger log = LoggerFactory.getLogger(RelationshipEmailService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${evercare.mail.from:EverCare <no-reply@evercare.local>}")
    private String mailFrom;

    public void sendAssociated(User actor, User target) {
        send(
                target,
                "You have a new EverCare care connection",
                """
                        Hi %s,

                        %s (%s) associated you on EverCare.

                        You can review this connection from your EverCare profile.

                        EverCare Team
                        """.formatted(displayName(target), displayName(actor), actor.getEmail())
        );
    }

    public void sendDisassociated(User actor, User target) {
        send(
                target,
                "An EverCare care connection was removed",
                """
                        Hi %s,

                        %s (%s) removed your EverCare care connection.

                        You can review your current care team from your EverCare profile.

                        EverCare Team
                        """.formatted(displayName(target), displayName(actor), actor.getEmail())
        );
    }

    private void send(User target, String subject, String body) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("Could not email relationship notification to {} because spring.mail.* is not configured.", target.getEmail());
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(target.getEmail());
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception ex) {
            log.warn("Could not send relationship email to {}. Reason: {}", target.getEmail(), ex.getMessage());
        }
    }

    private String displayName(User user) {
        return user.getName() == null || user.getName().isBlank() ? user.getEmail() : user.getName();
    }
}
