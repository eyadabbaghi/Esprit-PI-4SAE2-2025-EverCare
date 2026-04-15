package com.yourteam.communicationservice.Controller;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;
import com.yourteam.communicationservice.entity.Call;
import com.yourteam.communicationservice.service.CallService;

@RestController
@RequestMapping("/api/calls")
@RequiredArgsConstructor
public class CallController {

    private final CallService callService;

    @PostMapping("/{conversationId}")
    public ResponseEntity<Call> startCall(@PathVariable Long conversationId, JwtAuthenticationToken token) {
        // callerId est extrait du token Keycloak automatiquement
        return ResponseEntity.ok(callService.startCall(conversationId, token.getName()));
    }

    @PatchMapping("/end/{callId}")
    public ResponseEntity<Call> endCall(@PathVariable Long callId) {
        return ResponseEntity.ok(callService.endCall(callId));
    }
}