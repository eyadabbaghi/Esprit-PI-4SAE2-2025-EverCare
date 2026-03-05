package everCare.appointments.dtos;

import lombok.Data;

@Data
public class SignalingMessageDTO {
    private String type; // "offer", "answer", "ice", "join", "leave"
    private String senderId;
    private String targetId;
    private String roomId;
    private String sdp;
    private Object candidate; // ICE candidate
}