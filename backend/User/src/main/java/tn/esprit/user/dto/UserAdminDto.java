package tn.esprit.user.dto;

import lombok.Data;
import tn.esprit.user.entity.UserRole;
import java.time.LocalDateTime;

@Data
public class UserAdminDto {
    private String userId;
    private String name;
    private String email;
    private UserRole role;
    private String phone;
    private boolean isVerified;
    private LocalDateTime createdAt;
    private LocalDateTime lastSeenAt;
    private String profilePicture;
}
