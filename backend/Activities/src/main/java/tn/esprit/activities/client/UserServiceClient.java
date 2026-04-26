package tn.esprit.activities.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import tn.esprit.activities.dto.UserDto;
import tn.esprit.activities.config.FeignClientConfig;

@FeignClient(name = "user-service", url = "http://localhost:8089/EverCare", configuration = FeignClientConfig.class)
public interface UserServiceClient {
    @GetMapping("/users/{userId}")
    UserDto getUserById(@PathVariable("userId") String userId);
}