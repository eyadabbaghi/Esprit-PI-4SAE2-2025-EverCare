package tn.esprit.user.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import tn.esprit.user.dto.*;
import tn.esprit.user.entity.LoginType;
import tn.esprit.user.entity.User;
import tn.esprit.user.entity.UserRole;
import tn.esprit.user.repository.PatientCaregiverRelationshipRepository;
import tn.esprit.user.repository.UserRepository;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UserService {
    private static final String ADMIN_EMAIL_DOMAIN = "@evercare.com";
    private static final String CLEAR_RELATIONSHIP_TYPE = "__CLEAR_RELATIONSHIP__";

    private final UserRepository userRepository;
    private final KeycloakAdminClient keycloakAdminClient;
    private final FaceService faceService;
    private final FaceLoginTokenService faceLoginTokenService;
    private final LoginEventService loginEventService;
    private final RelationshipEmailService relationshipEmailService;
    private final PatientCaregiverRelationshipRepository relationshipRepository;

    @Value("${google.client-id}")
    private String googleClientId;

    @Transactional
    public void register(RegisterRequest request) {
        createLocalAndKeycloakUser(request, null);
    }

    @Transactional
    public User createAdminUser(CreateAdminUserRequest request) {
        if (request.getName() == null || request.getName().isBlank()) {
            throw new RuntimeException("Admin name is required");
        }
        if (request.getEmail() == null || request.getEmail().isBlank()) {
            throw new RuntimeException("Admin email is required");
        }
        String adminEmail = request.getEmail().trim().toLowerCase();
        if (!adminEmail.endsWith(ADMIN_EMAIL_DOMAIN)) {
            throw new RuntimeException("Invalid admin account details");
        }
        if (request.getPassword() == null || request.getPassword().length() < 8) {
            throw new RuntimeException("Admin password must be at least 8 characters");
        }

        RegisterRequest registerRequest = new RegisterRequest();
        registerRequest.setName(request.getName());
        registerRequest.setEmail(adminEmail);
        registerRequest.setPassword(request.getPassword());
        registerRequest.setRole(UserRole.ADMIN);

        return createLocalAndKeycloakUser(registerRequest, request.getPhone());
    }

    private User createLocalAndKeycloakUser(RegisterRequest request, String phone) {
        String normalizedEmail = request.getEmail() == null ? "" : request.getEmail().trim().toLowerCase();
        request.setEmail(normalizedEmail);

        if (normalizedEmail.isBlank()) {
            throw new RuntimeException("Email is required");
        }

        if (request.getRole() == UserRole.ADMIN && !normalizedEmail.endsWith(ADMIN_EMAIL_DOMAIN)) {
            throw new RuntimeException("Invalid admin account details");
        }

        if (userRepository.findByEmailIgnoreCase(normalizedEmail).isPresent()) {
            throw new RuntimeException("Email already exists");
        }

        String keycloakId = keycloakAdminClient.createUser(request);

        User user = User.builder()
                .keycloakId(keycloakId)
                .name(request.getName())
                .email(request.getEmail())
                .role(request.getRole())
                .phone(phone)
                .isVerified(request.getRole() == UserRole.ADMIN)
                .doctorEmails(new HashSet<>())
                .caregivers(new HashSet<>())
                .patients(new HashSet<>())
                .build();

        return userRepository.save(user);
    }

    public User findByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email)
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
        dto.setKeycloakId(user.getKeycloakId());
        dto.setName(user.getName());
        dto.setEmail(user.getEmail());
        dto.setRole(user.getRole());
        dto.setPhone(user.getPhone());
        dto.setRecoveryEmail(user.getRecoveryEmail());
        dto.setAddress(user.getAddress());
        dto.setCountry(user.getCountry());
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
        Set<String> doctorEmails = doctorEmailsForDto(user);
        dto.setDoctorEmails(doctorEmails);
        dto.setDoctorEmail(doctorEmails.stream().findFirst().orElse(null));



        // Relationships
        if (user.getRole() == UserRole.PATIENT) {
            dto.setCaregiverEmails(user.getCaregivers().stream()
                    .map(User::getEmail).collect(Collectors.toSet()));
            dto.setCaregiverRelationships(relationshipRepository.findByPatientId(user.getUserId()).stream()
                    .filter(relationship -> relationship.getRelationshipType() != null && !relationship.getRelationshipType().isBlank())
                    .collect(Collectors.toMap(
                            relationship -> resolveUserEmail(relationship.getCaregiverId()),
                            relationship -> displayRelationshipType(relationship.getRelationshipType()),
                            (left, right) -> left,
                            LinkedHashMap::new
                    )));
        } else if (user.getRole() == UserRole.CAREGIVER) {
            dto.setPatientEmails(user.getPatients().stream()
                    .map(User::getEmail).collect(Collectors.toSet()));
            dto.setPatientRelationships(relationshipRepository.findByCaregiverId(user.getUserId()).stream()
                    .filter(relationship -> relationship.getRelationshipType() != null && !relationship.getRelationshipType().isBlank())
                    .collect(Collectors.toMap(
                            relationship -> resolveUserEmail(relationship.getPatientId()),
                            relationship -> displayRelationshipType(relationship.getRelationshipType()),
                            (left, right) -> left,
                            LinkedHashMap::new
                    )));
        } else if (user.getRole() == UserRole.DOCTOR) {
            List<User> patients = userRepository.findAssociatedPatientsByDoctorEmail(user.getEmail());
            dto.setPatientEmails(patients.stream().map(User::getEmail).collect(Collectors.toSet()));
            dto.setCaregiverEmails(patients.stream()
                    .flatMap(patient -> patient.getCaregivers().stream())
                    .map(User::getEmail)
                    .collect(Collectors.toSet()));
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
        if (request.getEmail() != null && !request.getEmail().equalsIgnoreCase(email)) {
            throw new RuntimeException("Use the secure email change flow to update your email address.");
        }
        if (request.getPhone() != null) {
            user.setPhone(request.getPhone());
        }
        if (request.getRecoveryEmail() != null) {
            String recoveryEmail = request.getRecoveryEmail().trim().toLowerCase();
            if (!recoveryEmail.isBlank() && recoveryEmail.equalsIgnoreCase(user.getEmail())) {
                throw new RuntimeException("Recovery email must be different from your account email.");
            }
            user.setRecoveryEmail(recoveryEmail.isBlank() ? null : recoveryEmail);
        }
        if (request.getAddress() != null) {
            user.setAddress(request.getAddress());
        }
        if (request.getCountry() != null) {
            user.setCountry(request.getCountry());
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
        if (request.getConnectedEmail() != null && !request.getConnectedEmail().isBlank()) {
            String connectedEmail = request.getConnectedEmail().trim().toLowerCase();
            User connectedUser = userRepository.findByEmailIgnoreCase(connectedEmail)
                    .orElseThrow(() -> {
                        if (user.getRole() == UserRole.PATIENT) {
                            return new RuntimeException("No caregiver account was found with this email. Please check the caregiver email or ask them to create an EverCare caregiver account first.");
                        }
                        if (user.getRole() == UserRole.CAREGIVER) {
                            return new RuntimeException("No patient account was found with this email. Please check the patient email or ask them to create an EverCare patient account first.");
                        }
                        return new RuntimeException("No EverCare account was found with this email.");
                    });

            if (user.getRole() == UserRole.PATIENT) {
                if (connectedUser.getRole() != UserRole.CAREGIVER) {
                    throw new RuntimeException("This email belongs to a " + connectedUser.getRole().name().toLowerCase() + " account. Please enter the email of a caregiver account.");
                }
                if (user.getCaregivers().contains(connectedUser)) {
                    if (hasRelationshipTypeRequest(request)) {
                        relationshipRepository.upsertRelationshipType(
                                user.getUserId(),
                                connectedUser.getUserId(),
                                relationshipTypeForUpdate(request.getRelationshipType())
                        );
                    } else {
                        user.getCaregivers().remove(connectedUser);
                        connectedUser.getPatients().remove(user);
                        relationshipRepository.deleteByPatientAndCaregiver(user.getUserId(), connectedUser.getUserId());
                        relationshipEmailService.sendDisassociated(user, connectedUser);
                    }
                } else {
                    user.getCaregivers().add(connectedUser);
                    connectedUser.getPatients().add(user);
                    userRepository.save(user);
                    userRepository.save(connectedUser);
                    relationshipRepository.upsertRelationshipType(
                            user.getUserId(),
                            connectedUser.getUserId(),
                            normalizeRelationshipType(request.getRelationshipType())
                    );
                    relationshipEmailService.sendAssociated(user, connectedUser);
                }
                userRepository.save(connectedUser);
            } else if (user.getRole() == UserRole.CAREGIVER) {
                if (connectedUser.getRole() != UserRole.PATIENT) {
                    throw new RuntimeException("This email belongs to a " + connectedUser.getRole().name().toLowerCase() + " account. Please enter the email of a patient account.");
                }
                if (user.getPatients().contains(connectedUser)) {
                    if (hasRelationshipTypeRequest(request)) {
                        relationshipRepository.upsertRelationshipType(
                                connectedUser.getUserId(),
                                user.getUserId(),
                                relationshipTypeForUpdate(request.getRelationshipType())
                        );
                    } else {
                        user.getPatients().remove(connectedUser);
                        connectedUser.getCaregivers().remove(user);
                        relationshipRepository.deleteByPatientAndCaregiver(connectedUser.getUserId(), user.getUserId());
                        relationshipEmailService.sendDisassociated(user, connectedUser);
                    }
                } else {
                    user.getPatients().add(connectedUser);
                    connectedUser.getCaregivers().add(user);
                    userRepository.save(user);
                    userRepository.save(connectedUser);
                    relationshipRepository.upsertRelationshipType(
                            connectedUser.getUserId(),
                            user.getUserId(),
                            normalizeRelationshipType(request.getRelationshipType())
                    );
                    relationshipEmailService.sendAssociated(user, connectedUser);
                }
                userRepository.save(connectedUser);
            } else {
                throw new RuntimeException("Only patients and caregivers can have connections");
            }
        }

        // Doctor assignment for patients
        if (user.getRole() == UserRole.PATIENT) {
            if (request.getDoctorEmails() != null) {
                replacePatientDoctors(user, request.getDoctorEmails());
            } else if (request.getDoctorEmail() != null) {
                togglePatientDoctor(user, request.getDoctorEmail());
            }
        }

        return userRepository.save(user);
    }

    private Set<String> doctorEmailsForDto(User user) {
        return collectDoctorEmails(user);
    }

    private LinkedHashSet<String> collectDoctorEmails(User user) {
        LinkedHashSet<String> emails = new LinkedHashSet<>();
        String legacyDoctorEmail = normalizeEmail(user.getDoctorEmail());
        if (!legacyDoctorEmail.isBlank()) {
            emails.add(legacyDoctorEmail);
        }
        if (user.getDoctorEmails() != null) {
            user.getDoctorEmails().stream()
                    .map(this::normalizeEmail)
                    .filter(value -> !value.isBlank())
                    .forEach(emails::add);
        }
        return emails;
    }

    private void setPatientDoctorEmails(User patient, Set<String> doctorEmails) {
        LinkedHashSet<String> normalized = doctorEmails.stream()
                .map(this::normalizeEmail)
                .filter(value -> !value.isBlank())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        patient.setDoctorEmails(new HashSet<>(normalized));
        patient.setDoctorEmail(normalized.stream().findFirst().orElse(null));
    }

    private void replacePatientDoctors(User patient, Set<String> requestedDoctorEmails) {
        LinkedHashSet<String> currentEmails = collectDoctorEmails(patient);
        LinkedHashSet<String> nextEmails = new LinkedHashSet<>();

        for (String requestedEmail : requestedDoctorEmails) {
            String normalized = normalizeEmail(requestedEmail);
            if (normalized.isBlank()) {
                continue;
            }
            User doctor = findByEmail(normalized);
            if (doctor.getRole() != UserRole.DOCTOR) {
                throw new RuntimeException("Doctor email must belong to a doctor");
            }
            nextEmails.add(normalizeEmail(doctor.getEmail()));
        }

        currentEmails.stream()
                .filter(email -> !nextEmails.contains(email))
                .forEach(email -> userRepository.findByEmailIgnoreCase(email)
                        .ifPresent(doctor -> relationshipEmailService.sendDisassociated(patient, doctor)));

        nextEmails.stream()
                .filter(email -> !currentEmails.contains(email))
                .forEach(email -> userRepository.findByEmailIgnoreCase(email)
                        .ifPresent(doctor -> relationshipEmailService.sendAssociated(patient, doctor)));

        setPatientDoctorEmails(patient, nextEmails);
    }

    private void togglePatientDoctor(User patient, String requestedDoctorEmail) {
        String normalized = normalizeEmail(requestedDoctorEmail);
        LinkedHashSet<String> currentEmails = collectDoctorEmails(patient);

        if (normalized.isBlank()) {
            currentEmails.forEach(email -> userRepository.findByEmailIgnoreCase(email)
                    .ifPresent(doctor -> relationshipEmailService.sendDisassociated(patient, doctor)));
            setPatientDoctorEmails(patient, Set.of());
            return;
        }

        User doctor = findByEmail(normalized);
        if (doctor.getRole() != UserRole.DOCTOR) {
            throw new RuntimeException("Doctor email must belong to a doctor");
        }

        String doctorEmail = normalizeEmail(doctor.getEmail());
        if (currentEmails.contains(doctorEmail)) {
            currentEmails.remove(doctorEmail);
            relationshipEmailService.sendDisassociated(patient, doctor);
        } else {
            currentEmails.add(doctorEmail);
            relationshipEmailService.sendAssociated(patient, doctor);
        }

        setPatientDoctorEmails(patient, currentEmails);
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private String resolveUserEmail(String userId) {
        return userRepository.findById(userId)
                .map(User::getEmail)
                .orElse(userId);
    }

    private String normalizeRelationshipType(String relationshipType) {
        String value = relationshipType == null ? "" : relationshipType.trim();
        return value.isBlank() ? "Prefer not to say" : value;
    }

    private boolean hasRelationshipTypeRequest(UpdateUserRequest request) {
        return request.getRelationshipType() != null;
    }

    private String relationshipTypeForUpdate(String relationshipType) {
        String value = relationshipType == null ? "" : relationshipType.trim();
        return CLEAR_RELATIONSHIP_TYPE.equals(value) ? null : normalizeRelationshipType(value);
    }

    private String displayRelationshipType(String relationshipType) {
        String value = relationshipType == null ? "" : relationshipType.trim();
        return value;
    }

    @Transactional
    public User assignDoctorToCaregiverPatient(String caregiverEmail, String patientId, String doctorEmail) {
        User caregiver = findByEmail(caregiverEmail);
        if (caregiver.getRole() != UserRole.CAREGIVER) {
            throw new RuntimeException("Only caregivers can assign doctors to patients");
        }

        User patient = findByUserId(patientId);
        if (patient.getRole() != UserRole.PATIENT || !caregiver.getPatients().contains(patient)) {
            throw new RuntimeException("Patient is not associated with this caregiver");
        }

        togglePatientDoctor(patient, doctorEmail);

        return userRepository.save(patient);
    }

    @Transactional
    public void changePassword(String email, ChangePasswordRequest request) {
        User user = findByEmail(email);
        boolean validPassword = keycloakAdminClient.verifyUserPassword(email, request.getCurrentPassword());
        if (!validPassword) {
            throw new RuntimeException("Current password is incorrect");
        }
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
            if (user.getKeycloakId() != null && !user.getKeycloakId().isBlank()) {
                keycloakAdminClient.updateEmail(user.getKeycloakId(), request.getEmail(), user.isVerified());
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

    @Transactional(readOnly = true)
    public List<UserDto> searchUserDtosByRole(String query, UserRole role) {
        String normalizedQuery = query == null ? "" : query;
        return userRepository.searchByRoleAndQuery(normalizedQuery, role).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<User> getPatientsByDoctorEmail(String doctorEmail) {
        return userRepository.findAssociatedPatientsByDoctorEmail(doctorEmail);
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
        user.setLastSeenAt(LocalDateTime.now());
        userRepository.save(user);

        String token = faceLoginTokenService.generateToken(user);

        return Map.of(
                "token", token,
                "email", user.getEmail(),
                "userId", user.getUserId(),
                "user", mapToDto(user)
        );
    }

    @Transactional
    public Map<String, Object> googleLogin(String credential, UserRole requestedRole) {
        if (credential == null || credential.isBlank()) {
            throw new RuntimeException("Missing Google credential");
        }
        if (requestedRole == UserRole.ADMIN) {
            throw new RuntimeException("Admin accounts cannot be created with Google signup");
        }

        Map<String, Object> tokenInfo = verifyGoogleCredential(credential);
        String email = valueAsString(tokenInfo.get("email"));
        String name = valueAsString(tokenInfo.get("name"));
        String picture = valueAsString(tokenInfo.get("picture"));

        if (email == null || email.isBlank()) {
            throw new RuntimeException("Google account did not provide an email");
        }

        String normalizedEmail = email.trim().toLowerCase();
        boolean isNewUser = userRepository.findByEmailIgnoreCase(normalizedEmail).isEmpty();
        User user = userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseGet(() -> createGoogleUser(email, name, picture, requestedRole));

        if ((user.getProfilePicture() == null || user.getProfilePicture().isBlank())
                && picture != null && !picture.isBlank()) {
            user.setProfilePicture(picture);
        }

        user.setLastSeenAt(LocalDateTime.now());
        userRepository.save(user);
        loginEventService.recordLogin(user.getUserId(), user.getEmail(), LoginType.PASSWORD);

        String token = faceLoginTokenService.generateToken(user);
        return Map.of(
                "token", token,
                "email", user.getEmail(),
                "userId", user.getUserId(),
                "user", mapToDto(user),
                "isNewUser", isNewUser
        );
    }

    private Map<String, Object> verifyGoogleCredential(String credential) {
        String tokenInfoUrl = UriComponentsBuilder
                .fromHttpUrl("https://oauth2.googleapis.com/tokeninfo")
                .queryParam("id_token", credential)
                .toUriString();

        Map<String, Object> tokenInfo = new RestTemplate().getForObject(tokenInfoUrl, Map.class);
        if (tokenInfo == null) {
            throw new RuntimeException("Google credential could not be verified");
        }

        String audience = valueAsString(tokenInfo.get("aud"));
        String emailVerified = valueAsString(tokenInfo.get("email_verified"));

        if (!googleClientId.equals(audience)) {
            throw new RuntimeException("Google credential was issued for another client");
        }
        if (!"true".equalsIgnoreCase(emailVerified)) {
            throw new RuntimeException("Google email is not verified");
        }

        return tokenInfo;
    }

    private User createGoogleUser(String email, String name, String picture, UserRole requestedRole) {
        RegisterRequest request = new RegisterRequest();
        request.setEmail(email);
        request.setName(resolveGoogleDisplayName(email, name));
        request.setPassword(UUID.randomUUID() + "Aa1!");
        request.setRole(requestedRole != null ? requestedRole : UserRole.PATIENT);

        User user = createLocalAndKeycloakUser(request, null);
        user.setVerified(true);
        if (picture != null && !picture.isBlank()) {
            user.setProfilePicture(picture);
        }
        return userRepository.save(user);
    }

    private String resolveGoogleDisplayName(String email, String name) {
        if (name != null && !name.isBlank()) {
            return name;
        }
        int atIndex = email.indexOf('@');
        return atIndex > 0 ? email.substring(0, atIndex) : email;
    }

    private String valueAsString(Object value) {
        return value == null ? null : String.valueOf(value);
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

    @Transactional(readOnly = true)
    public List<UserDto> getCaregiversByPatientId(String patientId) {
        User patient = findByUserId(patientId);
        return patient.getCaregivers().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserDto> getCaregiversByPatientEmail(String email) {
        User patient = findByEmail(email);
        return patient.getCaregivers().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<UserDto> getPatientsByCaregiveId(String caregiverId) {
        User caregiver = findByUserId(caregiverId);
        return caregiver.getPatients().stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }
}
