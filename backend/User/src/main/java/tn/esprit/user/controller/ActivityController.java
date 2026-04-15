package tn.esprit.user.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import tn.esprit.user.dto.ActivityStatusDto;
import tn.esprit.user.entity.User;
import tn.esprit.user.repository.UserRepository;
import tn.esprit.user.service.LoginEventService;
import tn.esprit.user.service.UserService;

import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/users/activity")
@RequiredArgsConstructor
public class ActivityController {

    private final LoginEventService loginEventService;
    private final UserService userService;
    private final UserRepository userRepository;

    // Get activity status for a single patient
    @GetMapping("/{userId}/status")
    public ResponseEntity<ActivityStatusDto> getActivityStatus(@PathVariable String userId) {
        return ResponseEntity.ok(loginEventService.getActivityStatus(userId));
    }

    // Get activity status for multiple patients (caregiver use case)
    @PostMapping("/batch-status")
    public ResponseEntity<List<ActivityStatusDto>> getBatchStatus(@RequestBody List<String> userIds) {
        List<ActivityStatusDto> statuses = userIds.stream()
                .map(loginEventService::getActivityStatus)
                .collect(Collectors.toList());
        return ResponseEntity.ok(statuses);
    }

    // In ActivityController.java — add this method

    @PostMapping("/ping")
    public ResponseEntity<?> ping(@AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        User user = userService.findByEmail(email);
        user.setLastSeenAt(LocalDateTime.now());
        userRepository.save(user);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{userId}/last-seen")
    public ResponseEntity<Map<String, Object>> getLastSeen(@PathVariable String userId) {
        User user = userService.findByUserId(userId);
        LocalDateTime lastSeen = user.getLastSeenAt();
        long minutesSince = lastSeen != null
                ? ChronoUnit.MINUTES.between(lastSeen, LocalDateTime.now())
                : Long.MAX_VALUE;
        return ResponseEntity.ok(Map.of(
                "userId", userId,
                "lastSeenAt", lastSeen != null ? lastSeen.toString() : null,
                "minutesSinceLastSeen", minutesSince,
                "isInactive", minutesSince >= 3
        ));
    }
}