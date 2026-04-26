package everCare.appointments.feign;

import everCare.appointments.dtos.PdfEmailRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(name = "notification-service", configuration = everCare.appointments.config.FeignClientConfig.class)
public interface NotificationFeignClient {

    @PostMapping("/notifications/prescription-pdf")
    void sendPrescriptionEmail(@RequestBody PdfEmailRequest request);

}

