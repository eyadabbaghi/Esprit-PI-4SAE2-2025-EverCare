package com.yourteam.communicationservice.DTO;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.Set;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class UserDto {
    private String userId;
    private String keycloakId;
    private String name;
    private String email;
    private String role;
    private String phone;
    private boolean verified;
    private Object createdAt;
    private String profilePicture;
    private Set<String> caregiverEmails;
    private Set<String> patientEmails;
    private String doctorEmail;
}
