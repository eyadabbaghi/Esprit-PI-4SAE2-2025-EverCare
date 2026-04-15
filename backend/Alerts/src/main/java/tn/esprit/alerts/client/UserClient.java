package tn.esprit.alerts.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import tn.esprit.alerts.dto.UserDto; // you'll need a shared DTO or define one

@FeignClient(name = "user-service", path = "/EverCare/users")
public interface UserClient {
    @GetMapping("/by-email")
    UserDto getUserByEmail(@RequestParam("email") String email);
}
