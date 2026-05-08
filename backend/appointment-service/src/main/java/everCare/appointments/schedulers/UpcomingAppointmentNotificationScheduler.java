package everCare.appointments.schedulers;

import everCare.appointments.dtos.NotificationRequest;
import everCare.appointments.dtos.UserSimpleDTO;
import everCare.appointments.entities.Appointment;
import everCare.appointments.feign.NotificationFeignClient;
import everCare.appointments.feign.UserFeignClient;
import everCare.appointments.repositories.AppointmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Slf4j
public class UpcomingAppointmentNotificationScheduler {

    private static final DateTimeFormatter REMINDER_TIME_FORMAT = DateTimeFormatter.ofPattern("MMM d, h:mm a");

    private final AppointmentRepository appointmentRepository;
    private final NotificationFeignClient notificationFeignClient;
    private final UserFeignClient userFeignClient;

    @Scheduled(cron = "0 * * * * *")
    public void sendUpcomingAppointmentNotifications() {
        LocalDateTime windowStart = LocalDateTime.now().plusMinutes(30).withSecond(0).withNano(0);
        LocalDateTime windowEnd = windowStart.plusMinutes(1);

        List<Appointment> upcomingAppointments =
                appointmentRepository.findUpcomingReminderAppointments(windowStart, windowEnd);

        upcomingAppointments.forEach(this::sendNotificationsForAppointment);
    }

    private void sendNotificationsForAppointment(Appointment appointment) {
        UserSimpleDTO patient = getUser(appointment.getPatientId());
        UserSimpleDTO doctor = getUser(appointment.getDoctorId());
        Set<String> caregiverIds = getCaregiverIdsForAppointment(appointment);

        String appointmentTime = appointment.getStartDateTime() == null
                ? "soon"
                : appointment.getStartDateTime().format(REMINDER_TIME_FORMAT);

        sendNotification(
                appointment,
                appointment.getPatientId(),
                "Upcoming appointment with " + displayName(doctor, "your doctor") + " at " + appointmentTime
        );

        sendNotification(
                appointment,
                appointment.getDoctorId(),
                "Upcoming appointment with " + displayName(patient, "your patient") + " at " + appointmentTime
        );

        for (String caregiverId : caregiverIds) {
            sendNotification(
                    appointment,
                    caregiverId,
                    "Upcoming appointment for " + displayName(patient, "your patient")
                            + " with " + displayName(doctor, "their doctor")
                            + " at " + appointmentTime
            );
        }
    }

    private void sendNotification(Appointment appointment, String targetUserId, String details) {
        if (targetUserId == null || targetUserId.isBlank()) return;

        try {
            NotificationRequest request = NotificationRequest.builder()
                    .activityId(appointment.getAppointmentId())
                    .action("UPCOMING_APPOINTMENT")
                    .details(details)
                    .targetUserIds(List.of(targetUserId))
                    .build();

            notificationFeignClient.sendNotification(request);
            log.info("Upcoming appointment notification sent for appointment {} to user {}",
                    appointment.getAppointmentId(), targetUserId);
        } catch (Exception e) {
            log.warn("Failed to send upcoming appointment notification for appointment {} to user {}: {}",
                    appointment.getAppointmentId(), targetUserId, e.getMessage());
        }
    }

    private UserSimpleDTO getUser(String userId) {
        if (userId == null || userId.isBlank()) return null;

        try {
            return userFeignClient.getUserById(userId);
        } catch (Exception e) {
            log.warn("Failed to load user {} for appointment notification: {}", userId, e.getMessage());
            return null;
        }
    }

    private Set<String> getCaregiverIdsForAppointment(Appointment appointment) {
        Set<String> caregiverIds = new LinkedHashSet<>();

        if (appointment.getCaregiverId() != null && !appointment.getCaregiverId().isBlank()) {
            caregiverIds.add(appointment.getCaregiverId());
        }

        try {
            List<UserSimpleDTO> caregivers = userFeignClient.getCaregiversByPatientId(appointment.getPatientId());
            if (caregivers != null) {
                caregiverIds.addAll(caregivers.stream()
                        .map(UserSimpleDTO::getUserId)
                        .filter(id -> id != null && !id.isBlank())
                        .collect(Collectors.toList()));
            }
        } catch (Exception e) {
            log.warn("Failed to load caregivers for patient {}: {}", appointment.getPatientId(), e.getMessage());
        }

        return caregiverIds;
    }

    private String displayName(UserSimpleDTO user, String fallback) {
        if (user == null || user.getName() == null || user.getName().isBlank()) {
            return fallback;
        }

        return user.getName();
    }
}
