// src/main/java/tn/esprit/alerts/controller/CheckController.java
package tn.esprit.alerts.controller;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import tn.esprit.alerts.dto.CheckSignalMessage;

@Controller
@RequiredArgsConstructor
public class CheckController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/check.signal")
    public void relaySignal(@Payload CheckSignalMessage message) {
        // ✅ ADD THIS LOG
        System.out.println("📨 Relaying signal type=" + message.getType()
                + " from=" + message.getFrom()
                + " to=" + message.getTo());

        messagingTemplate.convertAndSendToUser(
                message.getTo(),
                "/queue/check",
                message
        );
    }

    @MessageMapping("/check.snapshot")
    public void relaySnapshot(@Payload CheckSignalMessage message) {
        // ✅ ADD THIS LOG
        System.out.println("📸 Relaying snapshot from=" + message.getFrom()
                + " to=" + message.getTo());

        messagingTemplate.convertAndSendToUser(
                message.getTo(),
                "/queue/snapshot",
                message
        );
    }
}