package com.yourteam.communicationservice.Controller;

import com.yourteam.communicationservice.entity.Conversation;
import com.yourteam.communicationservice.service.conversationservice;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/conversations")
@RequiredArgsConstructor
public class ConversationController {

    private final conversationservice conversationService;

    @PostMapping
    public ResponseEntity<Conversation> createConversation(@RequestBody Conversation conversation, JwtAuthenticationToken token) {
        // Optionnel : Forcer l'un des participants à être l'utilisateur connecté
        // conversation.setUser1Id(token.getName());
        return ResponseEntity.ok(conversationService.createConversation(conversation));
    }

    // Récupérer les conversations de l'utilisateur CONNECTÉ (plus sécurisé)
    @GetMapping("/my")
    public ResponseEntity<List<Conversation>> getMyConversations(JwtAuthenticationToken token) {
        return ResponseEntity.ok(conversationService.getConversationsByUserId(token.getName()));
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