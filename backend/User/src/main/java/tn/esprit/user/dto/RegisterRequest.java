package tn.esprit.user.dto;

import lombok.Data;
import tn.esprit.user.entity.UserRole;

@Data
public class RegisterRequest {
    private String name;
    private String email;
    private String password;
    private UserRole role;   // from dropdown
}