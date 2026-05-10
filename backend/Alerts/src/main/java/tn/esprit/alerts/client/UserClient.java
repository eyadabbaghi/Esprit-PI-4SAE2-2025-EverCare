package tn.esprit.alerts.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PathVariable;
import tn.esprit.alerts.dto.UserDto; // you'll need a shared DTO or define one

@FeignClient(name = "User-service")
public interface UserClient {
    @GetMapping("/EverCare/internal/users/{userId}")
    UserDto getUserById(@PathVariable("userId") String userId);

    @GetMapping("/EverCare/internal/users/by-email")
    UserDto getInternalUserByEmail(@RequestParam("email") String email);
}
