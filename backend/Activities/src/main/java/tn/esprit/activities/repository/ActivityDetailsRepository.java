package tn.esprit.activities.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.esprit.activities.entity.ActivityDetails;
import java.util.List;

public interface ActivityDetailsRepository extends JpaRepository<ActivityDetails, String> {
    List<ActivityDetails> findByActivityId(String activityId);
}