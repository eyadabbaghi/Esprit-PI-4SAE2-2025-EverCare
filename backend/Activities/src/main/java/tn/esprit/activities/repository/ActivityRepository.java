package tn.esprit.activities.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import tn.esprit.activities.entity.Activity;

public interface ActivityRepository extends JpaRepository<Activity, String> {
}