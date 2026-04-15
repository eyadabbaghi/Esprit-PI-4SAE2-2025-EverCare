package tn.esprit.user.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import tn.esprit.user.dto.AuthResponse;
import tn.esprit.user.dto.FaceLoginRequest;
import tn.esprit.user.dto.FaceSetupRequest;
import tn.esprit.user.dto.LoginRequest;
import tn.esprit.user.dto.RegisterRequest;
import tn.esprit.user.dto.UserDto;
import tn.esprit.user.entity.LoginType;
import tn.esprit.user.entity.User;
import tn.esprit.user.service.LoginEventService;
import tn.esprit.user.service.UserService;

import java.util.Map;

@RestController
@RequestMapping("/auth")
@RequiredArgsConstructor
public class AuthController {

    private final UserService userService;
    private final LoginEventService loginEventService;

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody RegisterRequest request) {
        try {
            AuthResponse authResponse = userService.register(request);
            return ResponseEntity.status(HttpStatus.CREATED).body(authResponse);
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.CONFLICT)
                    .body(Map.of("message", exception.getMessage()));
        } catch (IllegalStateException exception) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", exception.getMessage()));
        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", exception.getMessage()));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        try {
            AuthResponse authResponse = userService.authenticate(request);
            return ResponseEntity.ok(authResponse);
        } catch (IllegalArgumentException exception) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", exception.getMessage()));
        } catch (RuntimeException exception) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", exception.getMessage()));
        }
    }

    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(@AuthenticationPrincipal UserDetails userDetails) {
        String email = userDetails.getUsername();
        return ResponseEntity.ok(userService.getUserDtoByEmail(email));
    }

    @PostMapping("/face-login")
    public ResponseEntity<?> faceLogin(@RequestBody FaceLoginRequest request) {
        try {
            return ResponseEntity.ok(userService.faceLogin(request.getKeycloakId(), request.getImage()));
        } catch (RuntimeException exception) {
            if (exception.getMessage() != null && exception.getMessage().contains("Face not recognized")) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("message", exception.getMessage()));
            }

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("message", "Login failed: " + exception.getMessage()));
        }
    }

    @PostMapping("/setup-face-id")
    public ResponseEntity<?> setupFaceId(
            @RequestBody FaceSetupRequest request,
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        userService.setupFaceId(userDetails.getUsername(), request.getImages());
        return ResponseEntity.ok(Map.of("message", "Face ID setup successful"));
    }

    @GetMapping("/has-face-id")
    public ResponseEntity<?> hasFaceId(@AuthenticationPrincipal UserDetails userDetails) {
        boolean has = userService.hasFaceId(userDetails.getUsername());
        return ResponseEntity.ok(Map.of("hasFaceId", has));
    }

    @PostMapping("/record-login")
    public ResponseEntity<?> recordLogin(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.findByEmail(userDetails.getUsername());
        loginEventService.recordLogin(user.getUserId(), user.getEmail(), LoginType.PASSWORD);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/ping")
    public ResponseEntity<?> ping(@AuthenticationPrincipal UserDetails userDetails) {
        userService.updateLastSeen(userDetails.getUsername());
        return ResponseEntity.ok().build();
    }
}
