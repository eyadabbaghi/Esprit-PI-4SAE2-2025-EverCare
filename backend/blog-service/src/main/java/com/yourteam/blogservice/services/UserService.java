package com.yourteam.blogservice.services;

import com.yourteam.blogservice.client.UserServiceClient;
import com.yourteam.blogservice.dto.UserDto;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserServiceClient userServiceClient;

    public UserDto getCurrentUser() {
        Jwt jwt = (Jwt) SecurityContextHolder.getContext().getAuthentication().getCredentials();
        String token = jwt.getTokenValue();
        String authHeader = "Bearer " + token;
        return userServiceClient.getCurrentUser(authHeader);
    }
}