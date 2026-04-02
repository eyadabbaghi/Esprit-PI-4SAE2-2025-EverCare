package tn.esprit.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.user.dto.*;
import tn.esprit.user.entity.User;
import tn.esprit.user.entity.UserRole;
import tn.esprit.user.repository.UserRepository;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final KeycloakAdminClient keycloakAdminClient;

    @Transactional
    public void register(RegisterRequest request) {
        // Check if email already exists locally
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new RuntimeException("Email already exists");
        }

        // Create user in Keycloak
        String keycloakId = keycloakAdminClient.createUser(request);

        // Create local user
        User user = User.builder()
                .keycloakId(keycloakId)
                .name(request.getName())
                .email(request.getEmail())
                .role(request.getRole())
                .isVerified(true)
                .build();

        userRepository.save(user);
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
        } else if (user.getRole() == UserRole.DOCTOR) {
            List<User> patients = userRepository.findByDoctorEmail(user.getEmail());
            dto.setPatientEmails(patients.stream().map(User::getEmail).collect(Collectors.toSet()));
        }
        return dto;
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

    // ============ CAREGIVER AND PATIENT RELATIONSHIPS ============
    // ADDED: April 2, 2026 - New methods to manage and fetch patient-caregiver relationships
    // These methods utilize the existing @ManyToMany relationship in the User entity
    // The relationship is managed through the 'patient_caregiver' junction table
    // 
    // TEAM NOTE: 
    // - Patient entity has: Set<User> caregivers (joinColumns = patient_id)
    // - Caregiver entity has: Set<User> patients (inverse side of caregivers)
    // - Before using these endpoints, ensure relationships are established using updateUser()
    //   method with the 'connectedEmail' parameter
    // - All methods use @Transactional(readOnly = true) for performance optimization

    /**
     * ADDED: Retrieve all caregivers assigned to a specific patient using patient ID
     * 
     * Use Case: Frontend needs to display all caregivers for a patient's profile
     * 
     * @param patientId The UUID of the patient
     * @return List of UserDto objects representing caregivers
     * @throws RuntimeException if user ID doesn't exist or user is not a PATIENT role
     * 
     * Performance: Uses readOnly transaction, leverages existing eager-loaded relationship
     * 
     * Example:
     * List<UserDto> caregivers = userService.getCaregiversByPatientId("550e8400-e29b-41d4-a716-446655440000");
     */
    @Transactional(readOnly = true)
    public List<UserDto> getCaregiversByPatientId(String patientId) {
        User patient = findByUserId(patientId);
        
        // Validate that the user is actually a PATIENT before returning caregivers
        if (patient.getRole() != UserRole.PATIENT) {
            throw new RuntimeException("User with ID " + patientId + " is not a patient");
        }
        
        // Stream the caregivers set, map each to DTO, and collect into list
        return patient.getCaregivers().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    /**
     * ADDED: Retrieve all caregivers for the authenticated patient using email
     * 
     * Use Case: When a patient is logged in and needs to see their own caregivers
     * This method extracts patient email from the JWT token's UserDetails
     * 
     * @param patientEmail The email of the authenticated patient
     * @return List of UserDto objects representing caregivers
     * @throws RuntimeException if email doesn't exist or user is not a PATIENT role
     * 
     * Security: Called from controller with @AuthenticationPrincipal annotation
     * This ensures only authenticated users can call this method
     * 
     * Example:
     * UserDetails userDetails = // from @AuthenticationPrincipal
     * List<UserDto> caregivers = userService.getCaregiversByPatientEmail(userDetails.getUsername());
     */
    @Transactional(readOnly = true)
    public List<UserDto> getCaregiversByPatientEmail(String patientEmail) {
        User patient = findByEmail(patientEmail);
        
        // Validate that the user is actually a PATIENT before returning caregivers
        if (patient.getRole() != UserRole.PATIENT) {
            throw new RuntimeException("User with email " + patientEmail + " is not a patient");
        }
        
        // Stream the caregivers set, map each to DTO, and collect into list
        return patient.getCaregivers().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    /**
     * ADDED: Retrieve all patients assigned to a specific caregiver using caregiver ID
     * 
     * Use Case: Frontend needs to display all patients under a caregiver's care
     * 
     * @param caregiverId The UUID of the caregiver
     * @return List of UserDto objects representing patients
     * @throws RuntimeException if user ID doesn't exist or user is not a CAREGIVER role
     * 
     * Performance: Uses readOnly transaction, leverages existing eager-loaded relationship
     * 
     * Example:
     * List<UserDto> patients = userService.getPatientsByCaregiveId("6ba7b810-9dad-11d1-80b4-00c04fd430c8");
     */
    @Transactional(readOnly = true)
    public List<UserDto> getPatientsByCaregiveId(String caregiverId) {
        User caregiver = findByUserId(caregiverId);
        
        // Validate that the user is actually a CAREGIVER before returning patients
        if (caregiver.getRole() != UserRole.CAREGIVER) {
            throw new RuntimeException("User with ID " + caregiverId + " is not a caregiver");
        }
        
        // Stream the patients set, map each to DTO, and collect into list
        return caregiver.getPatients().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    /**
     * ADDED: Retrieve all patients for the authenticated caregiver using email
     * 
     * Use Case: When a caregiver is logged in and needs to see their assigned patients
     * This method extracts caregiver email from the JWT token's UserDetails
     * 
     * @param caregiverEmail The email of the authenticated caregiver
     * @return List of UserDto objects representing patients
     * @throws RuntimeException if email doesn't exist or user is not a CAREGIVER role
     * 
     * Security: Called from controller with @AuthenticationPrincipal annotation
     * This ensures only authenticated users can call this method
     * 
     * Example:
     * UserDetails userDetails = // from @AuthenticationPrincipal
     * List<UserDto> patients = userService.getPatientsByCaregiveEmail(userDetails.getUsername());
     */
    @Transactional(readOnly = true)
    public List<UserDto> getPatientsByCaregiveEmail(String caregiverEmail) {
        User caregiver = findByEmail(caregiverEmail);
        
        // Validate that the user is actually a CAREGIVER before returning patients
        if (caregiver.getRole() != UserRole.CAREGIVER) {
            throw new RuntimeException("User with email " + caregiverEmail + " is not a caregiver");
        }
        
        // Stream the patients set, map each to DTO, and collect into list
        return caregiver.getPatients().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }
    // ============ END OF CAREGIVER AND PATIENT RELATIONSHIPS ============
}