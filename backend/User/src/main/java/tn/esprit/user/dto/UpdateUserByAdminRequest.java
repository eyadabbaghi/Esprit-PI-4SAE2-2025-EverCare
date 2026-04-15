package tn.esprit.user.dto;

import lombok.Data;
import tn.esprit.user.entity.UserRole;

@Data
public class UpdateUserByAdminRequest {
    private String email;
    private UserRole role;
}