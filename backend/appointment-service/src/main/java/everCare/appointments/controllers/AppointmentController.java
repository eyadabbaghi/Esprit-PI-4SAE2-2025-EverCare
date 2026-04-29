/**
 * AppointmentController - REST controller for appointment endpoints.
 * 
 * CHANGED: Replaced UserRepository with UserFeignClient for user validation.
 * Uses String IDs for patient/doctor/caregiver instead of User entities.
 */
package everCare.appointments.controllers;

import everCare.appointments.entities.Appointment;
import everCare.appointments.entities.ConsultationType;
import everCare.appointments.dtos.AppointmentDTO;
import everCare.appointments.dtos.AppointmentResponseDTO;
import everCare.appointments.feign.UserFeignClient;
import everCare.appointments.services.AppointmentService;
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
    private final UserFeignClient userFeignClient;
    private final ConsultationTypeRepository consultationTypeRepository;

    @PostMapping
    public ResponseEntity<Appointment> createAppointment(@RequestBody AppointmentDTO appointmentDTO) {
        Appointment appointment = new Appointment();

        // Validate and set patient ID
        if (appointmentDTO.getPatientId() != null && !appointmentDTO.getPatientId().isBlank()) {
            var patient = userFeignClient.getUserById(appointmentDTO.getPatientId());
            if (patient == null) {
                throw new ResourceNotFoundException("Patient not found with id: " + appointmentDTO.getPatientId());
            }
            appointment.setPatientId(appointmentDTO.getPatientId());
        } else {
            throw new ResourceNotFoundException("Patient ID is required");
        }

        // Validate and set doctor ID
        if (appointmentDTO.getDoctorId() != null && !appointmentDTO.getDoctorId().isBlank()) {
            var doctor = userFeignClient.getUserById(appointmentDTO.getDoctorId());
            if (doctor == null) {
                throw new ResourceNotFoundException("Doctor not found with id: " + appointmentDTO.getDoctorId());
            }
            appointment.setDoctorId(appointmentDTO.getDoctorId());
        } else {
            throw new ResourceNotFoundException("Doctor ID is required");
        }

        // Set caregiver ID if provided (optional)
        if (appointmentDTO.getCaregiverId() != null && !appointmentDTO.getCaregiverId().isEmpty()) {
            var caregiver = userFeignClient.getUserById(appointmentDTO.getCaregiverId());
            if (caregiver != null) {
                appointment.setCaregiverId(appointmentDTO.getCaregiverId());
            }
        }

        // Load consultation type
        if (appointmentDTO.getConsultationTypeId() != null) {
            ConsultationType consultationType = consultationTypeRepository.findById(appointmentDTO.getConsultationTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Consultation type not found"));
            appointment.setConsultationType(consultationType);
        } else {
            throw new ResourceNotFoundException("Consultation type ID is required");
        }

        appointment.setStartDateTime(appointmentDTO.getStartDateTime());
        appointment.setEndDateTime(appointmentDTO.getEndDateTime());
        appointment.setStatus(appointmentDTO.getStatus() != null ? appointmentDTO.getStatus() : "SCHEDULED");
        appointment.setCaregiverPresence(appointmentDTO.getCaregiverPresence());
        appointment.setVideoLink(appointmentDTO.getVideoLink());
        appointment.setSimpleSummary(appointmentDTO.getSimpleSummary());
        appointment.setRecurring(false);

        Appointment createdAppointment = appointmentService.createAppointment(appointment);
        return new ResponseEntity<>(createdAppointment, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<AppointmentResponseDTO>> getAllAppointments() {
        List<Appointment> appointments = appointmentService.getAllAppointments();
        List<AppointmentResponseDTO> dtos = appointments.stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppointmentResponseDTO> getAppointmentById(@PathVariable String id) {
        Appointment appointment = appointmentService.getAppointmentById(id);
        return ResponseEntity.ok(convertToDTO(appointment));
    }

    @GetMapping("/patient/{patientId}")
    public ResponseEntity<List<AppointmentResponseDTO>> getAppointmentsByPatient(@PathVariable String patientId) {
        List<Appointment> appointments = appointmentService.getAppointmentsByPatient(patientId);
        List<AppointmentResponseDTO> dtos = appointments.stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<AppointmentResponseDTO>> getAppointmentsByDoctor(@PathVariable String doctorId) {
        List<Appointment> appointments = appointmentService.getAppointmentsByDoctor(doctorId);
        List<AppointmentResponseDTO> dtos = appointments.stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/caregiver/{caregiverId}")
    public ResponseEntity<List<AppointmentResponseDTO>> getAppointmentsByCaregiver(@PathVariable String caregiverId) {
        List<Appointment> appointments = appointmentService.getAppointmentsByCaregiver(caregiverId);
        List<AppointmentResponseDTO> dtos = appointments.stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<AppointmentResponseDTO>> getAppointmentsByStatus(@PathVariable String status) {
        List<Appointment> appointments = appointmentService.getAppointmentsByStatus(status);
        List<AppointmentResponseDTO> dtos = appointments.stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

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

    @GetMapping("/patient/{patientId}/future")
    public ResponseEntity<List<AppointmentResponseDTO>> getFutureAppointmentsByPatient(@PathVariable String patientId) {
        List<Appointment> appointments = appointmentService.getFutureAppointmentsByPatient(patientId);
        List<AppointmentResponseDTO> dtos = appointments.stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/check-availability")
    public ResponseEntity<Boolean> checkDoctorAvailability(
            @RequestParam String doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime dateTime) {
        boolean isAvailable = appointmentService.isDoctorAvailable(doctorId, dateTime);
        return ResponseEntity.ok(isAvailable);
    }

    @PutMapping("/{id}")
    public ResponseEntity<AppointmentResponseDTO> updateAppointment(
            @PathVariable String id,
            @RequestBody Appointment appointment) {
        Appointment updatedAppointment = appointmentService.updateAppointment(id, appointment);
        return ResponseEntity.ok(convertToDTO(updatedAppointment));
    }

    @PatchMapping("/{id}/confirm-patient")
    public ResponseEntity<AppointmentResponseDTO> confirmByPatient(@PathVariable String id) {
        Appointment confirmedAppointment = appointmentService.confirmByPatient(id);
        return ResponseEntity.ok(convertToDTO(confirmedAppointment));
    }

    @PatchMapping("/{id}/confirm-caregiver")
    public ResponseEntity<AppointmentResponseDTO> confirmByCaregiver(@PathVariable String id) {
        Appointment confirmedAppointment = appointmentService.confirmByCaregiver(id);
        return ResponseEntity.ok(convertToDTO(confirmedAppointment));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<AppointmentResponseDTO> cancelAppointment(@PathVariable String id) {
        Appointment cancelledAppointment = appointmentService.cancelAppointment(id);
        return ResponseEntity.ok(convertToDTO(cancelledAppointment));
    }

    @PatchMapping("/{id}/reschedule")
    public ResponseEntity<AppointmentResponseDTO> rescheduleAppointment(
            @PathVariable String id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime newDateTime) {
        Appointment rescheduledAppointment = appointmentService.rescheduleAppointment(id, newDateTime);
        return ResponseEntity.ok(convertToDTO(rescheduledAppointment));
    }

    @PatchMapping("/{id}/notes")
    public ResponseEntity<AppointmentResponseDTO> updateDoctorNotes(
            @PathVariable String id,
            @RequestParam String notes) {
        Appointment updatedAppointment = appointmentService.updateDoctorNotes(id, notes);
        return ResponseEntity.ok(convertToDTO(updatedAppointment));
    }

    @PatchMapping("/{id}/summary")
    public ResponseEntity<AppointmentResponseDTO> updateSimpleSummary(
            @PathVariable String id,
            @RequestParam String summary) {
        Appointment updatedAppointment = appointmentService.updateSimpleSummary(id, summary);
        return ResponseEntity.ok(convertToDTO(updatedAppointment));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAppointment(@PathVariable String id) {
        appointmentService.deleteAppointment(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/patient/{patientId}")
    public ResponseEntity<Void> deleteAppointmentsByPatient(@PathVariable String patientId) {
        appointmentService.deleteAppointmentsByPatient(patientId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/count")
    public ResponseEntity<Long> countAppointmentsByDoctorAndDate(
            @RequestParam String doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE_TIME) LocalDateTime date) {
        long count = appointmentService.countAppointmentsByDoctorAndDate(doctorId, date);
        return ResponseEntity.ok(count);
    }

    @PostMapping("/send-reminders")
    public ResponseEntity<String> sendReminders() {
        appointmentService.sendReminders();
        return ResponseEntity.ok("Reminders sent successfully");
    }

    private AppointmentResponseDTO convertToDTO(Appointment appointment) {
        if (appointment == null) return null;

        AppointmentResponseDTO dto = new AppointmentResponseDTO();
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

        // Patient info - fetch via Feign
        if (appointment.getPatientId() != null) {
            dto.setPatientId(appointment.getPatientId());
            try {
                var patient = userFeignClient.getUserById(appointment.getPatientId());
                if (patient != null) {
                    dto.setPatientName(patient.getName());
                    dto.setPatientPhoto(patient.getProfilePicture());
                }
            } catch (Exception e) {
                // Ignore - user service may be unavailable
            }
        }

        // Doctor info - fetch via Feign
        if (appointment.getDoctorId() != null) {
            dto.setDoctorId(appointment.getDoctorId());
            try {
                var doctor = userFeignClient.getUserById(appointment.getDoctorId());
                if (doctor != null) {
                    dto.setDoctorName(doctor.getName());
                    dto.setDoctorPhoto(doctor.getProfilePicture());
                }
            } catch (Exception e) {
                // Ignore
            }
        }

        // Caregiver info - fetch via Feign
        if (appointment.getCaregiverId() != null) {
            dto.setCaregiverId(appointment.getCaregiverId());
            try {
                var caregiver = userFeignClient.getUserById(appointment.getCaregiverId());
                if (caregiver != null) {
                    dto.setCaregiverName(caregiver.getName());
                }
            } catch (Exception e) {
                // Ignore
            }
        }

        // Consultation type info
        if (appointment.getConsultationType() != null) {
            dto.setConsultationTypeId(appointment.getConsultationType().getTypeId());
            dto.setConsultationTypeName(appointment.getConsultationType().getName());
        }

        return dto;
    }
}
