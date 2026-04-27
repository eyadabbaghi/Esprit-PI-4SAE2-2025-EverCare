package com.yourteam.communicationservice.Controller;

import com.yourteam.communicationservice.entity.Call;
import com.yourteam.communicationservice.service.CallService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/calls")
@RequiredArgsConstructor
public class CallController {

    private final CallService callService;

    @PostMapping("/{conversationId}")
    public ResponseEntity<Call> startCall(@PathVariable Long conversationId) {
        String email = "anonymous";
        return ResponseEntity.ok(callService.startCall(conversationId, email));
    }

    @PatchMapping("/end/{callId}")
    public ResponseEntity<Call> endCall(@PathVariable Long callId) {
        return ResponseEntity.ok(callService.endCall(callId));
    }
}