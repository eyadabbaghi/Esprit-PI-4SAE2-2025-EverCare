package tn.esprit.activities.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.activities.dto.ActivityDTO;
import tn.esprit.activities.dto.CreateActivityRequest;
import tn.esprit.activities.dto.UpdateActivityRequest;
import tn.esprit.activities.service.ActivityService;

import java.util.List;

@RestController
@RequestMapping("/admin/activities")
@RequiredArgsConstructor
public class AdminActivityController {

    private final ActivityService activityService;

    @GetMapping
    public ResponseEntity<List<ActivityDTO>> getAllActivities() {
        return ResponseEntity.ok(activityService.getAllActivities());
    }

    @GetMapping("/{id}")
    public ResponseEntity<ActivityDTO> getActivity(@PathVariable String id) {
        return ResponseEntity.ok(activityService.getActivityById(id));
    }

    @PostMapping
    public ResponseEntity<ActivityDTO> createActivity(@Valid @RequestBody CreateActivityRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(activityService.createActivity(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ActivityDTO> updateActivity(@PathVariable String id, @Valid @RequestBody UpdateActivityRequest request) {
        return ResponseEntity.ok(activityService.updateActivity(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteActivity(@PathVariable String id) {
        activityService.deleteActivity(id);
        return ResponseEntity.noContent().build();
    }
}