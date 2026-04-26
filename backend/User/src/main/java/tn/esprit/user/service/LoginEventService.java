package tn.esprit.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tn.esprit.user.dto.ActivityStatusDto;
import tn.esprit.user.dto.LoginEventDto;
import tn.esprit.user.entity.LoginEvent;
import tn.esprit.user.entity.LoginType;
import tn.esprit.user.repository.LoginEventRepository;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class LoginEventService {

    private final LoginEventRepository loginEventRepository;

    public void recordLogin(String userId, String email, LoginType loginType) {
        LoginEvent event = LoginEvent.builder()
                .userId(userId)
                .email(email)
                .loginType(loginType)
                .loginAt(LocalDateTime.now())
                .build();
        loginEventRepository.save(event);
    }

    public ActivityStatusDto getActivityStatus(String userId) {
        List<LoginEvent> events = loginEventRepository
                .findByUserIdOrderByLoginAtDesc(userId);

        if (events.isEmpty()) {
            return ActivityStatusDto.builder()
                    .userId(userId)
                    .status("INACTIVE")
                    .statusLabel("Never logged in")
                    .loggedInToday(false)
                    .minutesSinceLastLogin(Long.MAX_VALUE)
                    .onlineNow(false)
                    .recentLogins(List.of())
                    .build();
        }

        LoginEvent latest = events.get(0);
        long minutesSince = ChronoUnit.MINUTES.between(latest.getLoginAt(), LocalDateTime.now());
        boolean loggedInToday = latest.getLoginAt().toLocalDate()
                .equals(LocalDateTime.now().toLocalDate());
        boolean onlineNow = minutesSince < 3;

        // Determine status
        String status;
        String statusLabel;
        int loginHour = latest.getLoginAt().getHour();
        boolean unusualHour = loginHour < 5 || loginHour > 23;

        if (minutesSince < 60) {
            status = "ACTIVE";
            statusLabel = "Active — logged in recently";
        } else if (minutesSince < 1440) {
            status = "ACTIVE";
            statusLabel = "Active today";
        } else if (minutesSince < 4320) {
            status = "INACTIVE";
            statusLabel = "Inactive — last seen " + (minutesSince / 1440) + " day(s) ago";
        } else {
            status = "AT_RISK";
            statusLabel = "At risk — no activity for " + (minutesSince / 1440) + " days";
        }

        if (unusualHour && status.equals("ACTIVE")) {
            status = "UNUSUAL";
            statusLabel = "Unusual login time detected (" + loginHour + ":00)";
        }

        // Check if recovered: logged in after a long gap
        if (events.size() > 1) {
            LoginEvent previous = events.get(1);
            long gapMinutes = ChronoUnit.MINUTES.between(
                    previous.getLoginAt(), latest.getLoginAt());
            if (gapMinutes > 4320 && minutesSince < 60) {
                status = "RECOVERED";
                statusLabel = "Recovered — returned after " + (gapMinutes / 1440) + " days";
            }
        }

        List<LoginEventDto> recentDtos = events.stream()
                .limit(10)
                .map(this::toDto)
                .collect(Collectors.toList());

        return ActivityStatusDto.builder()
                .userId(userId)
                .email(latest.getEmail())
                .status(status)
                .statusLabel(statusLabel)
                .lastLogin(latest.getLoginAt())
                .lastLoginEvent(toDto(latest))
                .recentLogins(recentDtos)
                .minutesSinceLastLogin(minutesSince)
                .loggedInToday(loggedInToday)
                .onlineNow(onlineNow)
                .build();
    }

    private LoginEventDto toDto(LoginEvent event) {
        LoginEventDto dto = new LoginEventDto();
        dto.setId(event.getId());
        dto.setUserId(event.getUserId());
        dto.setEmail(event.getEmail());
        dto.setLoginType(event.getLoginType());
        dto.setLoginAt(event.getLoginAt());
        return dto;
    }
}