package tn.esprit.user.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import tn.esprit.user.dto.FaceLoginRequest;
import tn.esprit.user.dto.FaceSetupRequest;
import tn.esprit.user.dto.GoogleLoginRequest;
import tn.esprit.user.dto.PasswordResetConfirmRequest;
import tn.esprit.user.dto.PasswordResetSendRequest;
import tn.esprit.user.dto.RegisterRequest;
import tn.esprit.user.dto.UserDto;
import tn.esprit.user.entity.LoginType;
import tn.esprit.user.entity.User;
import tn.esprit.user.entity.UserRole;
import tn.esprit.user.service.EmailVerificationService;
import tn.esprit.user.service.KeycloakTokenService;
import tn.esprit.user.service.LoginEventService;
import tn.esprit.user.service.UserService;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final EmailVerificationService emailVerificationService;
    private final KeycloakTokenService keycloakTokenService;
    private final LoginEventService loginEventService; // ← add this


    @PostMapping("/register")
    public ResponseEntity<Map<String, String>> register(@RequestBody RegisterRequest request) {
        try {
            userService.register(request);
            return ResponseEntity.ok(Map.of("message", "User registered successfully"));
        } catch (RuntimeException e) {
            String message = e.getMessage() != null ? e.getMessage() : "Registration failed";
            HttpStatus status = message.toLowerCase().contains("email already")
                    ? HttpStatus.CONFLICT
                    : HttpStatus.BAD_REQUEST;
            return ResponseEntity.status(status).body(Map.of("message", message));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        try {
            String email = request.getOrDefault("email", "");
            String password = request.getOrDefault("password", "");
            return ResponseEntity.ok(keycloakTokenService.loginFrontendUser(email, password));
        } catch (RuntimeException e) {
            String message = e.getMessage() != null ? e.getMessage() : "Login failed";
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", message));
        }
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(@RequestBody Map<String, String> request) {
        try {
            String refreshToken = request.getOrDefault("refreshToken", "");
            return ResponseEntity.ok(keycloakTokenService.refreshFrontendUserToken(refreshToken));
        } catch (RuntimeException e) {
            String message = e.getMessage() != null ? e.getMessage() : "Session refresh failed";
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", message));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        UserDto userDto = userService.getUserDtoByEmail(email);
        return ResponseEntity.ok(userDto);
    }

    // ✅ ONLY ONE face-login method — takes keycloakId + image
    @PostMapping("/face-login")
    public ResponseEntity<?> faceLogin(@RequestBody FaceLoginRequest request) {
        try {
            Map<String, Object> result = userService.faceLogin(
                    request.getKeycloakId(), request.getImage());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            e.printStackTrace(); // ← see exact error in Spring console
            if (e.getMessage() != null && e.getMessage().contains("Face not recognized")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", e.getMessage()));
            }
            // Token exchange or other server error — return 500 not 401
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Login failed: " + e.getMessage()));
        }
    }

    @PostMapping("/google")
    public ResponseEntity<?> googleLogin(@RequestBody GoogleLoginRequest request) {
        try {
            String credential = request.getCredential() != null
                    ? request.getCredential()
                    : request.getIdToken();
            Map<String, Object> result = userService.googleLogin(credential, request.getRole());
            return ResponseEntity.ok(result);
        } catch (RuntimeException e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/password-reset/send")
    public ResponseEntity<Map<String, String>> sendPasswordResetCode(@RequestBody PasswordResetSendRequest request) {
        try {
            String destination = emailVerificationService.sendPasswordResetCode(request.getEmail(), request.getVerificationMethod());
            return ResponseEntity.ok(Map.of(
                    "message", "Password reset code sent",
                    "destination", destination
            ));
        } catch (RuntimeException e) {
            String message = e.getMessage() != null ? e.getMessage() : "Could not send password reset code";
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", message));
        }
    }

    @PostMapping("/password-reset/confirm")
    public ResponseEntity<Map<String, String>> resetPassword(@RequestBody PasswordResetConfirmRequest request) {
        try {
            emailVerificationService.resetPassword(request.getEmail(), request.getCode(), request.getNewPassword());
            return ResponseEntity.ok(Map.of("message", "Password updated successfully"));
        } catch (RuntimeException e) {
            String message = e.getMessage() != null ? e.getMessage() : "Password reset failed";
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", message));
        }
    }

    @PostMapping("/setup-face-id")
    public ResponseEntity<?> setupFaceId(
            @RequestBody FaceSetupRequest request,
            @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        userService.setupFaceId(email, request.getImages());
        return ResponseEntity.ok(Map.of("message", "Face ID setup successful"));
    }

    @GetMapping("/has-face-id")
    public ResponseEntity<?> hasFaceId(@AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        boolean has = userService.hasFaceId(email);
        return ResponseEntity.ok(Map.of("hasFaceId", has));
    }

    @PostMapping("/record-login")
    public ResponseEntity<?> recordLogin(@AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        User user = userService.findByEmail(email);
        loginEventService.recordLogin(user.getUserId(), user.getEmail(), LoginType.PASSWORD);
        userService.updateLastSeen(email);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/ping")
    public ResponseEntity<?> ping(@AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        User user = userService.findByEmail(email);
        user.setLastSeenAt(java.time.LocalDateTime.now());
        // You need to expose save through userService or userRepository
        // Add this method to UserService:
        userService.updateLastSeen(email);
        return ResponseEntity.ok().build();
    }

    private UserDto mapToDto(User user) {
        UserDto dto = new UserDto();
        dto.setUserId(user.getUserId());
        dto.setKeycloakId(user.getKeycloakId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole());
        dto.setPhone(user.getPhone());
        dto.setRecoveryEmail(user.getRecoveryEmail());
        dto.setAddress(user.getAddress());
        dto.setCountry(user.getCountry());
        dto.setVerified(user.isVerified());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setDateOfBirth(user.getDateOfBirth());
        dto.setEmergencyContact(user.getEmergencyContact());
        dto.setProfilePicture(user.getProfilePicture());
        dto.setYearsExperience(user.getYearsExperience());
        dto.setSpecialization(user.getSpecialization());
        dto.setMedicalLicense(user.getMedicalLicense());
        dto.setWorkplaceType(user.getWorkplaceType());
        dto.setWorkplaceName(user.getWorkplaceName());
        dto.setDoctorEmail(user.getDoctorEmail());
        if (user.getRole() == UserRole.PATIENT) {
            dto.setCaregiverEmails(user.getCaregivers().stream()
                    .map(User::getEmail).collect(java.util.stream.Collectors.toSet()));
        } else if (user.getRole() == UserRole.CAREGIVER) {
            dto.setPatientEmails(user.getPatients().stream()
                    .map(User::getEmail).collect(java.util.stream.Collectors.toSet()));
        } else if (user.getRole() == UserRole.DOCTOR) {
            dto.setPatientEmails(userService.getPatientsByDoctorEmail(user.getEmail()).stream()
                    .map(User::getEmail).collect(java.util.stream.Collectors.toSet()));
        }
        return dto;
    }
}
