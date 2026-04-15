package com.yourteam.blogservice.client;

import com.yourteam.blogservice.dto.UserDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(name = "user-service", path = "/EverCare")
public interface UserServiceClient {

    @GetMapping("/users/me")
    UserDto getCurrentUser(@RequestHeader("Authorization") String authHeader);
}
