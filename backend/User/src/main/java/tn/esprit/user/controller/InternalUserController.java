package tn.esprit.user.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import tn.esprit.user.dto.UserDto;
import tn.esprit.user.entity.User;
import tn.esprit.user.entity.UserRole;
import tn.esprit.user.repository.UserRepository;
import tn.esprit.user.service.UserService;

import static org.springframework.http.HttpStatus.NOT_FOUND;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/internal/users")
@RequiredArgsConstructor
public class InternalUserController {

    private final UserRepository userRepository;
    private final UserService userService;

    @GetMapping("/{userId}")
    public ResponseEntity<UserDto> getUserById(@PathVariable String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "User not found"));

        return ResponseEntity.ok(mapToDto(user));
    }

    @GetMapping("/patients/{userId}")
    public ResponseEntity<UserDto> getPatientById(@PathVariable String userId) {

        User user = userRepository.findById(userId)
                .filter(found -> found.getRole() == UserRole.PATIENT)
                .orElseThrow(() -> new ResponseStatusException(NOT_FOUND, "Patient not found"));

        return ResponseEntity.ok(mapToDto(user));
    }

    @GetMapping("/by-email")
    public ResponseEntity<UserDto> getUserByEmail(@org.springframework.web.bind.annotation.RequestParam String email) {
        return ResponseEntity.ok(userService.getUserDtoByEmail(email));
    }

    @GetMapping("/search")
    public ResponseEntity<List<UserDto>> searchUsers(
            @org.springframework.web.bind.annotation.RequestParam String q,
            @org.springframework.web.bind.annotation.RequestParam UserRole role) {
        return ResponseEntity.ok(userService.searchUserDtosByRole(q, role));
    }

    @GetMapping("/{userId}/caregivers")
    public ResponseEntity<List<UserDto>> getCaregiversByPatientId(@PathVariable String userId) {
        return ResponseEntity.ok(userService.getCaregiversByPatientId(userId));
    }

    @GetMapping("/{userId}/patients")
    public ResponseEntity<Map<String, List<UserDto>>> getPatientsByCaregiverId(@PathVariable String userId) {
        return ResponseEntity.ok(Map.of("patients", userService.getPatientsByCaregiveId(userId)));
    }

    private UserDto mapToDto(User user) {
        UserDto dto = new UserDto();
        dto.setUserId(user.getUserId());
        dto.setName(user.getName());
        dto.setRole(user.getRole());
        dto.setEmail(user.getEmail());
        dto.setPhone(user.getPhone());
        dto.setRecoveryEmail(user.getRecoveryEmail());
        dto.setAddress(user.getAddress());
        dto.setCountry(user.getCountry());
        dto.setVerified(user.isVerified());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setDateOfBirth(user.getDateOfBirth());
        dto.setEmergencyContact(user.getEmergencyContact());
        dto.setProfilePicture(user.getProfilePicture());
        return dto;
    }
}
