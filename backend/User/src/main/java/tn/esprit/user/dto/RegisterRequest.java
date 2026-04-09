package tn.esprit.user.dto;

import tn.esprit.user.entity.UserRole;

// Explicit accessors keep this DTO compiling even when Lombok annotation processing is not enabled.
public class RegisterRequest {
    private String name;
    private String email;
    private String password;
    private UserRole role;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }
}
