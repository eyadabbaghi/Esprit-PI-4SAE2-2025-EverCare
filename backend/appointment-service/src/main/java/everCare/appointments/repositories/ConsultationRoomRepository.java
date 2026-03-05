package everCare.appointments.repositories;

import everCare.appointments.entities.ConsultationRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface ConsultationRoomRepository extends JpaRepository<ConsultationRoom, String> {
    Optional<ConsultationRoom> findByAppointment_AppointmentId(String appointmentId);
    void deleteByAppointment_AppointmentId(String appointmentId);
}