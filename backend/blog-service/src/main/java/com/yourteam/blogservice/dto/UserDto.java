package com.yourteam.blogservice.dto;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class UserDto {
    private String userId;
    private String keycloakId;
    private String name;
    private String email;
    private String role;
    private String phone;
    private boolean isVerified;
    private LocalDateTime createdAt;
    private String profilePicture;
}