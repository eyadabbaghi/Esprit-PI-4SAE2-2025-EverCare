package tn.esprit.user.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tn.esprit.user.dto.RegisterRequest;
import tn.esprit.user.entity.LoginType;
import tn.esprit.user.entity.User;
import tn.esprit.user.entity.UserRole;
import tn.esprit.user.repository.UserRepository;

import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.HashSet;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private KeycloakAdminClient keycloakAdminClient;

    @Mock
    private KeycloakTokenService keycloakTokenService;

    @Mock
    private FaceService faceService;

    @Mock
    private FaceLoginTokenService faceLoginTokenService;

    @Mock
    private LoginEventService loginEventService;

    @InjectMocks
    private UserService userService;

    @Test
    void registerCreatesLocalUserWhenEmailIsAvailable() {
        RegisterRequest request = new RegisterRequest();
        request.setName("Jane Doe");
        request.setEmail("jane@example.com");
        request.setPassword("StrongPass1!");
        request.setRole(UserRole.PATIENT);

        when(userRepository.existsByEmail("jane@example.com")).thenReturn(false);
        when(keycloakAdminClient.findUserIdByEmail("jane@example.com")).thenReturn(Optional.empty());
        when(keycloakAdminClient.createUser(request)).thenReturn("kc-1");
        when(keycloakTokenService.getTokenForCredentials("jane@example.com", "StrongPass1!")).thenReturn("token");
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> {
            User savedUser = invocation.getArgument(0);
            savedUser.setCaregivers(new HashSet<>());
            savedUser.setPatients(new HashSet<>());
            return savedUser;
        });

        userService.register(request);

        verify(keycloakAdminClient).findUserIdByEmail("jane@example.com");
        verify(keycloakAdminClient).createUser(request);
        verify(userRepository).save(any(User.class));
    }

    @Test
    void registerRejectsDuplicateEmail() {
        RegisterRequest request = new RegisterRequest();
        request.setEmail("jane@example.com");

        when(userRepository.existsByEmail("jane@example.com")).thenReturn(true);

        RuntimeException exception = assertThrows(RuntimeException.class, () -> userService.register(request));
        assertEquals("Email already exists", exception.getMessage());
        verify(userRepository, never()).save(any(User.class));
    }

    @Test
    void faceLoginReturnsTokenAndEmbeddedUserPayload() {
        User user = User.builder()
                .userId("user-1")
                .keycloakId("kc-1")
                .name("Jane Doe")
                .email("jane@example.com")
                .role(UserRole.PATIENT)
                .caregivers(Set.of())
                .patients(Set.of())
                .build();

        when(faceService.verifyFace("kc-1", "image-data")).thenReturn(Map.of("matched", true, "score", 0.99));
        when(userRepository.findByKeycloakId("kc-1")).thenReturn(Optional.of(user));
        when(faceLoginTokenService.generateToken(user)).thenReturn("user-token");

        Map<String, Object> response = userService.faceLogin("kc-1", "image-data");

        assertEquals("user-token", response.get("token"));
        assertEquals("jane@example.com", response.get("email"));
        assertEquals("user-1", response.get("userId"));
        assertNotNull(response.get("user"));
        verify(loginEventService).recordLogin("user-1", "jane@example.com", LoginType.FACE);
    }

    @Test
    void deleteUserRemovesPatientRelationshipsBeforeDelete() {
        User caregiver = User.builder()
                .userId("caregiver-1")
                .email("caregiver@example.com")
                .role(UserRole.CAREGIVER)
                .caregivers(new java.util.HashSet<>())
                .patients(new java.util.HashSet<>())
                .build();
        User patient = User.builder()
                .userId("user-1")
                .keycloakId("kc-1")
                .email("patient@example.com")
                .role(UserRole.PATIENT)
                .caregivers(new java.util.HashSet<>())
                .patients(new java.util.HashSet<>())
                .build();
        patient.getCaregivers().add(caregiver);
        caregiver.getPatients().add(patient);

        when(userRepository.findByEmail("patient@example.com")).thenReturn(Optional.of(patient));

        userService.deleteUser("patient@example.com");

        assertFalse(caregiver.getPatients().contains(patient));
        assertTrue(patient.getCaregivers().isEmpty());
        verify(keycloakAdminClient).deleteUser("kc-1");
        verify(userRepository).delete(patient);
    }
}
