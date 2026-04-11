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
    Optional<User> findByKeycloakId(String keycloakId);   // NEW
    boolean existsByEmail(String email);
    @Query("SELECT u FROM User u WHERE u.role = :role AND (LOWER(u.name) LIKE LOWER(CONCAT('%', :query, '%')) OR LOWER(u.email) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<User> searchByRoleAndQuery(@Param("query") String query, @Param("role") UserRole role);
    List<User> findByDoctorEmail(String doctorEmail);

}