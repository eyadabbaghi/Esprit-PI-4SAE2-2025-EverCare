package tn.esprit.user.dto;

import lombok.Data;
import tn.esprit.user.entity.UserRole;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class UserDto {
    private String userId;
    private String name;
    private String email;
    private UserRole role;
    private String phone;
    private boolean isVerified;
    private LocalDateTime createdAt;
    private LocalDate dateOfBirth;
    private String emergencyContact;
    private String profilePicture;
}