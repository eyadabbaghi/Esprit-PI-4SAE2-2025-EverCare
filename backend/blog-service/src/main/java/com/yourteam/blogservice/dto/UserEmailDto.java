package com.yourteam.blogservice.dto;

import lombok.Data;

@Data
public class UserEmailDto {
    private String userId;
    private String email;
    private String name;
    // autres champs si besoin
}