package everCare.appointments.repositories;

import everCare.appointments.entities.ConsultationType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ConsultationTypeRepository extends JpaRepository<ConsultationType, String> {

    // Find by name
    ConsultationType findByName(String name);

    // Find active types
    List<ConsultationType> findByActiveTrue();

    // Find types requiring caregiver
    List<ConsultationType> findByRequiresCaregiverTrue();

    // Find by duration range
    List<ConsultationType> findByDefaultDurationMinutesLessThanEqual(int minutes);

    // Search by description containing text
    List<ConsultationType> findByDescriptionContainingIgnoreCase(String keyword);
}