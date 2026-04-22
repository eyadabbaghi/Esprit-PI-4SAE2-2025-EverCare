package tn.esprit.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.esprit.user.entity.User;
import tn.esprit.user.entity.UserRole;

import java.util.Optional;
import java.util.List;

public interface UserRepository extends JpaRepository<User, String> {

    Optional<User> findByEmail(String email);
    boolean existsByEmail(String email);


    List<User> findByRole(UserRole role);
}