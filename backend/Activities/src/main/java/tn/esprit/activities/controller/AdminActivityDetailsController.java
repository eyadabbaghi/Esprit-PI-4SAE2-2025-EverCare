package tn.esprit.activities.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.activities.dto.ActivityDetailsDTO;
import tn.esprit.activities.dto.CreateActivityDetailsRequest;
import tn.esprit.activities.dto.UpdateActivityDetailsRequest;
import tn.esprit.activities.service.ActivityService;

import java.util.List;

@RestController
@RequestMapping("/admin/activity-details")
@RequiredArgsConstructor
public class AdminActivityDetailsController {

    private final ActivityService activityService;

    @GetMapping("/activity/{activityId}")
    public ResponseEntity<List<ActivityDetailsDTO>> getDetailsByActivity(@PathVariable String activityId) {
        return ResponseEntity.ok(activityService.getDetailsByActivityId(activityId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ActivityDetailsDTO> getDetails(@PathVariable String id) {
        return ResponseEntity.ok(activityService.getDetailsById(id));
    }

    @PostMapping
    public ResponseEntity<ActivityDetailsDTO> createDetails(@Valid @RequestBody CreateActivityDetailsRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(activityService.createDetails(request));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ActivityDetailsDTO> updateDetails(@PathVariable String id, @Valid @RequestBody UpdateActivityDetailsRequest request) {
        return ResponseEntity.ok(activityService.updateDetails(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDetails(@PathVariable String id) {
        activityService.deleteDetails(id);
        return ResponseEntity.noContent().build();
    }
}