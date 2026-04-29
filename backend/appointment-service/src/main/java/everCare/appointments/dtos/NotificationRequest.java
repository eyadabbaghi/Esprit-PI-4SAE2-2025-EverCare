package everCare.appointments.dtos;

import lombok.*;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class NotificationRequest {

    private String activityId;
    private String action;
    private String details;
    private List<String> targetUserIds;
}