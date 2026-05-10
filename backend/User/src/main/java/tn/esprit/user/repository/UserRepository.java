package tn.esprit.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import tn.esprit.user.entity.User;
import java.util.Optional;
import org.springframework.data.repository.query.Param;
import tn.esprit.user.entity.UserRole;
import java.util.List;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailIgnoreCase(String email);
    Optional<User> findByKeycloakId(String keycloakId);   // NEW
    boolean existsByEmail(String email);
    @Query("SELECT u FROM User u WHERE u.role = :role AND (LOWER(u.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<User> searchByRoleAndQuery(@Param("query") String query, @Param("role") UserRole role);
    List<User> findByDoctorEmail(String doctorEmail);
    List<User> findByDoctorEmailIgnoreCase(String doctorEmail);

    @Query(value = """
            SELECT DISTINCT u.*
            FROM users u
            LEFT JOIN patient_doctor_emails associated_doctors
              ON associated_doctors.patient_id COLLATE utf8mb4_general_ci = u.user_id COLLATE utf8mb4_general_ci
            WHERE u.role = 'PATIENT'
              AND (
                LOWER(u.doctor_email) = LOWER(:doctorEmail)
                OR LOWER(associated_doctors.doctor_email COLLATE utf8mb4_general_ci) = LOWER(:doctorEmail)
              )
            """, nativeQuery = true)
    List<User> findAssociatedPatientsByDoctorEmail(@Param("doctorEmail") String doctorEmail);

}
