package tn.esprit.user.dto;

import lombok.Data;
import tn.esprit.user.entity.LoginType;
import java.time.LocalDateTime;

@Data
public class LoginEventDto {
    private String id;
    private String userId;
    private String email;
    private LoginType loginType;
    private LocalDateTime loginAt;
}