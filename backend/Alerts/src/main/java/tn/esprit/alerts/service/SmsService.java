package tn.esprit.alerts.service;

import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.type.PhoneNumber;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import com.twilio.rest.api.v2010.account.Call;
import java.net.URI;

@Service
@Slf4j
public class SmsService {

    @Value("${twilio.account-sid}")
    private String accountSid;

    @Value("${twilio.auth-token}")
    private String authToken;

    @Value("${twilio.from-number}")
    private String fromNumber;

    public void sendSms(String toNumber, String body) {
        try {
            Twilio.init(accountSid, authToken);
            Message message = Message.creator(
                    new PhoneNumber(toNumber),
                    new PhoneNumber(fromNumber),
                    body
            ).create();
            log.info("SMS sent: {}", message.getSid());
        } catch (Exception e) {
            log.error("Failed to send SMS to {}: {}", toNumber, e.getMessage());
        }
    }




    public void makeCall(String toNumber, String patientName) {
        try {
            if (toNumber == null || toNumber.isBlank()) {
                log.warn("Call skipped: no phone number provided");
                return;
            }

            if (!toNumber.startsWith("+")) {
                toNumber = "+216" + toNumber.replaceAll("^0+", "");
            }

            Twilio.init(accountSid, authToken);

            // TwiML that speaks the SOS message when caregiver picks up
            String twiml = "<Response><Say voice=\"alice\" loop=\"3\">" +
                    "PATIENT S O S. Your patient " + patientName +
                    " has triggered an emergency SOS alert. Please check on them immediately." +
                    "</Say></Response>";

            // We use a TwiML bin URL or inline TwiML via a data URI workaround
            // Twilio requires a URL — we use a public TwiML bin you create once
            // OR use Twilio's twiml parameter directly via the API
            Call call = Call.creator(
                    new PhoneNumber(toNumber),
                    new PhoneNumber(fromNumber),
                    new com.twilio.type.Twiml(twiml)
            ).create();

            log.info("SOS call initiated to {}: {}", toNumber, call.getSid());
        } catch (Exception e) {
            log.error("Failed to make SOS call to {}: {}", toNumber, e.getMessage());
        }
    }
}