package tn.esprit.user.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.user.dto.ChangePasswordRequest;
import tn.esprit.user.dto.UpdateUserRequest;
import tn.esprit.user.dto.UserDto;
import tn.esprit.user.entity.User;
import tn.esprit.user.repository.UserRepository;
import tn.esprit.user.service.UserService;
import tn.esprit.user.security.JwtUtil;
import java.security.Principal;
import java.util.HashMap;
import java.util.Map;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;


@RestController
@RequestMapping("/users")
@RequiredArgsConstructor

public class UserController {

    private final UserService userService;
    private final JwtUtil jwtUtil;
    private final UserRepository userRepository;

    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(@RequestBody UpdateUserRequest request, Principal principal) {
        String email = principal.getName();
        User updatedUser = userService.updateUser(email, request);
        UserDto userDto = mapToDto(updatedUser);

        // Generate a new token (always, or only if email changed)
        String newToken = jwtUtil.generateToken(updatedUser.getEmail());

        // Return both updated user and new token
        Map<String, Object> response = new HashMap<>();
        response.put("user", userDto);
        response.put("token", newToken);
        return ResponseEntity.ok(response);


    }
    @GetMapping("/patients")
    public ResponseEntity<?> getAllPatients() {
        return ResponseEntity.ok(userRepository.findByRole(tn.esprit.user.entity.UserRole.PATIENT));
    }
    @PutMapping("/change-password")
    public ResponseEntity<?> changePassword(@RequestBody ChangePasswordRequest request, Principal principal) {
        String email = principal.getName();
        userService.changePassword(email, request);
        return ResponseEntity.ok().build();
    }


    @DeleteMapping("/profile")
    public ResponseEntity<?> deleteAccount(Principal principal) {
        try {
            String email = principal.getName();
            userService.deleteUser(email);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            e.printStackTrace(); // for debugging
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
        return dto;
    }

    @PostMapping("/profile/picture")
    public ResponseEntity<?> uploadProfilePicture(@RequestParam("file") MultipartFile file, Principal principal) {
        String email = principal.getName();
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

            Map<String, String> response = new HashMap<>();
            response.put("profilePicture", fileUrl);
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Failed to upload file");
        }
    }

    @DeleteMapping("/profile/picture")
    public ResponseEntity<?> removeProfilePicture(Principal principal) {
        String email = principal.getName();
        User user = userService.findByEmail(email);
        user.setProfilePicture(null);
        userRepository.save(user);
        return ResponseEntity.ok().build();
    }
}