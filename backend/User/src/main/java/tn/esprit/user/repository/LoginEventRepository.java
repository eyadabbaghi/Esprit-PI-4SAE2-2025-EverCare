package tn.esprit.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.esprit.user.entity.LoginEvent;
import java.time.LocalDateTime;
import java.util.List;

public interface LoginEventRepository extends JpaRepository<LoginEvent, String> {
    List<LoginEvent> findByUserIdOrderByLoginAtDesc(String userId);
    List<LoginEvent> findByEmailOrderByLoginAtDesc(String email);
    LoginEvent findTopByUserIdOrderByLoginAtDesc(String userId);
    List<LoginEvent> findByUserIdAndLoginAtAfterOrderByLoginAtDesc(String userId, LocalDateTime after);
}