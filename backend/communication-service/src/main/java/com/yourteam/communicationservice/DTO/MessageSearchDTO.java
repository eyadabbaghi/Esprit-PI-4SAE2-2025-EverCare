package com.yourteam.communicationservice.DTO;


import java.time.LocalDateTime;
import lombok.*;

@Getter @Setter
@NoArgsConstructor
@AllArgsConstructor
public class MessageSearchDTO {
    private Long id;
    private String content;
    private String senderId;
    private LocalDateTime sentAt;
    private String conversationId; // On le reçoit en String ou Long selon ton entité Conversation
}