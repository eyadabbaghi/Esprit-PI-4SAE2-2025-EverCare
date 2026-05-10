package com.yourteam.communicationservice.Controller;

import com.yourteam.communicationservice.service.ConversationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/internal")
@RequiredArgsConstructor
public class InternalCommunicationController {

    private final ConversationService conversationService;

    @PostMapping("/email-reference-update")
    public ResponseEntity<Void> updateEmailReferences(@RequestBody Map<String, String> request) {
        conversationService.updateEmailReferences(request.get("oldEmail"), request.get("newEmail"));
        return ResponseEntity.noContent().build();
    }
}
