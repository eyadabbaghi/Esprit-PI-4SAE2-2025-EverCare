package everCare.appointments.schedulers;

import everCare.appointments.dtos.NotificationRequest;
import everCare.appointments.dtos.UserSimpleDTO;
import everCare.appointments.entities.Appointment;
import everCare.appointments.feign.NotificationFeignClient;
import everCare.appointments.feign.UserFeignClient;
import everCare.appointments.repositories.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
public class PreConsultationScheduler {

    private final AppointmentRepository appointmentRepository;
    private final NotificationFeignClient notificationFeignClient;
    private final UserFeignClient userFeignClient;

    @Scheduled(cron = "0 0 * * * *")
    public void triggerPreConsultationNotifications() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        LocalDateTime startOfDay = tomorrow.atStartOfDay();
        LocalDateTime endOfDay = tomorrow.atTime(LocalTime.MAX);

        List<Appointment> tomorrowAppointments = appointmentRepository.findTomorrowAppointments(startOfDay, endOfDay);

        for (Appointment appointment : tomorrowAppointments) {
            sendPreConsultationNotification(appointment);
        }
    }

    private void sendPreConsultationNotification(Appointment appointment) {
        try {
            List<String> caregiverIds = getCaregiverIdsForPatient(appointment.getPatientId());

            if (caregiverIds.isEmpty()) {
                System.out.println("No caregivers found for patient: " + appointment.getPatientId());
                return;
            }

            NotificationRequest request = NotificationRequest.builder()
                    .activityId(appointment.getAppointmentId())
                    .action("PRE_CONSULTATION_FORM")
                    .details("Please submit clinical measurements for tomorrow's appointment at " + appointment.getStartDateTime())
                    .targetUserIds(caregiverIds)
                    .build();

            notificationFeignClient.sendNotification(request);
            System.out.println("Pre-consultation notification sent for appointment: " + appointment.getAppointmentId());
        } catch (Exception e) {
            System.err.println("Failed to send pre-consultation notification: " + e.getMessage());
        }
    }

    private List<String> getCaregiverIdsForPatient(String patientId) {
        try {
            List<UserSimpleDTO> caregivers = userFeignClient.getCaregiversByPatientId(patientId);
            if (caregivers != null) {
                return caregivers.stream()
                        .map(UserSimpleDTO::getUserId)
                        .collect(Collectors.toList());
            }
        } catch (Exception e) {
            System.err.println("Failed to get caregivers: " + e.getMessage());
        }
        return List.of();
    }
}