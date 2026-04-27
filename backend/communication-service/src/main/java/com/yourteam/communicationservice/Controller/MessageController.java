package com.yourteam.communicationservice.Controller;

import com.yourteam.communicationservice.DTO.MessageSearchDTO;
import com.yourteam.communicationservice.entity.Message;
import com.yourteam.communicationservice.service.ContentFilterService;
import com.yourteam.communicationservice.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
@RequiredArgsConstructor
public class MessageController {

    private final MessageService messageService;
    private final ContentFilterService contentFilterService;

    @GetMapping("/forbidden-words")
    public ResponseEntity<List<String>> getForbiddenWords() {
        return ResponseEntity.ok(contentFilterService.getForbiddenWords());
    }

    @PostMapping("/{conversationId}")
    public ResponseEntity<Message> sendMessage(
            @PathVariable Long conversationId,
            @RequestBody Message message) {
        String email = "anonymous";
        message.setSenderId(email);
        return ResponseEntity.ok(messageService.sendMessage(conversationId, message));
    }

    @PostMapping("/{conversationId}/upload")
    public ResponseEntity<Message> uploadFile(
            @PathVariable Long conversationId,
            @RequestParam("file") MultipartFile file) {
        String email = "anonymous";
        return ResponseEntity.ok(messageService.saveFile(conversationId, file, email));
    }

    @GetMapping("/conversation/{conversationId}")
    public ResponseEntity<List<Message>> getMessages(@PathVariable Long conversationId) {
        return ResponseEntity.ok(messageService.getMessagesByConversation(conversationId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<Message> updateMessage(@PathVariable Long id, @RequestBody String newContent) {
        return ResponseEntity.ok(messageService.updateMessage(id, newContent));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteMessage(@PathVariable Long id) {
        messageService.deleteMessage(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/read")
    public ResponseEntity<Message> markAsRead(@PathVariable Long id) {
        return ResponseEntity.ok(messageService.markAsRead(id));
    }

    @GetMapping("/search")
    public ResponseEntity<List<MessageSearchDTO>> searchGlobalMessages(
            @RequestParam String query) {
        String email = "anonymous";
        return ResponseEntity.ok(messageService.searchGlobally(email, query));
    }
}