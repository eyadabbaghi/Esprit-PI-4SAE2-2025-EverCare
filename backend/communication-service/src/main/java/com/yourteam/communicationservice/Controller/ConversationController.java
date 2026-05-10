package com.yourteam.communicationservice.Controller;

import com.yourteam.communicationservice.entity.Conversation;
import com.yourteam.communicationservice.service.ConversationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final ConversationService conversationService;

    @PostMapping
    public ResponseEntity<Conversation> createConversation(@RequestBody Conversation conversation) {
        String email = "anonymous";
        if (conversation.getUser1Id() != null) {
            email = conversation.getUser1Id().trim().toLowerCase();
        } else {
            conversation.setUser1Id(email);
        }
        if (conversation.getUser2Id() != null) {
            conversation.setUser2Id(conversation.getUser2Id().trim().toLowerCase());
        }
        return ResponseEntity.ok(conversationService.createConversation(conversation));
    }

    @GetMapping("/my")
    public ResponseEntity<List<Conversation>> getMyConversations(@RequestParam String email) {
        return ResponseEntity.ok(conversationService.getConversationsByUserId(email));
    }

    @GetMapping("/archived")
    public ResponseEntity<List<Conversation>> getArchivedConversations(@RequestParam String email) {
        return ResponseEntity.ok(conversationService.getArchivedConversationsByUserId(email));
    }

    @GetMapping("/{id}")
    public ResponseEntity<Conversation> getConversationById(@PathVariable Long id) {
        return conversationService.getConversationById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<Conversation> toggleStatus(@PathVariable Long id, @RequestParam boolean active) {
        return ResponseEntity.ok(conversationService.toggleConversationStatus(id, active));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteConversation(@PathVariable Long id) {
        conversationService.deleteConversation(id);
        return ResponseEntity.noContent().build();
    }
}
