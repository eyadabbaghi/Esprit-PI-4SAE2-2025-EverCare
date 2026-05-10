package tn.esprit.user.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import tn.esprit.user.dto.AssessmentRequest;
import tn.esprit.user.dto.AssessmentResult;
import tn.esprit.user.entity.User;
import tn.esprit.user.entity.UserRole;
import tn.esprit.user.service.AssessmentService;
import tn.esprit.user.service.UserService;

@RestController
@RequestMapping("/assessment")
@RequiredArgsConstructor
public class AssessmentController {

    private final AssessmentService assessmentService;
    private final UserService userService;

    /**
     * Run the full ML assessment pipeline for the current patient.
     * POST /assessment/predict
     */
    @PostMapping("/predict")
    public ResponseEntity<?> runAssessment(
            @RequestBody AssessmentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        String email = userDetails.getUsername();
        User user = userService.findByEmail(email);

        if (user.getRole() != UserRole.PATIENT) {
            return ResponseEntity.badRequest().body("Assessment is only available for patients");
        }

        AssessmentResult result = assessmentService.runAssessment(user, request);
        return ResponseEntity.ok(result);
    }

    /**
     * Get the last assessment result for the current patient.
     * GET /assessment/latest
     */
    @GetMapping("/latest")
    public ResponseEntity<?> getLatestAssessment(@AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        User user = userService.findByEmail(email);
        AssessmentResult result = assessmentService.getLatestAssessment(user.getUserId());
        if (result == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(result);
    }

    /**
     * Get assessment for a specific patient (for doctors/caregivers).
     * GET /assessment/patient/{userId}
     */
    @GetMapping("/patient/{userId}")
    public ResponseEntity<?> getPatientAssessment(
            @PathVariable String userId,
            @AuthenticationPrincipal UserDetails userDetails) {
        AssessmentResult result = assessmentService.getLatestAssessment(userId);
        if (result == null) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(result);
    }

    /**
     * Let an associated caregiver complete the Alzheimer assessment for a patient.
     * POST /assessment/patient/{patientId}/predict
     */
    @PostMapping("/patient/{patientId}/predict")
    public ResponseEntity<?> runAssessmentForPatient(
            @PathVariable String patientId,
            @RequestBody AssessmentRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {

        User caregiver = userService.findByEmail(userDetails.getUsername());
        if (caregiver.getRole() != UserRole.CAREGIVER) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Only an associated caregiver can fill this assessment for a patient");
        }

        User patient = userService.findByUserId(patientId);
        if (patient.getRole() != UserRole.PATIENT) {
            return ResponseEntity.badRequest().body("The selected user is not a patient");
        }

        boolean associated = caregiver.getPatients() != null
                && caregiver.getPatients().stream()
                .anyMatch(associatedPatient -> patient.getUserId().equals(associatedPatient.getUserId()));

        if (!associated) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body("Caregiver is not associated with this patient");
        }

        AssessmentResult result = assessmentService.runAssessment(patient, request);
        return ResponseEntity.ok(result);
    }
}
