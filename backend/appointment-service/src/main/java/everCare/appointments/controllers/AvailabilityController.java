package everCare.appointments.controllers;

import everCare.appointments.entities.Availability;
import everCare.appointments.services.AvailabilityService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/availabilities")
@RequiredArgsConstructor
public class AvailabilityController {

    private final AvailabilityService availabilityService;

    // ========== CREATE ==========

    @PostMapping
    public ResponseEntity<Availability> createAvailability(@RequestBody Availability availability) {
        Availability createdAvailability = availabilityService.createAvailability(availability);
        return new ResponseEntity<>(createdAvailability, HttpStatus.CREATED);
    }

    @PostMapping("/batch")
    public ResponseEntity<List<Availability>> createMultipleAvailabilities(@RequestBody List<Availability> availabilities) {
        List<Availability> createdAvailabilities = availabilityService.createMultipleAvailabilities(availabilities);
        return new ResponseEntity<>(createdAvailabilities, HttpStatus.CREATED);
    }

    @PostMapping("/weekly")
    public ResponseEntity<Availability> createWeeklyAvailability(
            @RequestParam String doctorId,
            @RequestParam DayOfWeek dayOfWeek,
            @RequestParam String startTime,
            @RequestParam String endTime,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate validFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate validTo) {

        LocalTime start = LocalTime.parse(startTime);
        LocalTime end = LocalTime.parse(endTime);

        Availability availability = availabilityService.createWeeklyAvailability(
                doctorId, dayOfWeek, start, end, validFrom, validTo);

        return new ResponseEntity<>(availability, HttpStatus.CREATED);
    }

    // ========== READ ALL ==========

    @GetMapping
    public ResponseEntity<List<Availability>> getAllAvailabilities() {
        List<Availability> availabilities = availabilityService.getAllAvailabilities();
        return ResponseEntity.ok(availabilities);
    }

    // ========== READ BY ID ==========

    @GetMapping("/{id}")
    public ResponseEntity<Availability> getAvailabilityById(@PathVariable String id) {
        Availability availability = availabilityService.getAvailabilityById(id);
        return ResponseEntity.ok(availability);
    }

    // ========== READ BY DOCTOR ==========

    @GetMapping("/doctor/{doctorId}")
    public ResponseEntity<List<Availability>> getAvailabilitiesByDoctor(@PathVariable String doctorId) {
        List<Availability> availabilities = availabilityService.getAvailabilitiesByDoctor(doctorId);
        return ResponseEntity.ok(availabilities);
    }

    // ========== READ BY DOCTOR AND DAY ==========

    @GetMapping("/doctor/{doctorId}/day/{dayOfWeek}")
    public ResponseEntity<List<Availability>> getAvailabilitiesByDoctorAndDay(
            @PathVariable String doctorId,
            @PathVariable DayOfWeek dayOfWeek) {
        List<Availability> availabilities = availabilityService.getAvailabilitiesByDoctorAndDay(doctorId, dayOfWeek);
        return ResponseEntity.ok(availabilities);
    }

    // ========== READ VALID FOR DATE ==========

    @GetMapping("/doctor/{doctorId}/valid")
    public ResponseEntity<List<Availability>> getValidAvailabilitiesForDate(
            @PathVariable String doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<Availability> availabilities = availabilityService.getValidAvailabilitiesForDate(doctorId, date);
        return ResponseEntity.ok(availabilities);
    }

    // ========== READ BLOCKED SLOTS ==========

    @GetMapping("/doctor/{doctorId}/blocked")
    public ResponseEntity<List<Availability>> getBlockedSlots(@PathVariable String doctorId) {
        List<Availability> blockedSlots = availabilityService.getBlockedSlots(doctorId);
        return ResponseEntity.ok(blockedSlots);
    }

    // ========== READ BY RECURRENCE ==========

    @GetMapping("/recurrence/{recurrence}")
    public ResponseEntity<List<Availability>> getAvailabilitiesByRecurrence(@PathVariable String recurrence) {
        List<Availability> availabilities = availabilityService.getAvailabilitiesByRecurrence(recurrence);
        return ResponseEntity.ok(availabilities);
    }

    // ========== READ BY DOCTOR AND PERIOD ==========

    @GetMapping("/doctor/{doctorId}/period")
    public ResponseEntity<List<Availability>> getAvailabilitiesByDoctorAndPeriod(
            @PathVariable String doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        List<Availability> availabilities = availabilityService.getAvailabilitiesByDoctorAndPeriod(doctorId, from, to);
        return ResponseEntity.ok(availabilities);
    }

    // ========== UPDATE ==========

    @PutMapping("/{id}")
    public ResponseEntity<Availability> updateAvailability(
            @PathVariable String id,
            @RequestBody Availability availability) {
        Availability updatedAvailability = availabilityService.updateAvailability(id, availability);
        return ResponseEntity.ok(updatedAvailability);
    }

    // ========== BLOCK SLOT ==========

    @PatchMapping("/{id}/block")
    public ResponseEntity<Availability> blockSlot(
            @PathVariable String id,
            @RequestParam String reason) {
        Availability blockedAvailability = availabilityService.blockSlot(id, reason);
        return ResponseEntity.ok(blockedAvailability);
    }

    // ========== UNBLOCK SLOT ==========

    @PatchMapping("/{id}/unblock")
    public ResponseEntity<Availability> unblockSlot(@PathVariable String id) {
        Availability unblockedAvailability = availabilityService.unblockSlot(id);
        return ResponseEntity.ok(unblockedAvailability);
    }

    // ========== EXTEND VALIDITY ==========

    @PatchMapping("/{id}/extend")
    public ResponseEntity<Availability> extendValidity(
            @PathVariable String id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate newValidTo) {
        Availability extendedAvailability = availabilityService.extendValidity(id, newValidTo);
        return ResponseEntity.ok(extendedAvailability);
    }

    // ========== CHECK SLOT AVAILABILITY ==========

    @GetMapping("/check")
    public ResponseEntity<Boolean> checkSlotAvailability(
            @RequestParam String doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam String time) {
        LocalTime slotTime = LocalTime.parse(time);
        boolean isAvailable = availabilityService.isSlotAvailable(doctorId, date, slotTime);
        return ResponseEntity.ok(isAvailable);
    }

    // ========== GET AVAILABLE TIME SLOTS ==========

    @GetMapping("/available-slots")
    public ResponseEntity<List<LocalTime>> getAvailableTimeSlots(
            @RequestParam String doctorId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam int durationMinutes) {
        List<LocalTime> availableSlots = availabilityService.getAvailableTimeSlots(doctorId, date, durationMinutes);
        return ResponseEntity.ok(availableSlots);
    }

    // ========== DELETE ==========

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAvailability(@PathVariable String id) {
        availabilityService.deleteAvailability(id);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/doctor/{doctorId}")
    public ResponseEntity<Void> deleteAvailabilitiesByDoctor(@PathVariable String doctorId) {
        availabilityService.deleteAvailabilitiesByDoctor(doctorId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/expired")
    public ResponseEntity<Void> deleteExpiredAvailabilities(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        availabilityService.deleteExpiredAvailabilities(date);
        return ResponseEntity.noContent().build();
    }
}