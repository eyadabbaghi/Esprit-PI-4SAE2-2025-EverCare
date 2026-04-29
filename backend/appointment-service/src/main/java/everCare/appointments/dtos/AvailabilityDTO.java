package everCare.appointments.dtos;

import lombok.Data;
import java.time.DayOfWeek;
import java.time.LocalTime;
import java.time.LocalDate;

@Data
public class AvailabilityDTO {
    private String availabilityId;
    private String doctorId;
    private String doctorName;
    private DayOfWeek dayOfWeek;
    private LocalTime startTime;
    private LocalTime endTime;
    private LocalDate validFrom;
    private LocalDate validTo;
    private String recurrence;
    private boolean isBlocked;
    private String blockReason;
}