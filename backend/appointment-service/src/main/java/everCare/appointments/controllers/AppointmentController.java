package everCare.appointments.controllers;

import everCare.appointments.entities.Appointment;
import everCare.appointments.entities.User;
import everCare.appointments.entities.ConsultationType;
import everCare.appointments.dtos.AppointmentDTO;
import everCare.appointments.dtos.AppointmentResponseDTO;
import everCare.appointments.services.AppointmentService;
import everCare.appointments.repositories.UserRepository;
import everCare.appointments.repositories.ConsultationTypeRepository;
import everCare.appointments.exceptions.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/appointments")
@RequiredArgsConstructor
public class AppointmentController {

    private final AppointmentService appointmentService;
    private final UserRepository userRepository;
    private final ConsultationTypeRepository consultationTypeRepository;

    // ========== CREATE WITH DTO ==========

    @PostMapping
    public ResponseEntity<Appointment> createAppointment(@RequestBody AppointmentDTO appointmentDTO) {
        // Create new appointment entity from DTO
        Appointment appointment = new Appointment();

        // Load and set patient
        if (appointmentDTO.getPatientId() != null) {
            User patient = userRepository.findById(appointmentDTO.getPatientId())
                    .orElseThrow(() -> new ResourceNotFoundException("Patient not found with id: " + appointmentDTO.getPatientId()));
            appointment.setPatient(patient);
        } else {
            throw new ResourceNotFoundException("Patient ID is required");
        }

        // Load and set doctor
        if (appointmentDTO.getDoctorId() != null) {
            User doctor = userRepository.findById(appointmentDTO.getDoctorId())
                    .orElseThrow(() -> new ResourceNotFoundException("Doctor not found with id: " + appointmentDTO.getDoctorId()));
            appointment.setDoctor(doctor);
        } else {
            throw new ResourceNotFoundException("Doctor ID is required");
        }

        // Load and set caregiver (optional)
        if (appointmentDTO.getCaregiverId() != null && !appointmentDTO.getCaregiverId().isEmpty()) {
            User caregiver = userRepository.findById(appointmentDTO.getCaregiverId())
                    .orElse(null);
            appointment.setCaregiver(caregiver);
        }

        // Load and set consultation type
        if (appointmentDTO.getConsultationTypeId() != null) {
            ConsultationType consultationType = consultationTypeRepository.findById(appointmentDTO.getConsultationTypeId())
                    .orElseThrow(() -> new ResourceNotFoundException("Consultation type not found with id: " + appointmentDTO.getConsultationTypeId()));
            appointment.setConsultationType(consultationType);
        } else {
            throw new ResourceNotFoundException("Consultation type ID is required");
        }

        // Set other fields
        appointment.setStartDateTime(appointmentDTO.getStartDateTime());
        appointment.setEndDateTime(appointmentDTO.getEndDateTime());
        appointment.setStatus(appointmentDTO.getStatus() != null ? appointmentDTO.getStatus() : "SCHEDULED");
        appointment.setCaregiverPresence(appointmentDTO.getCaregiverPresence());
        appointment.setVideoLink(appointmentDTO.getVideoLink());
        appointment.setSimpleSummary(appointmentDTO.getSimpleSummary());

        // Set default values for other fields
        appointment.setRecurring(false);

        Appointment createdAppointment = appointmentService.createAppointment(appointment);
        return new ResponseEntity<>(createdAppointment, HttpStatus.CREATED);
    }

    // ========== READ ALL ==========

    @GetMapping
    public ResponseEntity<List<AppointmentResponseDTO>> getAllAppointments() {
        List<Appointment> appointments = appointmentService.getAllAppointments();
        List<AppointmentResponseDTO> dtos = appointments.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    // ========== READ BY ID ==========

    @GetMapping("/{id}")
    public ResponseEntity<AppointmentResponseDTO> getAppointmentById(@PathVariable String id) {
        Appointment appointment = appointmentService.getAppointmentById(id);
        return ResponseEntity.ok(convertToDTO(appointment));
    }

    // ========== READ BY PATIENT - FIXED ==========

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<AppointmentResponseDTO>> getAppointmentsByPatient(@PathVariable String patientId) {
        try {
            System.out.println("🔍 Fetching appointments for patient: " + patientId);

            List<Appointment> appointments = appointmentService.getAppointmentsByPatient(patientId);

            System.out.println("📊 Found " + appointments.size() + " appointments");

            // Convert to DTOs to avoid circular references
            List<AppointmentResponseDTO> dtos = appointments.stream()
                    .map(this::convertToDTO)
                    .collect(Collectors.toList());

            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            System.err.println("❌ Error fetching appointments: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    // ========== READ BY DOCTOR ==========

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<AppointmentResponseDTO>> getAppointmentsByDoctor(@PathVariable String doctorId) {
        List<Appointment> appointments = appointmentService.getAppointmentsByDoctor(doctorId);
        List<AppointmentResponseDTO> dtos = appointments.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    // ========== READ BY CAREGIVER ==========

    @GetMapping("/caregiver/{caregiverId}")
    public ResponseEntity<List<AppointmentResponseDTO>> getAppointmentsByCaregiver(@PathVariable String caregiverId) {
        List<Appointment> appointments = appointmentService.getAppointmentsByCaregiver(caregiverId);
        List<AppointmentResponseDTO> dtos = appointments.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    // ========== READ BY STATUS ==========

    @GetMapping("/status/{status}")
    public ResponseEntity<List<AppointmentResponseDTO>> getAppointmentsByStatus(@PathVariable String status) {
        List<Appointment> appointments = appointmentService.getAppointmentsByStatus(status);
        List<AppointmentResponseDTO> dtos = appointments.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    // ========== READ BY DATE RANGE ==========

    @GetMapping("/date-range")
    public ResponseEntity<List<AppointmentResponseDTO>> getAppointmentsByDateRange(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        List<Appointment> appointments = appointmentService.getAppointmentsByDateRange(start, end);
        List<AppointmentResponseDTO> dtos = appointments.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    // ========== READ BY DOCTOR AND DATE RANGE ==========

    @GetMapping("/doctor/{doctorId}/date-range")
    public ResponseEntity<List<AppointmentResponseDTO>> getAppointmentsByDoctorAndDateRange(
            @PathVariable String doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime end) {
        List<Appointment> appointments = appointmentService.getAppointmentsByDoctorAndDateRange(doctorId, start, end);
        List<AppointmentResponseDTO> dtos = appointments.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    // ========== READ FUTURE APPOINTMENTS BY PATIENT ==========

    @GetMapping("/patient/{patientId}/future")
    public ResponseEntity<List<AppointmentResponseDTO>> getFutureAppointmentsByPatient(@PathVariable String patientId) {
        List<Appointment> appointments = appointmentService.getFutureAppointmentsByPatient(patientId);
        List<AppointmentResponseDTO> dtos = appointments.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    // ========== CHECK DOCTOR AVAILABILITY ==========

    @GetMapping("/check-availability")
    public ResponseEntity<Boolean> checkDoctorAvailability(
            @RequestParam String doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateTime) {
        boolean isAvailable = appointmentService.isDoctorAvailable(doctorId, dateTime);
        return ResponseEntity.ok(isAvailable);
    }

    // ========== UPDATE ==========

    @PutMapping("/{id}")
    public ResponseEntity<AppointmentResponseDTO> updateAppointment(
            @PathVariable String id,
            @RequestBody Appointment appointment) {
        Appointment updatedAppointment = appointmentService.updateAppointment(id, appointment);
        return ResponseEntity.ok(convertToDTO(updatedAppointment));
    }

    // ========== CONFIRM BY PATIENT ==========

    @PatchMapping("/{id}/confirm-patient")
    public ResponseEntity<AppointmentResponseDTO> confirmByPatient(@PathVariable String id) {
        Appointment confirmedAppointment = appointmentService.confirmByPatient(id);
        return ResponseEntity.ok(convertToDTO(confirmedAppointment));
    }

    // ========== CONFIRM BY CAREGIVER ==========

    @PatchMapping("/{id}/confirm-caregiver")
    public ResponseEntity<AppointmentResponseDTO> confirmByCaregiver(@PathVariable String id) {
        Appointment confirmedAppointment = appointmentService.confirmByCaregiver(id);
        return ResponseEntity.ok(convertToDTO(confirmedAppointment));
    }

    // ========== CANCEL APPOINTMENT ==========

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<AppointmentResponseDTO> cancelAppointment(@PathVariable String id) {
        Appointment cancelledAppointment = appointmentService.cancelAppointment(id);
        return ResponseEntity.ok(convertToDTO(cancelledAppointment));
    }

    // ========== RESCHEDULE APPOINTMENT ==========

    @PatchMapping("/{id}/reschedule")
    public ResponseEntity<AppointmentResponseDTO> rescheduleAppointment(
            @PathVariable String id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime newDateTime) {
        Appointment rescheduledAppointment = appointmentService.rescheduleAppointment(id, newDateTime);
        return ResponseEntity.ok(convertToDTO(rescheduledAppointment));
    }

    // ========== UPDATE DOCTOR NOTES ==========

    @PatchMapping("/{id}/notes")
    public ResponseEntity<AppointmentResponseDTO> updateDoctorNotes(
            @PathVariable String id,
            @RequestParam String notes) {
        Appointment updatedAppointment = appointmentService.updateDoctorNotes(id, notes);
        return ResponseEntity.ok(convertToDTO(updatedAppointment));
    }

    // ========== UPDATE SIMPLE SUMMARY ==========

    @PatchMapping("/{id}/summary")
    public ResponseEntity<AppointmentResponseDTO> updateSimpleSummary(
            @PathVariable String id,
            @RequestParam String summary) {
        Appointment updatedAppointment = appointmentService.updateSimpleSummary(id, summary);
        return ResponseEntity.ok(convertToDTO(updatedAppointment));
    }

    // ========== DELETE ==========

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAppointment(@PathVariable String id) {
        appointmentService.deleteAppointment(id);
        return ResponseEntity.noContent().build();
    }

    // ========== DELETE BY PATIENT ==========

    @DeleteMapping("/patient/{patientId}")
    public ResponseEntity<Void> deleteAppointmentsByPatient(@PathVariable String patientId) {
        appointmentService.deleteAppointmentsByPatient(patientId);
        return ResponseEntity.noContent().build();
    }

    // ========== COUNT BY DOCTOR AND DATE ==========

    @GetMapping("/count")
    public ResponseEntity<Long> countAppointmentsByDoctorAndDate(
            @RequestParam String doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime date) {
        long count = appointmentService.countAppointmentsByDoctorAndDate(doctorId, date);
        return ResponseEntity.ok(count);
    }

    // ========== TRIGGER REMINDERS ==========

    @PostMapping("/send-reminders")
    public ResponseEntity<String> sendReminders() {
        appointmentService.sendReminders();
        return ResponseEntity.ok("Reminders sent successfully");
    }

    // ========== HELPER METHOD TO CONVERT TO DTO ==========

    private AppointmentResponseDTO convertToDTO(Appointment appointment) {
        if (appointment == null) return null;

        AppointmentResponseDTO dto = new AppointmentResponseDTO();

        // Basic fields
        dto.setAppointmentId(appointment.getAppointmentId());
        dto.setStartDateTime(appointment.getStartDateTime());
        dto.setEndDateTime(appointment.getEndDateTime());
        dto.setStatus(appointment.getStatus());
        dto.setConfirmationDatePatient(appointment.getConfirmationDatePatient());
        dto.setConfirmationDateCaregiver(appointment.getConfirmationDateCaregiver());
        dto.setCaregiverPresence(appointment.getCaregiverPresence());
        dto.setVideoLink(appointment.getVideoLink());
        dto.setRecurring(appointment.isRecurring());
        dto.setRecurrencePattern(appointment.getRecurrencePattern());
        dto.setDoctorNotes(appointment.getDoctorNotes());
        dto.setSimpleSummary(appointment.getSimpleSummary());
        dto.setCreatedAt(appointment.getCreatedAt());
        dto.setUpdatedAt(appointment.getUpdatedAt());

        // Patient info - only primitive fields, no circular references
        if (appointment.getPatient() != null) {
            dto.setPatientId(appointment.getPatient().getUserId());
            dto.setPatientName(appointment.getPatient().getName());
            dto.setPatientPhoto(appointment.getPatient().getProfilePicture());
        }

        // Doctor info - only primitive fields
        if (appointment.getDoctor() != null) {
            dto.setDoctorId(appointment.getDoctor().getUserId());
            dto.setDoctorName(appointment.getDoctor().getName());
            dto.setDoctorPhoto(appointment.getDoctor().getProfilePicture());
        }

        // Caregiver info - only primitive fields
        if (appointment.getCaregiver() != null) {
            dto.setCaregiverId(appointment.getCaregiver().getUserId());
            dto.setCaregiverName(appointment.getCaregiver().getName());
        }

        // Consultation type info
        if (appointment.getConsultationType() != null) {
            dto.setConsultationTypeId(appointment.getConsultationType().getTypeId());
            dto.setConsultationTypeName(appointment.getConsultationType().getName());
        }

        return dto;
    }
}