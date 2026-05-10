package tn.esprit.user.dto;

import lombok.Data;

@Data
public class VerifyEmailRequest {
    private String code;
}
