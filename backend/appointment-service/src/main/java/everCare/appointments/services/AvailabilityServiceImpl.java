/**
 * AvailabilityServiceImpl - Service implementation for Availability operations.
 * 
 * CHANGED: Replaced UserRepository with UserFeignClient.
 * User validation is now done via Feign client to User microservice.
 * Availability entity now uses String doctorId instead of User object.
 */
package everCare.appointments.services;

import everCare.appointments.entities.Availability;
import everCare.appointments.feign.UserFeignClient;
import everCare.appointments.dtos.UserSimpleDTO;
import everCare.appointments.exceptions.ResourceNotFoundException;
import everCare.appointments.repositories.AvailabilityRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional
public class AvailabilityServiceImpl implements AvailabilityService {

    private final AvailabilityRepository availabilityRepository;
    private final UserFeignClient userFeignClient;

    // ========== CREATE ==========

    @Override
    public Availability createAvailability(Availability availability) {
        if (availability.getAvailabilityId() == null) {
            availability.setAvailabilityId(UUID.randomUUID().toString());
        }

        if (availability.getValidFrom() == null) {
            availability.setValidFrom(LocalDate.now());
        }

        if (availability.getValidTo() == null) {
            availability.setValidTo(LocalDate.now().plusYears(1));
        }

        if (availability.getRecurrence() == null) {
            availability.setRecurrence("WEEKLY");
        }

        return availabilityRepository.save(availability);
    }

    @Override
    public List<Availability> createMultipleAvailabilities(List<Availability> availabilities) {
        List<Availability> savedAvailabilities = new ArrayList<>();
        for (Availability availability : availabilities) {
            savedAvailabilities.add(createAvailability(availability));
        }
        return savedAvailabilities;
    }

    @Override
    public Availability createWeeklyAvailability(String doctorId, DayOfWeek dayOfWeek, LocalTime startTime,
                                                  LocalTime endTime, LocalDate validFrom, LocalDate validTo) {
        validateDoctorExists(doctorId);

        Availability availability = Availability.builder()
            .availabilityId(UUID.randomUUID().toString())
            .doctorId(doctorId)
            .dayOfWeek(dayOfWeek)
            .startTime(startTime)
            .endTime(endTime)
            .validFrom(validFrom != null ? validFrom : LocalDate.now())
            .validTo(validTo != null ? validTo : LocalDate.now().plusYears(1))
            .recurrence("WEEKLY")
            .isBlocked(false)
            .build();

        return availabilityRepository.save(availability);
    }

    // ========== READ ==========

    @Override
    public List<Availability> getAllAvailabilities() {
        return availabilityRepository.findAll();
    }

    @Override
    public Availability getAvailabilityById(String id) {
        return availabilityRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Availability not found with id: " + id));
    }

    @Override
    public List<Availability> getAvailabilitiesByDoctor(String doctorId) {
        validateDoctorExists(doctorId);
        return availabilityRepository.findByDoctorId(doctorId);
    }

    @Override
    public List<Availability> getAvailabilitiesByDoctorAndDay(String doctorId, DayOfWeek dayOfWeek) {
        validateDoctorExists(doctorId);
        return availabilityRepository.findByDoctorIdAndDayOfWeek(doctorId, dayOfWeek);
    }

    @Override
    public List<Availability> getValidAvailabilitiesForDate(String doctorId, LocalDate date) {
        validateDoctorExists(doctorId);
        return availabilityRepository.findValidByDoctorIdAndDate(doctorId, date);
    }

    @Override
    public List<Availability> getBlockedSlots(String doctorId) {
        validateDoctorExists(doctorId);
        return availabilityRepository.findByDoctorIdAndIsBlockedTrue(doctorId);
    }

    @Override
    public List<Availability> getAvailabilitiesByRecurrence(String recurrence) {
        return availabilityRepository.findByRecurrence(recurrence);
    }

    @Override
    public List<Availability> getAvailabilitiesByDoctorAndPeriod(String doctorId, LocalDate from, LocalDate to) {
        validateDoctorExists(doctorId);
        return availabilityRepository.findByDoctorIdAndValidFromLessThanEqualAndValidToGreaterThanEqual(doctorId, from, to);
    }

    // ========== UPDATE ==========

    @Override
    public Availability updateAvailability(String id, Availability availabilityDetails) {
        Availability existingAvailability = getAvailabilityById(id);

        if (availabilityDetails.getDayOfWeek() != null) {
            existingAvailability.setDayOfWeek(availabilityDetails.getDayOfWeek());
        }

        if (availabilityDetails.getStartTime() != null) {
            existingAvailability.setStartTime(availabilityDetails.getStartTime());
        }

        if (availabilityDetails.getEndTime() != null) {
            existingAvailability.setEndTime(availabilityDetails.getEndTime());
        }

        if (availabilityDetails.getValidFrom() != null) {
            existingAvailability.setValidFrom(availabilityDetails.getValidFrom());
        }

        if (availabilityDetails.getValidTo() != null) {
            existingAvailability.setValidTo(availabilityDetails.getValidTo());
        }

        if (availabilityDetails.getRecurrence() != null) {
            existingAvailability.setRecurrence(availabilityDetails.getRecurrence());
        }

        existingAvailability.setBlocked(availabilityDetails.isBlocked());

        if (availabilityDetails.getBlockReason() != null) {
            existingAvailability.setBlockReason(availabilityDetails.getBlockReason());
        }

        return availabilityRepository.save(existingAvailability);
    }

    @Override
    public Availability blockSlot(String id, String reason) {
        Availability availability = getAvailabilityById(id);
        availability.setBlocked(true);
        availability.setBlockReason(reason);
        return availabilityRepository.save(availability);
    }

    @Override
    public Availability unblockSlot(String id) {
        Availability availability = getAvailabilityById(id);
        availability.setBlocked(false);
        availability.setBlockReason(null);
        return availabilityRepository.save(availability);
    }

    @Override
    public Availability extendValidity(String id, LocalDate newValidTo) {
        Availability availability = getAvailabilityById(id);
        availability.setValidTo(newValidTo);
        return availabilityRepository.save(availability);
    }

    // ========== DELETE ==========

    @Override
    public void deleteAvailability(String id) {
        Availability availability = getAvailabilityById(id);
        availabilityRepository.delete(availability);
    }

    @Override
    public void deleteAvailabilitiesByDoctor(String doctorId) {
        validateDoctorExists(doctorId);
        List<Availability> availabilities = availabilityRepository.findByDoctorId(doctorId);
        availabilityRepository.deleteAll(availabilities);
    }

    @Override
    public void deleteExpiredAvailabilities(LocalDate date) {
        List<Availability> allAvailabilities = availabilityRepository.findAll();
        List<Availability> expired = allAvailabilities.stream()
            .filter(a -> a.getValidTo().isBefore(date))
            .toList();
        availabilityRepository.deleteAll(expired);
    }

    // ========== BUSINESS LOGIC ==========

    @Override
    public boolean isSlotAvailable(String doctorId, LocalDate date, LocalTime time) {
        List<Availability> availabilities = getValidAvailabilitiesForDate(doctorId, date);

        DayOfWeek dayOfWeek = date.getDayOfWeek();

        return availabilities.stream()
            .filter(a -> a.getDayOfWeek() == dayOfWeek)
            .filter(a -> !a.isBlocked())
            .anyMatch(a ->
                !time.isBefore(a.getStartTime()) &&
                !time.isAfter(a.getEndTime().minusMinutes(1))
            );
    }

    @Override
    public List<LocalTime> getAvailableTimeSlots(String doctorId, LocalDate date, int durationMinutes) {
        List<Availability> availabilities = getValidAvailabilitiesForDate(doctorId, date);
        List<LocalTime> availableSlots = new ArrayList<>();

        DayOfWeek dayOfWeek = date.getDayOfWeek();

        for (Availability availability : availabilities) {
            if (availability.getDayOfWeek() == dayOfWeek && !availability.isBlocked()) {
                LocalTime slotTime = availability.getStartTime();

                while (slotTime.plusMinutes(durationMinutes).isBefore(availability.getEndTime()) ||
                       slotTime.plusMinutes(durationMinutes).equals(availability.getEndTime())) {

                    if (isSlotAvailable(doctorId, date, slotTime)) {
                        availableSlots.add(slotTime);
                    }

                    slotTime = slotTime.plusMinutes(15);
                }
            }
        }

        return availableSlots;
    }

    @Override
    public List<Availability> findConflictingAvailabilities(String doctorId, Availability newAvailability) {
        List<Availability> existingAvailabilities = getAvailabilitiesByDoctor(doctorId);
        List<Availability> conflicts = new ArrayList<>();

        for (Availability existing : existingAvailabilities) {
            if (existing.getDayOfWeek() == newAvailability.getDayOfWeek()) {
                if (dateRangesOverlap(existing.getValidFrom(), existing.getValidTo(),
                    newAvailability.getValidFrom(), newAvailability.getValidTo())) {
                    if (timeRangesOverlap(existing.getStartTime(), existing.getEndTime(),
                        newAvailability.getStartTime(), newAvailability.getEndTime())) {
                        conflicts.add(existing);
                    }
                }
            }
        }

        return conflicts;
    }

    private boolean dateRangesOverlap(LocalDate start1, LocalDate end1, LocalDate start2, LocalDate end2) {
        return !start1.isAfter(end2) && !start2.isAfter(end1);
    }

    private boolean timeRangesOverlap(LocalTime start1, LocalTime end1, LocalTime start2, LocalTime end2) {
        return !start1.isAfter(end2) && !start2.isAfter(end1);
    }

    // ========== HELPER METHODS ==========

    private void validateDoctorExists(String doctorId) {
        UserSimpleDTO doctor = userFeignClient.getUserById(doctorId);
        if (doctor == null) {
            throw new ResourceNotFoundException("Doctor not found with id: " + doctorId);
        }
    }
}
