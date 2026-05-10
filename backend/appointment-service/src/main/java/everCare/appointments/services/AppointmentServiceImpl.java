/**
 * AppointmentServiceImpl - Service implementation for Appointment operations.
 * 
 * CHANGED: Replaced UserRepository with UserFeignClient.
 * User validation is now done via Feign client to User microservice.
 * Appointment entity now uses String IDs instead of User objects.
 */
package everCare.appointments.services;

import everCare.appointments.entities.Appointment;
import everCare.appointments.entities.ConsultationType;
import everCare.appointments.exceptions.ResourceNotFoundException;
import everCare.appointments.feign.UserFeignClient;
import everCare.appointments.dtos.UserSimpleDTO;
import everCare.appointments.repositories.AppointmentRepository;
import everCare.appointments.repositories.ConsultationTypeRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AppointmentServiceImpl implements AppointmentService {

    private final AppointmentRepository appointmentRepository;
    private final UserFeignClient userFeignClient;
    private final ConsultationTypeRepository consultationTypeRepository;

    // ========== CREATE ==========

    @Override
    public Appointment createAppointment(Appointment appointment) {
        if (appointment.getAppointmentId() == null) {
            appointment.setAppointmentId(UUID.randomUUID().toString());
        }
        appointment.setCreatedAt(LocalDateTime.now());

        // Validate patient exists via Feign
        if (appointment.getPatientId() == null || appointment.getPatientId().isBlank()) {
            throw new ResourceNotFoundException("Patient is required");
        }
        UserSimpleDTO patient = userFeignClient.getUserById(appointment.getPatientId());
        if (patient == null) {
            throw new ResourceNotFoundException("Patient not found with id: " + appointment.getPatientId());
        }

        // Validate doctor exists via Feign
        if (appointment.getDoctorId() == null || appointment.getDoctorId().isBlank()) {
            throw new ResourceNotFoundException("Doctor is required");
        }
        UserSimpleDTO doctor = userFeignClient.getUserById(appointment.getDoctorId());
        if (doctor == null) {
            throw new ResourceNotFoundException("Doctor not found with id: " + appointment.getDoctorId());
        }

        // Validate caregiver if provided
        if (appointment.getCaregiverId() != null && !appointment.getCaregiverId().isBlank()) {
            UserSimpleDTO caregiver = userFeignClient.getUserById(appointment.getCaregiverId());
            if (caregiver == null) {
                throw new ResourceNotFoundException("Caregiver not found with id: " + appointment.getCaregiverId());
            }
        }

        // Load consultation type
        if (appointment.getConsultationType() != null && appointment.getConsultationType().getTypeId() != null) {
            ConsultationType consultationType = consultationTypeRepository.findById(appointment.getConsultationType().getTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Consultation type not found with id: " + appointment.getConsultationType().getTypeId()));
            appointment.setConsultationType(consultationType);
        } else {
            throw new ResourceNotFoundException("Consultation type is required");
        }

        // Calculate end time based on consultation type duration
        if (appointment.getConsultationType() != null && appointment.getStartDateTime() != null) {
            ConsultationType type = appointment.getConsultationType();
            appointment.setEndDateTime(appointment.getStartDateTime()
                .plusMinutes(type.getDefaultDurationMinutes()));
        }

        // Generate an in-app video room route. The frontend hosts the actual Jitsi room page.
        if (appointment.getVideoLink() == null) {
            appointment.setVideoLink("/appointments/video/" + appointment.getAppointmentId());
        }

        // Set default status
        if (appointment.getStatus() == null) {
            appointment.setStatus("SCHEDULED");
        }

        return appointmentRepository.save(appointment);
    }

    // ========== READ ==========

    @Override
    public List<Appointment> getAllAppointments() {
        return appointmentRepository.findAll();
    }

    @Override
    public Appointment getAppointmentById(String id) {
        return appointmentRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Appointment not found with id: " + id));
    }

    @Override
    public List<Appointment> getAppointmentsByPatient(String patientId) {
        return appointmentRepository.findByPatientId(patientId);
    }

    @Override
    public List<Appointment> getAppointmentsByDoctor(String doctorId) {
        return appointmentRepository.findByDoctorId(doctorId);
    }

    @Override
    public List<Appointment> getAppointmentsByCaregiver(String caregiverId) {
        return appointmentRepository.findByCaregiverId(caregiverId);
    }

    @Override
    public List<Appointment> getAppointmentsByStatus(String status) {
        return appointmentRepository.findByStatus(status);
    }

    @Override
    public List<Appointment> getAppointmentsByDateRange(LocalDateTime start, LocalDateTime end) {
        return appointmentRepository.findByStartDateTimeBetween(start, end);
    }

    @Override
    public List<Appointment> getAppointmentsByDoctorAndDateRange(String doctorId, LocalDateTime start, LocalDateTime end) {
        return appointmentRepository.findByDoctorIdAndStartDateTimeBetween(doctorId, start, end);
    }

    @Override
    public List<Appointment> getFutureAppointmentsByPatient(String patientId) {
        return appointmentRepository.findFutureByPatientId(patientId, LocalDateTime.now());
    }

    @Override
    public boolean isDoctorAvailable(String doctorId, LocalDateTime dateTime) {
        validateUserExists(doctorId, "Doctor");
        int count = appointmentRepository.countByDoctorIdAndDateTime(doctorId, dateTime);
        return count == 0;
    }

    // ========== UPDATE ==========

    @Override
    public Appointment updateAppointment(String id, Appointment appointmentDetails) {
        Appointment existingAppointment = getAppointmentById(id);

        if (appointmentDetails.getStartDateTime() != null) {
            existingAppointment.setStartDateTime(appointmentDetails.getStartDateTime());
            if (existingAppointment.getConsultationType() != null) {
                existingAppointment.setEndDateTime(appointmentDetails.getStartDateTime()
                    .plusMinutes(existingAppointment.getConsultationType().getDefaultDurationMinutes()));
            }
        }

        if (appointmentDetails.getStatus() != null) {
            existingAppointment.setStatus(appointmentDetails.getStatus());
        }

        if (appointmentDetails.getCaregiverPresence() != null) {
            existingAppointment.setCaregiverPresence(appointmentDetails.getCaregiverPresence());
        }

        if (appointmentDetails.getDoctorNotes() != null) {
            existingAppointment.setDoctorNotes(appointmentDetails.getDoctorNotes());
        }

        if (appointmentDetails.getSimpleSummary() != null) {
            existingAppointment.setSimpleSummary(appointmentDetails.getSimpleSummary());
        }

        if (appointmentDetails.getCaregiverId() != null && !appointmentDetails.getCaregiverId().isBlank()) {
            validateUserExists(appointmentDetails.getCaregiverId(), "Caregiver");
            existingAppointment.setCaregiverId(appointmentDetails.getCaregiverId());
        }

        if (appointmentDetails.getConsultationType() != null && appointmentDetails.getConsultationType().getTypeId() != null) {
            ConsultationType consultationType = consultationTypeRepository.findById(appointmentDetails.getConsultationType().getTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Consultation type not found"));
            existingAppointment.setConsultationType(consultationType);
        }

        existingAppointment.setUpdatedAt(LocalDateTime.now());

        return appointmentRepository.save(existingAppointment);
    }

    @Override
    public Appointment confirmByPatient(String id) {
        Appointment appointment = getAppointmentById(id);
        appointment.setConfirmationDatePatient(LocalDateTime.now());
        appointment.setStatus("CONFIRMED_BY_PATIENT");
        appointment.setUpdatedAt(LocalDateTime.now());
        return appointmentRepository.save(appointment);
    }

    @Override
    public Appointment confirmByCaregiver(String id) {
        Appointment appointment = getAppointmentById(id);
        appointment.setConfirmationDateCaregiver(LocalDateTime.now());
        appointment.setStatus("CONFIRMED_BY_CAREGIVER");
        appointment.setUpdatedAt(LocalDateTime.now());
        return appointmentRepository.save(appointment);
    }

    @Override
    public Appointment cancelAppointment(String id) {
        Appointment appointment = getAppointmentById(id);
        appointment.setStatus("CANCELLED");
        appointment.setUpdatedAt(LocalDateTime.now());
        return appointmentRepository.save(appointment);
    }

    @Override
    public Appointment rescheduleAppointment(String id, LocalDateTime newDateTime) {
        Appointment appointment = getAppointmentById(id);
        appointment.setStartDateTime(newDateTime);

        if (appointment.getConsultationType() != null) {
            appointment.setEndDateTime(newDateTime
                .plusMinutes(appointment.getConsultationType().getDefaultDurationMinutes()));
        }

        appointment.setStatus("RESCHEDULED");
        appointment.setUpdatedAt(LocalDateTime.now());
        return appointmentRepository.save(appointment);
    }

    @Override
    public Appointment updateDoctorNotes(String id, String notes) {
        Appointment appointment = getAppointmentById(id);
        appointment.setDoctorNotes(notes);
        appointment.setUpdatedAt(LocalDateTime.now());
        return appointmentRepository.save(appointment);
    }

    @Override
    public Appointment updateSimpleSummary(String id, String summary) {
        Appointment appointment = getAppointmentById(id);
        appointment.setSimpleSummary(summary);
        appointment.setUpdatedAt(LocalDateTime.now());
        return appointmentRepository.save(appointment);
    }

    // ========== DELETE ==========

    @Override
    public void deleteAppointment(String id) {
        Appointment appointment = getAppointmentById(id);
        appointmentRepository.delete(appointment);
    }

    @Override
    public void deleteAppointmentsByPatient(String patientId) {
        validateUserExists(patientId, "Patient");
        List<Appointment> appointments = appointmentRepository.findByPatientId(patientId);
        appointmentRepository.deleteAll(appointments);
    }

    // ========== BUSINESS LOGIC ==========

    @Override
    public long countAppointmentsByDoctorAndDate(String doctorId, LocalDateTime date) {
        validateUserExists(doctorId, "Doctor");
        return appointmentRepository.countByDoctorIdAndDateTime(doctorId, date);
    }

    @Override
    public List<Appointment> getAppointmentsNeedingReminder(LocalDateTime reminderTime) {
        LocalDateTime reminderWindowStart = reminderTime.minusHours(24);
        LocalDateTime reminderWindowEnd = reminderTime.plusHours(1);

        return appointmentRepository.findByStartDateTimeBetween(reminderWindowStart, reminderWindowEnd)
            .stream()
            .filter(a -> a.getStatus().equals("SCHEDULED") || a.getStatus().equals("CONFIRMED_BY_PATIENT"))
            .toList();
    }

    @Override
    public void sendReminders() {
        List<Appointment> appointmentsNeedingReminder = getAppointmentsNeedingReminder(LocalDateTime.now());

        for (Appointment appointment : appointmentsNeedingReminder) {
            System.out.println("Sending reminder for appointment: " + appointment.getAppointmentId());
        }
    }

    // ========== HELPER METHODS ==========

    private void validateUserExists(String userId, String userType) {
        UserSimpleDTO user = userFeignClient.getUserById(userId);
        if (user == null) {
            throw new ResourceNotFoundException(userType + " not found with id: " + userId);
        }
    }
}
