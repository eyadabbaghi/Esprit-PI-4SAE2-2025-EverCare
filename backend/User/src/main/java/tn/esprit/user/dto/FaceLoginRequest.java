package tn.esprit.user.dto;

import lombok.Data;

@Data
public class FaceLoginRequest {
    private String image; // base64 image
    private String keycloakId; // sent from Angular after email lookup
}