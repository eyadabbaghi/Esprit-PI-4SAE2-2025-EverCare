package tn.esprit.user.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;
import tn.esprit.user.dto.ChangePasswordRequest;
import tn.esprit.user.dto.UpdateUserRequest;
import tn.esprit.user.dto.UserDto;
import tn.esprit.user.entity.User;
import tn.esprit.user.entity.UserRole;
import tn.esprit.user.repository.UserRepository;
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
@CrossOrigin(origins = "*")
public class UserController {

    private final UserService userService;
    private final UserRepository userRepository;

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody UpdateUserRequest request,
                                           @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        User updatedUser = userService.updateUser(email, request);
        UserDto userDto = mapToDto(updatedUser);
        return ResponseEntity.ok(Map.of("user", userDto));
    }

    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest request,
                                            @AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        userService.changePassword(email, request);
        return ResponseEntity.ok().build();
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

    private UserDto mapToDto(User user) {
        UserDto dto = new UserDto();
        dto.setUserId(user.getUserId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole());
        dto.setPhone(user.getPhone());
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

    @GetMapping("/search")
    public ResponseEntity<List<UserDto>> searchUsers(@RequestParam String q, @RequestParam UserRole role) {
        List<User> users = userService.searchUsersByRole(q, role);
        List<UserDto> dtos = users.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/by-email")
    public ResponseEntity<UserDto> getUserByEmail(@RequestParam String email) {
        User user = userService.findByEmail(email);
        return ResponseEntity.ok(mapToDto(user));
    }

    // ========== GET CAREGIVERS FOR PATIENT ==========
    @GetMapping("/{id}/patients")
    public ResponseEntity<List<UserDto>> getPatientsByCaregiverId(@PathVariable String id) {
        System.out.println("ID: " + id);
        User caregiver = userService.findById(id);

        if (caregiver.getRole() != UserRole.CAREGIVER) {
            return ResponseEntity.badRequest().build();
        }

        List<UserDto> patients = caregiver.getPatients().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());

        return ResponseEntity.ok(patients);
    }

}