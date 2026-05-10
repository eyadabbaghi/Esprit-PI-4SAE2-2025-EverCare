package tn.esprit.user.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tn.esprit.user.entity.EmailVerificationCode;
import tn.esprit.user.entity.User;
import tn.esprit.user.entity.UserRole;
import tn.esprit.user.repository.EmailVerificationCodeRepository;
import tn.esprit.user.repository.UserRepository;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class EmailVerificationService {

    private static final Logger log = LoggerFactory.getLogger(EmailVerificationService.class);
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int CODE_TTL_MINUTES = 15;
    private static final int RESEND_COOLDOWN_SECONDS = 60;
    private static final int MAX_ATTEMPTS = 5;
    private static final String PURPOSE_EMAIL_VERIFICATION = "EMAIL_VERIFICATION";
    private static final String PURPOSE_PASSWORD_RESET = "PASSWORD_RESET";
    private static final String PURPOSE_EMAIL_CHANGE_PHONE = "EMAIL_CHANGE_PHONE";
    private static final String PURPOSE_EMAIL_CHANGE_EMAIL = "EMAIL_CHANGE_EMAIL";
    private static final String PURPOSE_EMAIL_CHANGE_RECOVERY = "EMAIL_CHANGE_RECOVERY";

    private final UserRepository userRepository;
    private final EmailVerificationCodeRepository codeRepository;
    private final ObjectProvider<JavaMailSender> mailSenderProvider;
    private final KeycloakAdminClient keycloakAdminClient;
    private final SmsVerificationService smsVerificationService;
    private final CommunicationReferenceService communicationReferenceService;

    @Value("${evercare.mail.from:EverCare <no-reply@evercare.local>}")
    private String mailFrom;

    @Transactional
    public void sendVerificationCode(String email) {
        User user = findUserByEmail(email);

        if (user.getRole() == UserRole.ADMIN) {
            user.setVerified(true);
            userRepository.save(user);
            return;
        }

        if (user.isVerified()) {
            return;
        }

        String code = createCode(user, PURPOSE_EMAIL_VERIFICATION);
        sendEmail(
                user,
                "Your EverCare verification code",
                """
                        Hi %s,

                        Your EverCare email verification code is: %s

                        This code expires in %d minutes.
                        If you did not request this, you can ignore this email.

                        EverCare Team
                        """.formatted(user.getName(), code, CODE_TTL_MINUTES),
                code
        );
    }

    @Transactional
    public User verifyEmail(String email, String code) {
        User user = findUserByEmail(email);

        if (user.getRole() == UserRole.ADMIN || user.isVerified()) {
            user.setVerified(true);
            return userRepository.save(user);
        }

        String normalizedCode = code == null ? "" : code.trim();
        if (!normalizedCode.matches("\\d{6}")) {
            throw new RuntimeException("Enter the 6-digit verification code");
        }

        EmailVerificationCode verificationCode = codeRepository.findTopByUserAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(user, PURPOSE_EMAIL_VERIFICATION)
                .orElseThrow(() -> new RuntimeException("No active verification code. Please request a new one."));

        LocalDateTime now = LocalDateTime.now();
        if (verificationCode.getExpiresAt().isBefore(now)) {
            verificationCode.setUsedAt(now);
            codeRepository.save(verificationCode);
            throw new RuntimeException("Verification code expired. Please request a new one.");
        }

        if (verificationCode.getAttempts() >= MAX_ATTEMPTS) {
            verificationCode.setUsedAt(now);
            codeRepository.save(verificationCode);
            throw new RuntimeException("Too many attempts. Please request a new code.");
        }

        if (!verificationCode.getCode().equals(normalizedCode)) {
            verificationCode.setAttempts(verificationCode.getAttempts() + 1);
            codeRepository.save(verificationCode);
            throw new RuntimeException("Invalid verification code");
        }

        verificationCode.setUsedAt(now);
        user.setVerified(true);
        codeRepository.save(verificationCode);
        return userRepository.save(user);
    }

    @Transactional
    public String sendPasswordResetCode(String email) {
        return sendPasswordResetCode(email, "email");
    }

    @Transactional
    public String sendPasswordResetCode(String email, String verificationMethod) {
        User user = findUserByEmail(email);
        String destinationEmail = resolveVerificationEmail(user, verificationMethod);
        String code = createCode(user, PURPOSE_PASSWORD_RESET);
        sendEmailToAddress(
                destinationEmail,
                "Your EverCare password reset code",
                passwordResetEmailBody(user, code),
                code
        );
        return destinationEmail;
    }

    @Transactional
    public User resetPassword(String email, String code, String newPassword) {
        User user = findUserByEmail(email);
        validateStrongPassword(newPassword);
        EmailVerificationCode verificationCode = validateCode(user, code, PURPOSE_PASSWORD_RESET);

        verificationCode.setUsedAt(LocalDateTime.now());
        codeRepository.save(verificationCode);
        keycloakAdminClient.resetPassword(user.getKeycloakId(), newPassword);
        return user;
    }

    @Transactional
    public String sendEmailChangePhoneCode(String currentEmail, String newEmail, String phoneNumber) {
        return sendEmailChangeCode(currentEmail, newEmail, "phone", phoneNumber);
    }

    @Transactional
    public String sendEmailChangeCode(String currentEmail, String newEmail, String verificationMethod, String phoneNumber) {
        User user = findUserByEmail(currentEmail);
        String requestedEmail = normalizeEmail(newEmail);
        String method = normalizeVerificationMethod(verificationMethod);
        if (requestedEmail.isBlank()) {
            throw new RuntimeException("Enter the new email address");
        }
        if (requestedEmail.equalsIgnoreCase(user.getEmail())) {
            throw new RuntimeException("Enter a different email address");
        }
        if (userRepository.findByEmailIgnoreCase(requestedEmail)
                .filter(existing -> !existing.getUserId().equals(user.getUserId()))
                .isPresent()) {
            throw new RuntimeException("Email already in use");
        }
        if ("phone".equals(method)) {
            String destinationPhone = normalizePhone(phoneNumber);
            if (destinationPhone.isBlank()) {
                destinationPhone = normalizePhone(user.getPhone());
            }
            if (destinationPhone.isBlank()) {
                throw new RuntimeException("Add a phone number or enter another phone number for verification.");
            }
            if (!isValidPhone(destinationPhone)) {
                throw new RuntimeException("Enter a valid phone number with country code.");
            }
            EmailVerificationCode verificationCode = createVerificationCode(user, purposeForEmailChange(method));
            try {
                sendPhoneCode(user, verificationCode.getCode(), requestedEmail, destinationPhone);
            } catch (RuntimeException ex) {
                verificationCode.setUsedAt(LocalDateTime.now());
                codeRepository.save(verificationCode);
                throw ex;
            }
            return destinationPhone;
        }

        String destinationEmail = resolveVerificationEmail(user, method);
        String code = createCode(user, purposeForEmailChange(method));
        sendEmailToAddress(
                destinationEmail,
                "Your EverCare email change code",
                emailChangeBody(user, requestedEmail, code),
                code
        );
        return destinationEmail;
    }

    @Transactional
    public User confirmEmailChange(String currentEmail, String newEmail, String code) {
        return confirmEmailChange(currentEmail, newEmail, code, "phone");
    }

    @Transactional
    public User confirmEmailChange(String currentEmail, String newEmail, String code, String verificationMethod) {
        User user = findUserByEmail(currentEmail);
        String requestedEmail = normalizeEmail(newEmail);
        String method = normalizeVerificationMethod(verificationMethod);
        if (requestedEmail.isBlank()) {
            throw new RuntimeException("Enter the new email address");
        }
        if (requestedEmail.equalsIgnoreCase(user.getEmail())) {
            throw new RuntimeException("Enter a different email address");
        }
        if (userRepository.findByEmailIgnoreCase(requestedEmail)
                .filter(existing -> !existing.getUserId().equals(user.getUserId()))
                .isPresent()) {
            throw new RuntimeException("Email already in use");
        }

        EmailVerificationCode verificationCode = validateEmailChangeCode(user, code, purposeForEmailChange(method));
        verificationCode.setUsedAt(LocalDateTime.now());
        codeRepository.save(verificationCode);

        String previousEmail = user.getEmail();
        user.setEmail(requestedEmail);
        user.setVerified(user.getRole() == UserRole.ADMIN);
        if (user.getKeycloakId() != null && !user.getKeycloakId().isBlank()) {
            keycloakAdminClient.updateEmail(user.getKeycloakId(), requestedEmail, user.isVerified());
        }
        updateDoctorAssociationsAfterEmailChange(user, previousEmail, requestedEmail);
        User savedUser = userRepository.save(user);
        communicationReferenceService.updateEmailReferences(previousEmail, requestedEmail);
        return savedUser;
    }

    private void updateDoctorAssociationsAfterEmailChange(User user, String previousEmail, String requestedEmail) {
        if (user.getRole() != UserRole.DOCTOR || previousEmail == null || previousEmail.isBlank()) {
            return;
        }

        userRepository.findAssociatedPatientsByDoctorEmail(previousEmail).forEach(patient -> {
            if (previousEmail.equalsIgnoreCase(patient.getDoctorEmail())) {
                patient.setDoctorEmail(requestedEmail);
            }
            Set<String> doctorEmails = patient.getDoctorEmails() == null
                    ? new HashSet<>()
                    : new HashSet<>(patient.getDoctorEmails());
            doctorEmails.removeIf(email -> email != null && email.equalsIgnoreCase(previousEmail));
            doctorEmails.add(requestedEmail);
            patient.setDoctorEmails(doctorEmails);
            userRepository.save(patient);
        });
    }

    private String createCode(User user, String purpose) {
        return createVerificationCode(user, purpose).getCode();
    }

    private EmailVerificationCode createVerificationCode(User user, String purpose) {
        LocalDateTime now = LocalDateTime.now();
        codeRepository.findTopByUserAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(user, purpose)
                .filter(existing -> existing.getCreatedAt().isAfter(now.minusSeconds(RESEND_COOLDOWN_SECONDS)))
                .ifPresent(existing -> {
                    throw new RuntimeException("Please wait before requesting another code");
                });

        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        EmailVerificationCode verificationCode = EmailVerificationCode.builder()
                .user(user)
                .code(code)
                .purpose(purpose)
                .createdAt(now)
                .expiresAt(now.plusMinutes(CODE_TTL_MINUTES))
                .attempts(0)
                .build();

        return codeRepository.save(verificationCode);
    }

    private EmailVerificationCode validateCode(User user, String code, String purpose) {
        String normalizedCode = code == null ? "" : code.trim();
        if (!normalizedCode.matches("\\d{6}")) {
            throw new RuntimeException("Enter the 6-digit code");
        }

        EmailVerificationCode verificationCode = codeRepository.findTopByUserAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(user, purpose)
                .orElseThrow(() -> new RuntimeException("No active code. Please request a new one."));

        LocalDateTime now = LocalDateTime.now();
        if (verificationCode.getExpiresAt().isBefore(now)) {
            verificationCode.setUsedAt(now);
            codeRepository.save(verificationCode);
            throw new RuntimeException("Code expired. Please request a new one.");
        }

        if (verificationCode.getAttempts() >= MAX_ATTEMPTS) {
            verificationCode.setUsedAt(now);
            codeRepository.save(verificationCode);
            throw new RuntimeException("Too many attempts. Please request a new code.");
        }

        if (!verificationCode.getCode().equals(normalizedCode)) {
            verificationCode.setAttempts(verificationCode.getAttempts() + 1);
            codeRepository.save(verificationCode);
            throw new RuntimeException("Invalid code");
        }

        return verificationCode;
    }

    private EmailVerificationCode validateEmailChangeCode(User user, String code, String preferredPurpose) {
        RuntimeException lastError = null;
        Set<String> purposes = new LinkedHashSet<>();
        purposes.add(preferredPurpose);
        purposes.add(PURPOSE_EMAIL_CHANGE_PHONE);
        purposes.add(PURPOSE_EMAIL_CHANGE_EMAIL);
        purposes.add(PURPOSE_EMAIL_CHANGE_RECOVERY);

        for (String purpose : purposes) {
            try {
                return validateCode(user, code, purpose);
            } catch (RuntimeException ex) {
                lastError = ex;
            }
        }

        throw lastError != null ? lastError : new RuntimeException("Invalid code");
    }

    private void validateStrongPassword(String newPassword) {
        String password = newPassword == null ? "" : newPassword;
        boolean strong = password.length() >= 8
                && password.matches(".*[a-z].*")
                && password.matches(".*[A-Z].*")
                && password.matches(".*\\d.*")
                && password.matches(".*[^A-Za-z0-9].*");
        if (!strong) {
            throw new RuntimeException("Password must include uppercase, lowercase, number, symbol, and be at least 8 characters");
        }
    }

    private User findUserByEmail(String email) {
        String normalizedEmail = normalizeEmail(email);
        if (normalizedEmail.isBlank()) {
            throw new RuntimeException("Please sign in again before verifying your email");
        }

        return userRepository.findByEmailIgnoreCase(normalizedEmail)
                .orElseThrow(() -> new RuntimeException("User not found for email verification"));
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private String normalizeVerificationMethod(String method) {
        String normalized = method == null ? "" : method.trim().toLowerCase(Locale.ROOT);
        if (normalized.equals("recovery") || normalized.equals("recovery_email")) {
            return "recovery-email";
        }
        if (normalized.equals("sms")) {
            return "phone";
        }
        if (normalized.isBlank()) {
            return "email";
        }
        if (!normalized.equals("phone") && !normalized.equals("email") && !normalized.equals("recovery-email")) {
            throw new RuntimeException("Choose phone, account email, or recovery email verification.");
        }
        return normalized;
    }

    private String purposeForEmailChange(String method) {
        return switch (method) {
            case "phone" -> PURPOSE_EMAIL_CHANGE_PHONE;
            case "recovery-email" -> PURPOSE_EMAIL_CHANGE_RECOVERY;
            default -> PURPOSE_EMAIL_CHANGE_EMAIL;
        };
    }

    private String resolveVerificationEmail(User user, String verificationMethod) {
        String method = normalizeVerificationMethod(verificationMethod);
        if ("recovery-email".equals(method)) {
            String recoveryEmail = effectiveRecoveryEmail(user);
            if (recoveryEmail.isBlank()) {
                throw new RuntimeException("Add a recovery email before using recovery verification.");
            }
            return recoveryEmail;
        }
        return user.getEmail();
    }

    private String effectiveRecoveryEmail(User user) {
        String manualRecovery = normalizeEmail(user.getRecoveryEmail());
        if (!manualRecovery.isBlank()) {
            return manualRecovery;
        }
        if (user.getRole() == UserRole.PATIENT && user.getCaregivers() != null) {
            return user.getCaregivers().stream()
                    .map(User::getEmail)
                    .map(this::normalizeEmail)
                    .filter(email -> !email.isBlank())
                    .findFirst()
                    .orElse("");
        }
        return "";
    }

    private String normalizePhone(String phone) {
        String value = phone == null ? "" : phone.trim();
        if (value.isBlank()) {
            return "";
        }
        String digits = value.replaceAll("\\D", "");
        return value.startsWith("+") ? "+" + digits : digits;
    }

    private boolean isValidPhone(String phone) {
        String digits = phone.replaceAll("\\D", "");
        return phone.startsWith("+") && digits.length() >= 8 && digits.length() <= 15;
    }

    private void sendPhoneCode(User user, String code, String requestedEmail, String destinationPhone) {
        smsVerificationService.sendSms(
                destinationPhone,
                "EverCare verification code: %s. Use it to change your email to %s. It expires in %d minutes."
                        .formatted(code, requestedEmail, CODE_TTL_MINUTES)
        );
    }

    private String passwordResetEmailBody(User user, String code) {
        return """
                Hi %s,

                Your EverCare password reset code is: %s

                This code expires in %d minutes.
                If you did not request a password reset, you can ignore this email.

                EverCare Team
                """.formatted(user.getName(), code, CODE_TTL_MINUTES);
    }

    private String emailChangeBody(User user, String requestedEmail, String code) {
        return """
                Hi %s,

                Your EverCare email change code is: %s

                This code confirms changing your account email to %s.
                It expires in %d minutes.
                If you did not request this, please secure your account.

                EverCare Team
                """.formatted(user.getName(), code, requestedEmail, CODE_TTL_MINUTES);
    }

    private void sendEmailToAddress(String toEmail, String subject, String body, String fallbackCode) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("{} for {} is {}. Configure spring.mail.* to send real email.", subject, toEmail, fallbackCode);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(toEmail);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception ex) {
            log.warn("Could not send {} to {}. Code is {}. Reason: {}",
                    subject, toEmail, fallbackCode, ex.getMessage());
            throw new RuntimeException("Could not send email verification code. Please try another method.");
        }
    }

    private void sendEmail(User user, String subject, String body, String fallbackCode) {
        JavaMailSender mailSender = mailSenderProvider.getIfAvailable();
        if (mailSender == null) {
            log.warn("{} for {} is {}. Configure spring.mail.* to send real email.", subject, user.getEmail(), fallbackCode);
            return;
        }

        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(mailFrom);
            message.setTo(user.getEmail());
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
        } catch (Exception ex) {
            log.warn("Could not send {} to {}. Code is {}. Reason: {}",
                    subject, user.getEmail(), fallbackCode, ex.getMessage());
        }
    }
}
