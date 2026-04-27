package com.yourteam.communicationservice.Controller;

import com.yourteam.communicationservice.client.UserServiceClient;
import com.yourteam.communicationservice.DTO.UserDto;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserProxyController {

    private final UserServiceClient userServiceClient;

    @GetMapping("/all")
    public ResponseEntity<List<UserDto>> getAllUsers() {
        String[] roles = {"PATIENT", "DOCTOR", "CAREGIVER", "ADMIN"};
        Map<String, UserDto> userMap = new LinkedHashMap<>();
        for (String role : roles) {
            try {
                List<UserDto> users = userServiceClient.searchUsersByRole("", role);
                for (UserDto user : users) {
                    userMap.putIfAbsent(user.getEmail().toLowerCase(), user);
                }
            } catch (Exception e) {
                // ignorer les rôles qui pourraient ne pas exister
            }
        }
        return ResponseEntity.ok(new ArrayList<>(userMap.values()));
    }

    @GetMapping("/by-email")
    public ResponseEntity<UserDto> getUserByEmail(@RequestParam String email) {
        return ResponseEntity.ok(userServiceClient.getUserByEmail(email));
    }
}