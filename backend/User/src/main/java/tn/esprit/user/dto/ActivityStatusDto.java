package tn.esprit.user.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ActivityStatusDto {
    private String userId;
    private String email;
    private String status;        // ACTIVE, INACTIVE, AT_RISK, RECOVERED, UNUSUAL
    private String statusLabel;   // Human readable
    private LocalDateTime lastLogin;
    private LoginEventDto lastLoginEvent;
    private List<LoginEventDto> recentLogins; // last 7
    private long minutesSinceLastLogin;
    private boolean loggedInToday;
    private boolean onlineNow;
}