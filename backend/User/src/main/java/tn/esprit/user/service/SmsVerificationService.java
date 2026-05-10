package tn.esprit.user.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
@Slf4j
public class SmsVerificationService {

    @Value("${twilio.account-sid:}")
    private String accountSid;

    @Value("${twilio.auth-token:}")
    private String authToken;

    @Value("${twilio.from-number:}")
    private String fromNumber;

    public void sendSms(String toNumber, String body) {
        if (accountSid == null || accountSid.isBlank()
                || authToken == null || authToken.isBlank()
                || fromNumber == null || fromNumber.isBlank()) {
            throw new RuntimeException("SMS provider is not configured");
        }

        try {
            Twilio.init(accountSid, authToken);
            Message message = Message.creator(
                    new PhoneNumber(toNumber),
                    new PhoneNumber(fromNumber),
                    body
            ).create();
            log.info("Verification SMS sent to {}: {}", toNumber, message.getSid());
        } catch (Exception e) {
            log.warn("Failed to send verification SMS to {}: {}", toNumber, e.getMessage());
            throw new RuntimeException("Could not send SMS verification code. Please check the phone number or try email verification.");
        }
    }
}
