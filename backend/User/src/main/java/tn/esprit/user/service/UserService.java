package tn.esprit.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.user.dto.*;
import tn.esprit.user.entity.LoginType;
import tn.esprit.user.entity.User;
import tn.esprit.user.entity.UserRole;
import tn.esprit.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final KeycloakAdminClient keycloakAdminClient;
    private final KeycloakTokenService keycloakTokenService;
    private final FaceService faceService;
    private final FaceLoginTokenService faceLoginTokenService;
    private final LoginEventService loginEventService;

    @Transactional
    public AuthResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new IllegalArgumentException("Email already exists");
        }

        boolean createdInKeycloak = false;
        String keycloakId = null;

        try {
            Optional<String> existingKeycloakId = keycloakAdminClient.findUserIdByEmail(request.getEmail());
            createdInKeycloak = existingKeycloakId.isEmpty();
            keycloakId = existingKeycloakId.orElseGet(() -> keycloakAdminClient.createUser(request));

            if (!createdInKeycloak) {
                // Ensure a retried signup can reuse the orphaned Keycloak account with the latest password.
                keycloakAdminClient.resetPassword(keycloakId, request.getPassword());
            }

            User savedUser = saveRegisteredUser(request, keycloakId);
            String token = keycloakTokenService.getTokenForCredentials(request.getEmail(), request.getPassword());
            loginEventService.recordLogin(savedUser.getUserId(), savedUser.getEmail(), LoginType.PASSWORD);
            return buildAuthResponse(savedUser, token);
        } catch (DataAccessException exception) {
            cleanupKeycloakUserIfNeeded(createdInKeycloak, keycloakId);
            throw new IllegalStateException("Failed to save the user locally", exception);
        } catch (RuntimeException exception) {
            cleanupKeycloakUserIfNeeded(createdInKeycloak, keycloakId);
            throw exception;
        }
    }

    @Transactional
    public AuthResponse authenticate(LoginRequest request) {
        String token = keycloakTokenService.getTokenForCredentials(request.getEmail(), request.getPassword());
        User user = findByEmail(request.getEmail());
        loginEventService.recordLogin(user.getUserId(), user.getEmail(), LoginType.PASSWORD);
        return buildAuthResponse(user, token);
    }

    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));
    }

    @Transactional(readOnly = true)
    public UserDto getUserDtoByEmail(String email) {
        User user = findByEmail(email);
        return mapToDto(user);
    }

    private User saveRegisteredUser(RegisterRequest request, String keycloakId) {
        User user = User.builder()
                .keycloakId(keycloakId)
                .name(request.getName())
                .email(request.getEmail())
                .role(request.getRole())
                .isVerified(true)
                .build();

        return userRepository.save(user);
    }

    private void cleanupKeycloakUserIfNeeded(boolean createdInKeycloak, String keycloakId) {
        if (!createdInKeycloak || keycloakId == null) {
            return;
        }

        try {
            keycloakAdminClient.deleteUser(keycloakId);
        } catch (RuntimeException ignored) {
            // The local transaction will already roll back. Keep the original exception as the main failure.
        }
    }

    private AuthResponse buildAuthResponse(User user, String token) {
        return AuthResponse.builder()
                .token(token)
                .user(mapToDto(user))
                .build();
    }

    private UserDto mapToDto(User user) {
        UserDto dto = new UserDto();
        dto.setUserId(user.getUserId());
        dto.setKeycloakId(user.getKeycloakId());
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
            dto.setCaregiverEmails(safeUsers(user.getCaregivers()).stream()
                    .map(User::getEmail).collect(Collectors.toSet()));
        } else if (user.getRole() == UserRole.CAREGIVER) {
            dto.setPatientEmails(safeUsers(user.getPatients()).stream()
                    .map(User::getEmail).collect(Collectors.toSet()));
        } else if (user.getRole() == UserRole.DOCTOR) {
            List<User> patients = userRepository.findByDoctorEmail(user.getEmail());
            dto.setPatientEmails(patients.stream().map(User::getEmail).collect(Collectors.toSet()));
        }
        return dto;
    }

    private java.util.Set<User> safeUsers(java.util.Set<User> users) {
        return users == null ? Collections.emptySet() : users;
    }
    @Transactional
    public User updateUser(String email, UpdateUserRequest request) {
        User user = findByEmail(email);

        // Update common fields
        if (request.getName() != null) {
            user.setName(request.getName());
        }
        if (request.getEmail() != null && !request.getEmail().equals(email)) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new RuntimeException("Email already in use");
            }
            user.setEmail(request.getEmail());
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getDateOfBirth() != null) {
            user.setDateOfBirth(request.getDateOfBirth());
        }
        if (request.getEmergencyContact() != null) {
            user.setEmergencyContact(request.getEmergencyContact());
        }
        if (request.getProfilePicture() != null) {
            user.setProfilePicture(request.getProfilePicture());
        }

        // Doctor-specific fields
        if (user.getRole() == UserRole.DOCTOR) {
            if (request.getYearsExperience() != null) {
                user.setYearsExperience(request.getYearsExperience());
            }
            if (request.getSpecialization() != null) {
                user.setSpecialization(request.getSpecialization());
            }
            if (request.getMedicalLicense() != null) {
                user.setMedicalLicense(request.getMedicalLicense());
            }
            if (request.getWorkplaceType() != null) {
                user.setWorkplaceType(request.getWorkplaceType());
            }
            if (request.getWorkplaceName() != null) {
                user.setWorkplaceName(request.getWorkplaceName());
            }
        }

        // Patient-caregiver relationships
        if (request.getConnectedEmail() != null && !request.getConnectedEmail().isEmpty()) {
            User connectedUser = findByEmail(request.getConnectedEmail());

            if (user.getRole() == UserRole.PATIENT) {
                if (connectedUser.getRole() != UserRole.CAREGIVER) {
                    throw new RuntimeException("Connected email must belong to a caregiver");
                }
                if (user.getCaregivers().contains(connectedUser)) {
                    user.getCaregivers().remove(connectedUser);
                    connectedUser.getPatients().remove(user);
                } else {
                    user.getCaregivers().add(connectedUser);
                    connectedUser.getPatients().add(user);
                }
                userRepository.save(connectedUser);
            } else if (user.getRole() == UserRole.CAREGIVER) {
                if (connectedUser.getRole() != UserRole.PATIENT) {
                    throw new RuntimeException("Connected email must belong to a patient");
                }
                if (user.getPatients().contains(connectedUser)) {
                    user.getPatients().remove(connectedUser);
                    connectedUser.getCaregivers().remove(user);
                } else {
                    user.getPatients().add(connectedUser);
                    connectedUser.getCaregivers().add(user);
                }
                userRepository.save(connectedUser);
            } else {
                throw new RuntimeException("Only patients and caregivers can have connections");
            }
        }

        // Doctor assignment for patients
        if (user.getRole() == UserRole.PATIENT) {
            if (request.getDoctorEmail() != null) {
                if (request.getDoctorEmail().isEmpty()) {
                    user.setDoctorEmail(null);
                } else {
                    User doctor = findByEmail(request.getDoctorEmail());
                    if (doctor.getRole() != UserRole.DOCTOR) {
                        throw new RuntimeException("Doctor email must belong to a doctor");
                    }
                    if (request.getDoctorEmail().equals(user.getDoctorEmail())) {
                        user.setDoctorEmail(null);
                    } else {
                        user.setDoctorEmail(doctor.getEmail());
                    }
                }
            }
        }

        return userRepository.save(user);
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        User user = findByEmail(email);
        keycloakAdminClient.changePassword(user.getKeycloakId(), request);
    }

    @Transactional
    public void deleteUser(String email) {
        User user = findByEmail(email);
        if (user.getKeycloakId() != null) {
            keycloakAdminClient.deleteUser(user.getKeycloakId());
        }
        if (user.getRole() == UserRole.PATIENT) {
            for (User caregiver : user.getCaregivers()) {
                caregiver.getPatients().remove(user);
            }
            user.getCaregivers().clear();
        } else if (user.getRole() == UserRole.CAREGIVER) {
            for (User patient : user.getPatients()) {
                patient.getCaregivers().remove(user);
            }
            user.getPatients().clear();
        }
        userRepository.delete(user);
    }

    // Admin methods
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @Transactional
    public User updateUserByAdmin(String userId, UpdateUserByAdminRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new RuntimeException("Email already in use");
            }
            user.setEmail(request.getEmail());
        }

        if (request.getRole() != null) {
            user.setRole(request.getRole());
        }

        return userRepository.save(user);
    }

    @Transactional
    public void deleteUserById(String userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
        if (user.getKeycloakId() != null) {
            keycloakAdminClient.deleteUser(user.getKeycloakId());
        }
        if (user.getRole() == UserRole.PATIENT) {
            for (User caregiver : user.getCaregivers()) {
                caregiver.getPatients().remove(user);
            }
            user.getCaregivers().clear();
        } else if (user.getRole() == UserRole.CAREGIVER) {
            for (User patient : user.getPatients()) {
                patient.getCaregivers().remove(user);
            }
            user.getPatients().clear();
        }
        userRepository.delete(user);
    }

    public List<User> searchUsersByRole(String query, UserRole role) {
        return userRepository.searchByRoleAndQuery(query, role);
    }


    // NEW: find by userId
    public User findByUserId(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
    }

    // NEW: get user DTO by ID
    @Transactional(readOnly = true)
    public UserDto getUserDtoById(String userId) {
        User user = findByUserId(userId);
        return mapToDto(user);
    }


    @Transactional
    public void setupFaceId(String email, List<String> images) {
        User user = findByEmail(email);
        if (user.getKeycloakId() == null) {
            throw new RuntimeException("User has no Keycloak ID");
        }
        boolean success = faceService.registerFace(user.getKeycloakId(), images);
        if (!success) {
            throw new RuntimeException("Failed to register face embeddings");
        }
    }

    public Map<String, Object> faceLogin(String keycloakId, String base64Image) {
        Map result = faceService.verifyFace(keycloakId, base64Image);
        boolean matched = Boolean.TRUE.equals(result.get("matched"));

        if (!matched) {
            double score = result.get("score") != null ?
                    ((Number) result.get("score")).doubleValue() : 0.0;
            throw new RuntimeException("Face not recognized. Score: " + score);
        }

        User user = userRepository.findByKeycloakId(keycloakId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // ✅ Record face login event
        loginEventService.recordLogin(user.getUserId(), user.getEmail(), LoginType.FACE);

        String token = faceLoginTokenService.generateToken(user);

        return Map.of(
                "token", token,
                "email", user.getEmail(),
                "userId", user.getUserId(),
                "user", mapToDto(user)
        );
    }
    public boolean hasFaceId(String email) {
        User user = findByEmail(email);
        if (user.getKeycloakId() == null) return false;
        return faceService.hasFaceRegistered(user.getKeycloakId());
    }

    @Transactional
    public void updateLastSeen(String email) {
        User user = findByEmail(email);
        user.setLastSeenAt(LocalDateTime.now());
        userRepository.save(user);
    }
}
