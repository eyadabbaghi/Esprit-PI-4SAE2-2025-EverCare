package tn.esprit.notification.repository;

import tn.esprit.notification.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, String> {
    List<Notification> findByActivityIdOrderByTimestampDesc(String activityId);
    List<Notification> findAllByOrderByTimestampDesc();
}