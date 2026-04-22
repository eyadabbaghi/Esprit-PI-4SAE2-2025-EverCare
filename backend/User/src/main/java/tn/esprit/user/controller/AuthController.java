package tn.esprit.user.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.user.dto.*;
import tn.esprit.user.entity.User;
import tn.esprit.user.service.UserService;

import java.security.Principal;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor

public class AuthController {

    private final UserService userService;

    @PostMapping("/register")
    public AuthResponse register(@RequestBody RegisterRequest request) {
        return userService.register(request);
    }

    @PostMapping("/login")
    public AuthResponse login(@RequestBody LoginRequest request) {
        return userService.login(request);
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
    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(Principal principal) {
        System.out.println("=== /me controller ===");
        System.out.println("Principal: " + principal);
        System.out.println("Principal name: " + (principal != null ? principal.getName() : "null"));

        String email = principal.getName();
        System.out.println("Email from principal: " + email);

        User user = userService.findByEmail(email);
        System.out.println("User found: " + user.getEmail());

        UserDto dto = mapToDto(user);
        System.out.println("DTO created: " + dto);

        ResponseEntity<UserDto> response = ResponseEntity.ok(dto);
        System.out.println("Returning response: " + response);
        return response;
    }
}