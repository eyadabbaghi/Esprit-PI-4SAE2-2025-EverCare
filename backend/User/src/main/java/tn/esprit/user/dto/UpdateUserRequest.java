package tn.esprit.user.dto;

import lombok.Data;

import java.time.LocalDate;

@Data
public class UpdateUserRequest {
    private String name;
    private String email;
    private String phone;
    private LocalDate dateOfBirth;          // added
    private String emergencyContact;         // added
    private String profilePicture;
}