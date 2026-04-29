package com.yourteam.communicationservice.client;

import com.yourteam.communicationservice.DTO.UserDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@FeignClient(name = "User-service", path = "/EverCare/users")
public interface UserServiceClient {

    @GetMapping("/by-email")
    UserDto getUserByEmail(@RequestParam("email") String email);

    @GetMapping("/search")
    List<UserDto> searchUsersByRole(@RequestParam("q") String query,
                                    @RequestParam("role") String role);
}