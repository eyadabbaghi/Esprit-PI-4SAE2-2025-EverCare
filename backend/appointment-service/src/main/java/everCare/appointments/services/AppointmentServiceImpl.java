package everCare.appointments.services;

import everCare.appointments.entities.Appointment;
import everCare.appointments.entities.User;
import everCare.appointments.entities.ConsultationType;
import everCare.appointments.exceptions.ResourceNotFoundException;
import everCare.appointments.repositories.AppointmentRepository;
import everCare.appointments.repositories.UserRepository;
import everCare.appointments.repositories.ConsultationTypeRepository;
import everCare.appointments.services.AppointmentService;
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
    private final UserRepository userRepository;
    private final ConsultationTypeRepository consultationTypeRepository;

    // ========== CREATE ==========

    @Override
    public Appointment createAppointment(Appointment appointment) {
        // Generate ID if not present
        if (appointment.getAppointmentId() == null) {
            appointment.setAppointmentId(UUID.randomUUID().toString());
        }

        // Set creation timestamp
        appointment.setCreatedAt(LocalDateTime.now());

        // ========== FIX: Load actual entities from database ==========

        // Load patient from database
        if (appointment.getPatient() != null && appointment.getPatient().getUserId() != null) {
            User patient = userRepository.findById(appointment.getPatient().getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + appointment.getPatient().getUserId()));
            appointment.setPatient(patient);
        } else {
            throw new ResourceNotFoundException("Patient is required");
        }

        // Load doctor from database
        if (appointment.getDoctor() != null && appointment.getDoctor().getUserId() != null) {
            User doctor = userRepository.findById(appointment.getDoctor().getUserId())
                    .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + appointment.getDoctor().getUserId()));
            appointment.setDoctor(doctor);
        } else {
            throw new ResourceNotFoundException("Doctor is required");
        }

        // Load caregiver if present
        if (appointment.getCaregiver() != null && appointment.getCaregiver().getUserId() != null) {
            User caregiver = userRepository.findById(appointment.getCaregiver().getUserId())
                    .orElse(null); // Caregiver is optional
            appointment.setCaregiver(caregiver);
        }

        // Load consultation type
        if (appointment.getConsultationType() != null && appointment.getConsultationType().getTypeId() != null) {
            ConsultationType consultationType = consultationTypeRepository.findById(appointment.getConsultationType().getTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Consultation type not found with id: " + appointment.getConsultationType().getTypeId()));
            appointment.setConsultationType(consultationType);
        } else {
            throw new ResourceNotFoundException("Consultation type is required");
        }

        // ========== END OF FIX ==========

        // Calculate end time based on consultation type duration
        if (appointment.getConsultationType() != null && appointment.getStartDateTime() != null) {
            ConsultationType type = appointment.getConsultationType();
            appointment.setEndDateTime(appointment.getStartDateTime()
                    .plusMinutes(type.getDefaultDurationMinutes()));
        }

        // Generate video link
        if (appointment.getVideoLink() == null && appointment.getPatient() != null && appointment.getDoctor() != null) {
            String patientId = appointment.getPatient().getUserId().length() >= 8
                    ? appointment.getPatient().getUserId().substring(0, 8)
                    : appointment.getPatient().getUserId();
            String doctorId = appointment.getDoctor().getUserId().length() >= 8
                    ? appointment.getDoctor().getUserId().substring(0, 8)
                    : appointment.getDoctor().getUserId();
            appointment.setVideoLink("https://consult.evercare.com/room/" + doctorId + "-" + patientId);
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
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + patientId));
        return appointmentRepository.findByPatient(patient);
    }

    @Override
    public List<Appointment> getAppointmentsByDoctor(String doctorId) {
        User doctor = userRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + doctorId));
        return appointmentRepository.findByDoctor(doctor);
    }

    @Override
    public List<Appointment> getAppointmentsByCaregiver(String caregiverId) {
        User caregiver = userRepository.findById(caregiverId)
                .orElseThrow(() -> new ResourceNotFoundException("Caregiver not found with id: " + caregiverId));
        return appointmentRepository.findByCaregiver(caregiver);
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
        User doctor = userRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + doctorId));
        return appointmentRepository.findByDoctorAndStartDateTimeBetween(doctor, start, end);
    }

    @Override
    public List<Appointment> getFutureAppointmentsByPatient(String patientId) {
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + patientId));
        return appointmentRepository.findFutureByPatient(patient, LocalDateTime.now());
    }

    @Override
    public boolean isDoctorAvailable(String doctorId, LocalDateTime dateTime) {
        User doctor = userRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + doctorId));
        int count = appointmentRepository.countByDoctorAndDateTime(doctor, dateTime);
        return count == 0;
    }

    // ========== UPDATE ==========

    @Override
    public Appointment updateAppointment(String id, Appointment appointmentDetails) {
        Appointment existingAppointment = getAppointmentById(id);

        if (appointmentDetails.getStartDateTime() != null) {
            existingAppointment.setStartDateTime(appointmentDetails.getStartDateTime());
            // Recalculate end time
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

        // Load caregiver if provided
        if (appointmentDetails.getCaregiver() != null && appointmentDetails.getCaregiver().getUserId() != null) {
            User caregiver = userRepository.findById(appointmentDetails.getCaregiver().getUserId())
                    .orElse(null);
            existingAppointment.setCaregiver(caregiver);
        }

        // Load consultation type if provided
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

        // Recalculate end time
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
        User patient = userRepository.findById(patientId)
                .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + patientId));
        List<Appointment> appointments = appointmentRepository.findByPatient(patient);
        appointmentRepository.deleteAll(appointments);
    }

    // ========== BUSINESS LOGIC ==========

    @Override
    public long countAppointmentsByDoctorAndDate(String doctorId, LocalDateTime date) {
        User doctor = userRepository.findById(doctorId)
                .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + doctorId));
        return appointmentRepository.countByDoctorAndDateTime(doctor, date);
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


}