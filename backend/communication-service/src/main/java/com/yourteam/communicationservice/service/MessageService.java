package com.yourteam.communicationservice.service;

import com.yourteam.communicationservice.DTO.MessageSearchDTO;
import com.yourteam.communicationservice.Repository.ConversationRepository;
import com.yourteam.communicationservice.Repository.MessageRepository;
import com.yourteam.communicationservice.entity.Conversation;
import com.yourteam.communicationservice.entity.Message;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final MessageRepository messageRepository;
    private final ConversationRepository conversationRepository;
    private final ContentFilterService contentFilterService;
    private final SimpMessagingTemplate messagingTemplate;
    private final String UPLOAD_DIR = "uploads";

    public Message sendMessage(Long conversationId, Message message) {
        if (message.getContent() != null && contentFilterService.isContentInvalid(message.getContent())) {
            throw new IllegalArgumentException("Le message contient des termes interdits.");
        }
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation non trouvée"));
        message.setConversation(conv);
        Message savedMessage = messageRepository.save(message);
        messagingTemplate.convertAndSend("/topic/messages/" + conversationId, savedMessage);
        return savedMessage;
    }

    public Message saveFile(Long conversationId, MultipartFile file, String senderId) {
        try {
            Path root = Paths.get(System.getProperty("user.dir"), UPLOAD_DIR);
            if (!Files.exists(root)) Files.createDirectories(root);
            String uniqueFileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();
            Files.copy(file.getInputStream(), root.resolve(uniqueFileName), StandardCopyOption.REPLACE_EXISTING);
            Conversation conv = conversationRepository.findById(conversationId)
                    .orElseThrow(() -> new RuntimeException("Conversation ID " + conversationId + " non trouvée"));
            Message message = Message.builder()
                    .senderId(senderId)
                    .content("")
                    .fileUrl(uniqueFileName)
                    .fileType(file.getContentType())
                    .conversation(conv)
                    .sentAt(LocalDateTime.now())
                    .isRead(false)
                    .build();
            Message savedMessage = messageRepository.save(message);
            messagingTemplate.convertAndSend("/topic/messages/" + conversationId, savedMessage);
            return savedMessage;
        } catch (IOException e) {
            throw new RuntimeException("Erreur lors du stockage du fichier : " + e.getMessage());
        }
    }

    public Message updateMessage(Long messageId, String newContent) {
        if (contentFilterService.isContentInvalid(newContent)) {
            throw new IllegalArgumentException("La modification contient des termes interdits.");
        }
        Message msg = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message non trouvé"));
        msg.setContent(newContent);
        Message updated = messageRepository.save(msg);
        messagingTemplate.convertAndSend("/topic/messages/" + msg.getConversation().getId(), updated);
        return updated;
    }

    public List<Message> getMessagesByConversation(Long conversationId) {
        return messageRepository.findByConversationIdOrderBySentAtAsc(conversationId);
    }

    public void deleteMessage(Long messageId) {
        messageRepository.findById(messageId).ifPresent(msg -> {
            Long convId = msg.getConversation().getId();
            messageRepository.deleteById(messageId);
            messagingTemplate.convertAndSend("/topic/messages/" + convId + "/delete", messageId);
        });
    }

    public Message markAsRead(Long messageId) {
        Message msg = messageRepository.findById(messageId)
                .orElseThrow(() -> new RuntimeException("Message non trouvé"));
        msg.setRead(true);
        return messageRepository.save(msg);
    }

    public List<MessageSearchDTO> searchGlobally(String userId, String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) return List.of();
        return messageRepository.searchMessagesGlobally(userId, keyword);
    }
}