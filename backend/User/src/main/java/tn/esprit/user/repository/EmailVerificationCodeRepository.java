package tn.esprit.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.esprit.user.entity.EmailVerificationCode;
import tn.esprit.user.entity.User;

import java.util.Optional;

public interface EmailVerificationCodeRepository extends JpaRepository<EmailVerificationCode, Long> {
    Optional<EmailVerificationCode> findTopByUserAndUsedAtIsNullOrderByCreatedAtDesc(User user);
    Optional<EmailVerificationCode> findTopByUserAndPurposeAndUsedAtIsNullOrderByCreatedAtDesc(User user, String purpose);
}
