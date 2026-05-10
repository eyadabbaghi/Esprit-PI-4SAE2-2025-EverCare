package tn.esprit.user.dto;

import tn.esprit.user.entity.UserRole;

public class GoogleLoginRequest {
    private String credential;
    private String idToken;
    private UserRole role;

    public String getCredential() {
        return credential;
    }

    public void setCredential(String credential) {
        this.credential = credential;
    }

    public String getIdToken() {
        return idToken;
    }

    public void setIdToken(String idToken) {
        this.idToken = idToken;
    }

    public UserRole getRole() {
        return role;
    }

    public void setRole(UserRole role) {
        this.role = role;
    }
}
