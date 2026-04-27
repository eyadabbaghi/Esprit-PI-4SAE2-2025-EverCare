package com.yourteam.communicationservice.DTO;

import lombok.Data;

@Data
public class UserDto {
    private String userId;
    private String keycloakId;
    private String name;
    private String email;
    private String role;
    private String phone;
    private boolean verified;
    private String createdAt;
    private String profilePicture;
}