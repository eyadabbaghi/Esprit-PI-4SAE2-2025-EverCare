package tn.esprit.activities.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import tn.esprit.activities.dto.NotificationRequest;  // We'll create this DTO

@FeignClient(name = "notification-service", path = "/api/notifications")
public interface NotificationClient {

    @PostMapping("/send")
    void sendNotification(@RequestBody NotificationRequest request);
}