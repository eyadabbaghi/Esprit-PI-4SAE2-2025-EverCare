package org.example.trackingservice.client;

import org.example.trackingservice.dto.PatientUserDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@FeignClient(name = "USER", path = "/EverCare/internal/users")
public interface UserServiceClient {

    @GetMapping("/patients/{userId}")
    PatientUserDto getPatientById(@PathVariable("userId") String userId);
}
