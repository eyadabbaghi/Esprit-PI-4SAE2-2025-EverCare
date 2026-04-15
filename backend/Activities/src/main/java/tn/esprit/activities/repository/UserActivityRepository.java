package tn.esprit.activities.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.esprit.activities.entity.UserActivity;
import java.util.List;
import java.util.Optional;

public interface UserActivityRepository extends JpaRepository<UserActivity, String> {
    List<UserActivity> findByUserId(String userId);
    Optional<UserActivity> findByUserIdAndActivityId(String userId, String activityId);
    void deleteByUserIdAndActivityId(String userId, String activityId);
}