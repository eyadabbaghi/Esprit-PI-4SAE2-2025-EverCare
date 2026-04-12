package tn.esprit.user.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.user.dto.ActivityStatusDto;
import tn.esprit.user.service.LoginEventService;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/users/activity")
@RequiredArgsConstructor
public class ActivityController {

    private final LoginEventService loginEventService;

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
}