package everCare.appointments.controllers;

import everCare.appointments.dtos.SignalingMessageDTO;
import everCare.appointments.services.VideoConsultationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Controller;

import java.security.Principal;

@Slf4j
@Controller
@RequiredArgsConstructor
public class WebSocketController {

    private final VideoConsultationService videoService;

    @MessageMapping("/video.signal")
    public void handleSignal(@Payload SignalingMessageDTO message, Principal principal) {
        // Set sender ID from authenticated principal
        if (principal != null) {
            message.setSenderId(principal.getName());
        }
        videoService.handleSignaling(message);
    }
}