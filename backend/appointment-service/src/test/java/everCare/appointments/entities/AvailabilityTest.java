package everCare.appointments.entities;

import org.junit.jupiter.api.Test;

import java.time.DayOfWeek;
import java.time.LocalTime;

import static org.junit.jupiter.api.Assertions.*;

class AvailabilityTest {

    @Test
    void testAvailability_idIsGeneratedWhenNull() {
        Availability availability = new Availability();
        assertNull(availability.getAvailabilityId());
    }

    @Test
    void testAvailability_settersAndGetters() {
        Availability availability = new Availability();
        
        availability.setDoctorId("doctor123");
        availability.setDayOfWeek(DayOfWeek.MONDAY);
        availability.setStartTime(LocalTime.of(9, 0));
        availability.setEndTime(LocalTime.of(17, 0));
        availability.setBlocked(true);

        assertEquals("doctor123", availability.getDoctorId());
        assertEquals(DayOfWeek.MONDAY, availability.getDayOfWeek());
        assertEquals(LocalTime.of(9, 0), availability.getStartTime());
        assertEquals(LocalTime.of(17, 0), availability.getEndTime());
        assertTrue(availability.isBlocked());
    }

    @Test
    void testAvailability_builder() {
        Availability availability = Availability.builder()
            .doctorId("doctor123")
            .dayOfWeek(DayOfWeek.FRIDAY)
            .startTime(LocalTime.of(10, 0))
            .endTime(LocalTime.of(16, 0))
            .isBlocked(false)
            .build();

        assertEquals("doctor123", availability.getDoctorId());
        assertEquals(DayOfWeek.FRIDAY, availability.getDayOfWeek());
        assertEquals(LocalTime.of(10, 0), availability.getStartTime());
    }

    @Test
    void testAvailability_noArgsConstructor() {
        Availability availability = new Availability();
        assertNotNull(availability);
    }

    @Test
    void testAvailability_blockedDefault() {
        Availability availability = new Availability();
        assertFalse(availability.isBlocked());
    }

    @Test
    void testAvailability_allDaysOfWeek() {
        for (DayOfWeek day : DayOfWeek.values()) {
            Availability availability = Availability.builder()
                .doctorId("doctor123")
                .dayOfWeek(day)
                .startTime(LocalTime.of(9, 0))
                .endTime(LocalTime.of(17, 0))
                .build();

            assertEquals(day, availability.getDayOfWeek());
        }
    }
}