package everCare.appointments.services;

import everCare.appointments.entities.Availability;
import everCare.appointments.entities.User;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface AvailabilityService {

    // ========== CREATE ==========
    Availability createAvailability(Availability availability);
    List<Availability> createMultipleAvailabilities(List<Availability> availabilities);
    Availability createWeeklyAvailability(String doctorId, DayOfWeek dayOfWeek, LocalTime startTime,
                                          LocalTime endTime, LocalDate validFrom, LocalDate validTo);

    // ========== READ ==========
    List<Availability> getAllAvailabilities();
    Availability getAvailabilityById(String id);
    List<Availability> getAvailabilitiesByDoctor(String doctorId);
    List<Availability> getAvailabilitiesByDoctorAndDay(String doctorId, DayOfWeek dayOfWeek);
    List<Availability> getValidAvailabilitiesForDate(String doctorId, LocalDate date);
    List<Availability> getBlockedSlots(String doctorId);
    List<Availability> getAvailabilitiesByRecurrence(String recurrence);
    List<Availability> getAvailabilitiesByDoctorAndPeriod(String doctorId, LocalDate from, LocalDate to);

    // ========== UPDATE ==========
    Availability updateAvailability(String id, Availability availabilityDetails);
    Availability blockSlot(String id, String reason);
    Availability unblockSlot(String id);
    Availability extendValidity(String id, LocalDate newValidTo);

    // ========== DELETE ==========
    void deleteAvailability(String id);
    void deleteAvailabilitiesByDoctor(String doctorId);
    void deleteExpiredAvailabilities(LocalDate date);

    // ========== BUSINESS LOGIC ==========
    boolean isSlotAvailable(String doctorId, LocalDate date, LocalTime time);
    List<LocalTime> getAvailableTimeSlots(String doctorId, LocalDate date, int durationMinutes);
    List<Availability> findConflictingAvailabilities(String doctorId, Availability newAvailability);
}