package tn.esprit.alerts.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import tn.esprit.alerts.dto.UserDto; // you'll need a shared DTO or define one

@FeignClient(name = "user-service")
public interface UserClient {
    @GetMapping("/EverCare/users/by-email?email={email}")
    UserDto getUserByEmail(@PathVariable("email") String email);
}