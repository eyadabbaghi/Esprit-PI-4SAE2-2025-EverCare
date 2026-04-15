package everCare.appointments.services;

import everCare.appointments.entities.Appointment;
import everCare.appointments.entities.User;
import everCare.appointments.entities.ConsultationType;
import java.time.LocalDateTime;
import java.util.List;

public interface AppointmentService {

    // ========== CREATE ==========
    Appointment createAppointment(Appointment appointment);

    // ========== READ ==========
    List<Appointment> getAllAppointments();
    Appointment getAppointmentById(String id);
    List<Appointment> getAppointmentsByPatient(String patientId);
    List<Appointment> getAppointmentsByDoctor(String doctorId);
    List<Appointment> getAppointmentsByCaregiver(String caregiverId);
    List<Appointment> getAppointmentsByStatus(String status);
    List<Appointment> getAppointmentsByDateRange(LocalDateTime start, LocalDateTime end);
    List<Appointment> getAppointmentsByDoctorAndDateRange(String doctorId, LocalDateTime start, LocalDateTime end);
    List<Appointment> getFutureAppointmentsByPatient(String patientId);
    boolean isDoctorAvailable(String doctorId, LocalDateTime dateTime);

    // ========== UPDATE ==========
    Appointment updateAppointment(String id, Appointment appointmentDetails);
    Appointment confirmByPatient(String id);
    Appointment confirmByCaregiver(String id);
    Appointment cancelAppointment(String id);
    Appointment rescheduleAppointment(String id, LocalDateTime newDateTime);
    Appointment updateDoctorNotes(String id, String notes);
    Appointment updateSimpleSummary(String id, String summary);

    // ========== DELETE ==========
    void deleteAppointment(String id);
    void deleteAppointmentsByPatient(String patientId);

    // ========== BUSINESS LOGIC ==========
    long countAppointmentsByDoctorAndDate(String doctorId, LocalDateTime date);
    List<Appointment> getAppointmentsNeedingReminder(LocalDateTime reminderTime);
    void sendReminders();
}