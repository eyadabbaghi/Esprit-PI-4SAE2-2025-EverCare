package tn.esprit.user.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.esprit.user.entity.AssessmentEntity;
import java.util.Optional;

public interface AssessmentResultRepository extends JpaRepository<AssessmentEntity, String> {
    Optional<AssessmentEntity> findTopByUserIdOrderByCompletedAtDesc(String userId);
}
