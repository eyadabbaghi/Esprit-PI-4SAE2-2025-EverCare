package tn.esprit.user.dto;

import lombok.Data;

@Data
public class CreateAdminUserRequest {
    private String name;
    private String email;
    private String password;
    private String phone;
}
