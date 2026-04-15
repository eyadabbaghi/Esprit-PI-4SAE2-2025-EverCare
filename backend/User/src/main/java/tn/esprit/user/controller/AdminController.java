package tn.esprit.user.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import tn.esprit.user.dto.UpdateUserByAdminRequest;
import tn.esprit.user.dto.UserAdminDto;
import tn.esprit.user.entity.User;
import tn.esprit.user.service.UserService;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
public class AdminController {

    private final UserService userService;

    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<UserAdminDto>> getAllUsers() {
        List<User> users = userService.getAllUsers();
        List<UserAdminDto> dtos = users.stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PutMapping("/users/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<UserAdminDto> updateUser(@PathVariable String userId, @RequestBody UpdateUserByAdminRequest request) {
        User user = userService.updateUserByAdmin(userId, request);
        return ResponseEntity.ok(mapToDto(user));
    }

    @DeleteMapping("/users/{userId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable String userId) {
        userService.deleteUserById(userId);
        return ResponseEntity.ok().build();
    }

    private UserAdminDto mapToDto(User user) {
        UserAdminDto dto = new UserAdminDto();
        dto.setUserId(user.getUserId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole());
        dto.setPhone(user.getPhone());
        dto.setVerified(user.isVerified());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setProfilePicture(user.getProfilePicture());
        return dto;
    }
}