package tn.esprit.activities.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.esprit.activities.entity.ActivityRecommendation;

import java.util.List;

public interface ActivityRecommendationRepository extends JpaRepository<ActivityRecommendation, String> {
    List<ActivityRecommendation> findByPatientId(String patientId);
}