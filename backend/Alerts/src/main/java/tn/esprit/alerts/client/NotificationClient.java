package tn.esprit.alerts.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import tn.esprit.alerts.dto.EviCareNotificationRequest;

@FeignClient(name = "notification-service")
public interface NotificationClient {

    @PostMapping("/api/notifications/send")
    void send(@RequestBody EviCareNotificationRequest request);
}