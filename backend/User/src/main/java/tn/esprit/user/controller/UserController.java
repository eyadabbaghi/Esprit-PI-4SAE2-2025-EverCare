package tn.esprit.user.controller;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import tn.esprit.user.dto.ChangePasswordRequest;
import tn.esprit.user.dto.EmailChangeConfirmRequest;
import tn.esprit.user.dto.EmailChangeSendRequest;
import tn.esprit.user.dto.UpdateUserRequest;
import tn.esprit.user.dto.UserDto;
import tn.esprit.user.dto.VerifyEmailRequest;
import tn.esprit.user.entity.User;
import tn.esprit.user.entity.UserRole;
import tn.esprit.user.repository.UserRepository;
import tn.esprit.user.service.EmailVerificationService;
import tn.esprit.user.service.UserService;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private static final Logger log = LoggerFactory.getLogger(UserController.class);

    private final UserService userService;
    private final UserRepository userRepository;
    private final EmailVerificationService emailVerificationService;

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody UpdateUserRequest request,
                                           @AuthenticationPrincipal UserDetails userDetails) {
        try {
            String email = userDetails.getUsername();
            User updatedUser = userService.updateUser(email, request);
            UserDto userDto = userService.getUserDtoByEmail(updatedUser.getEmail());
            return ResponseEntity.ok(Map.of("user", userDto));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest request,
                                            @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        userService.changePassword(email, request);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/patients/{patientId}/doctor")
    public ResponseEntity<?> assignDoctorToCaregiverPatient(@PathVariable String patientId,
                                                            @RequestBody Map<String, String> request,
                                                            @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        User patient = userService.assignDoctorToCaregiverPatient(email, patientId, request.get("doctorEmail"));
        return ResponseEntity.ok(Map.of("user", mapToDto(patient)));
    }

    @DeleteMapping("/profile")
    public ResponseEntity<?> deleteAccount(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            String email = userDetails.getUsername();
            userService.deleteUser(email);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Failed to delete account: " + e.getMessage()));
        }
    }

    @PostMapping("/email-verification/send")
    public ResponseEntity<?> sendEmailVerification(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Please sign in again before verifying your email"));
            }
            emailVerificationService.sendVerificationCode(userDetails.getUsername());
            return ResponseEntity.ok(Map.of("message", "Verification code sent"));
        } catch (RuntimeException e) {
            log.warn("Email verification send failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/email-verification/verify")
    public ResponseEntity<?> verifyEmail(@RequestBody VerifyEmailRequest request,
                                         @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Please sign in again before verifying your email"));
            }
            User user = emailVerificationService.verifyEmail(userDetails.getUsername(), request.getCode());
            return ResponseEntity.ok(Map.of(
                    "message", "Email verified successfully",
                    "user", mapToDto(user)
            ));
        } catch (RuntimeException e) {
            log.warn("Email verification failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/email-change/send-phone-code")
    public ResponseEntity<?> sendEmailChangePhoneCode(@RequestBody EmailChangeSendRequest request,
                                                      @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Please sign in again before changing your email"));
            }
            String destination = emailVerificationService.sendEmailChangeCode(
                    userDetails.getUsername(),
                    request.getNewEmail(),
                    request.getVerificationMethod(),
                    request.getPhoneNumber()
            );
            return ResponseEntity.ok(Map.of(
                    "message", "Verification code sent",
                    "destination", destination,
                    "method", request.getVerificationMethod() == null ? "email" : request.getVerificationMethod()
            ));
        } catch (RuntimeException e) {
            log.warn("Email change phone code send failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/email-change/confirm")
    public ResponseEntity<?> confirmEmailChange(@RequestBody EmailChangeConfirmRequest request,
                                                @AuthenticationPrincipal UserDetails userDetails) {
        try {
            if (userDetails == null) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", "Please sign in again before changing your email"));
            }
            User user = emailVerificationService.confirmEmailChange(
                    userDetails.getUsername(),
                    request.getNewEmail(),
                    request.getCode(),
                    request.getVerificationMethod()
            );
            return ResponseEntity.ok(Map.of(
                    "message", "Email changed successfully",
                    "user", mapToDto(user)
            ));
        } catch (RuntimeException e) {
            log.warn("Email change confirmation failed: {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
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

        // Doctor fields
        dto.setYearsExperience(user.getYearsExperience());
        dto.setSpecialization(user.getSpecialization());
        dto.setMedicalLicense(user.getMedicalLicense());
        dto.setWorkplaceType(user.getWorkplaceType());
        dto.setWorkplaceName(user.getWorkplaceName());
        dto.setDoctorEmail(user.getDoctorEmail());

        // Relationships
        if (user.getRole() == UserRole.PATIENT) {
            dto.setCaregiverEmails(user.getCaregivers().stream()
                    .map(User::getEmail).collect(Collectors.toSet()));
        } else if (user.getRole() == UserRole.CAREGIVER) {
            dto.setPatientEmails(user.getPatients().stream()
                    .map(User::getEmail).collect(Collectors.toSet()));
        } else if (user.getRole() == UserRole.DOCTOR) {
            List<User> patients = userService.getPatientsByDoctorEmail(user.getEmail());
            dto.setPatientEmails(patients.stream()
                    .map(User::getEmail).collect(Collectors.toSet()));
        }
        return dto;
    }

    @PostMapping("/profile/picture")
    public ResponseEntity<?> uploadProfilePicture(@RequestParam("file") MultipartFile file,
                                                  @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        User user = userService.findByEmail(email);

        if (file.isEmpty()) {
            return ResponseEntity.badRequest().body("File is empty");
        }

        try {
            String uploadDir = "uploads/profile-pictures/";
            File dir = new File(uploadDir);
            if (!dir.exists()) dir.mkdirs();

            String fileName = user.getUserId() + "_" + System.currentTimeMillis() + "_" + file.getOriginalFilename();
            Path filePath = Paths.get(uploadDir + fileName);
            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String fileUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/uploads/profile-pictures/")
                    .path(fileName)
                    .toUriString();
            user.setProfilePicture(fileUrl);
            userRepository.save(user);

            return ResponseEntity.ok(Map.of("profilePicture", fileUrl));
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to upload file");
        }
    }

    @DeleteMapping("/profile/picture")
    public ResponseEntity<?> removeProfilePicture(@AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        User user = userService.findByEmail(email);
        user.setProfilePicture(null);
        userRepository.save(user);
        return ResponseEntity.ok().build();
    }



    @GetMapping("/{userId}")
    public ResponseEntity<UserDto> getUserById(@PathVariable String userId) {
        UserDto userDto = userService.getUserDtoById(userId);
        return ResponseEntity.ok(userDto);
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserDto>> searchUsers(@RequestParam String q, @RequestParam UserRole role) {
        return ResponseEntity.ok(userService.searchUserDtosByRole(q, role));
    }

    @GetMapping("/by-email")
    public ResponseEntity<UserDto> getUserByEmail(@RequestParam String email) {
        try {
            return ResponseEntity.ok(userService.getUserDtoByEmail(email));
        } catch (RuntimeException ex) {
            if (!"User not found".equals(ex.getMessage())) {
                throw ex;
            }
            return ResponseEntity.notFound().build();
        }
    }

    // ========== CAREGIVER & PATIENT RELATIONSHIP ENDPOINTS ---- Badr ==========
    // ADDED: April 2, 2026 - New endpoints to fetch caregiver-patient relationships
    // These endpoints leverage the existing many-to-many relationship between Users
    // Usage: Call these endpoints to retrieve caregivers for patients or patients for caregivers

    /**
     * ADDED: Fetch all caregivers assigned to a specific patient by patient ID
     *
     * @param userId The unique identifier of the patient
     * @return ResponseEntity containing list of caregiver DTOs with status 200 OK
     *         or error message with status 404 NOT_FOUND if user doesn't exist or is not a patient
     *
     * Example:
     * GET /users/550e8400-e29b-41d4-a716-446655440000/caregivers
     *
     * Response: {"caregivers": [{UserDto}, {UserDto}, ...]}
     */
    @GetMapping("/{userId}/caregivers")
    public ResponseEntity<?> getCaregiversByUserId(@PathVariable String userId) {
        try {
            List<UserDto> caregivers = userService.getCaregiversByPatientId(userId);
            return ResponseEntity.ok(Map.of("caregivers", caregivers));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * ADDED: Fetch all caregivers for the authenticated patient (uses JWT token)
     *
     * Security: Requires valid JWT authentication token
     *
     * @param userDetails The authenticated user details extracted from JWT token
     * @return ResponseEntity containing list of caregiver DTOs with status 200 OK
     *         or error message with status 404 NOT_FOUND if user is not a patient

     */
    @GetMapping("/caregivers")
    public ResponseEntity<?> getMyCaregiversFromAuth(@AuthenticationPrincipal UserDetails userDetails) {
        try {
            String email = userDetails.getUsername();
            List<UserDto> caregivers = userService.getCaregiversByPatientEmail(email);
            return ResponseEntity.ok(Map.of("caregivers", caregivers));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    /**
     * ADDED: Fetch all patients assigned to a specific caregiver by caregiver ID
     *
     * @param userId The unique identifier of the caregiver
     * @return ResponseEntity containing list of patient DTOs with status 200 OK
     *         or error message with status 404 NOT_FOUND if user doesn't exist or is not a caregiver
     *

     */
    @GetMapping("/{userId}/patients")
    public ResponseEntity<?> getPatientsByCaregiverId(@PathVariable String userId) {
        try {
            List<UserDto> patients = userService.getPatientsByCaregiveId(userId);
            return ResponseEntity.ok(Map.of("patients", patients));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("message", e.getMessage()));
        }
    }

    }
