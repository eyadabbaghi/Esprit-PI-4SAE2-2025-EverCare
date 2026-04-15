package com.yourteam.communicationservice.service;

import com.yourteam.communicationservice.DTO.MessageSearchDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate; // Import indispensable
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import com.yourteam.communicationservice.entity.Conversation;
import com.yourteam.communicationservice.entity.Message;
import com.yourteam.communicationservice.Repository.ConversationRepository;
import com.yourteam.communicationservice.Repository.MessageRepository;

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

    // Ajout du template pour envoyer les messages via WebSocket
    private final SimpMessagingTemplate messagingTemplate;

    private final String UPLOAD_DIR = "uploads";

    /**
     * Envoi d'un message texte classique
     */
    public Message sendMessage(Long conversationId, Message message) {
        if (message.getContent() != null && contentFilterService.isContentInvalid(message.getContent())) {
            throw new IllegalArgumentException("Le message contient des termes interdits.");
        }

        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation non trouvée"));

        message.setConversation(conv);
        Message savedMessage = messageRepository.save(message);

        // DIFFUSION TEMPS RÉEL : On envoie le message vers le topic de la conversation
        messagingTemplate.convertAndSend("/topic/messages/" + conversationId, savedMessage);

        return savedMessage;
    }

    /**
     * Sauvegarde d'un fichier et notification en temps réel
     */
    public Message saveFile(Long conversationId, MultipartFile file, String senderId) {
        try {
            // 1. Définition et création du dossier de stockage
            Path root = Paths.get(System.getProperty("user.dir"), UPLOAD_DIR);
            if (!Files.exists(root)) {
                Files.createDirectories(root);
            }

            // 2. Génération d'un nom de fichier unique
            String uniqueFileName = UUID.randomUUID().toString() + "_" + file.getOriginalFilename();

            // 3. Copie physique du fichier
            Files.copy(file.getInputStream(), root.resolve(uniqueFileName), StandardCopyOption.REPLACE_EXISTING);

            // 4. Récupération de la conversation
            Conversation conv = conversationRepository.findById(conversationId)
                    .orElseThrow(() -> new RuntimeException("Conversation ID " + conversationId + " non trouvée"));

            // 5. Construction de l'entité Message
            Message message = Message.builder()
                    .senderId(senderId)
                    .content("") // Vide car c'est un fichier
                    .fileUrl(uniqueFileName)
                    .fileType(file.getContentType())
                    .conversation(conv)
                    .sentAt(LocalDateTime.now())
                    .isRead(false)
                    .build();

            Message savedMessage = messageRepository.save(message);

            // DIFFUSION TEMPS RÉEL : On envoie l'objet message contenant l'URL du fichier
            messagingTemplate.convertAndSend("/topic/messages/" + conversationId, savedMessage);

            return savedMessage;

        } catch (IOException e) {
            e.printStackTrace();
            throw new RuntimeException("Erreur lors du stockage du fichier : " + e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            throw new RuntimeException("Erreur interne lors de l'upload : " + e.getMessage());
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

        // Optionnel : Diffuser aussi la mise à jour pour que l'interlocuteur voit la modification
        messagingTemplate.convertAndSend("/topic/messages/" + msg.getConversation().getId(), updated);

        return updated;
    }

    public List<Message> getMessagesByConversation(Long conversationId) {
        return messageRepository.findByConversationIdOrderBySentAtAsc(conversationId);
    }

    public void deleteMessage(Long messageId) {
        // Avant de supprimer, on récupère l'id de conv pour notifier le front (optionnel)
        messageRepository.findById(messageId).ifPresent(msg -> {
            Long convId = msg.getConversation().getId();
            messageRepository.deleteById(messageId);
            // On peut envoyer un message spécial pour dire au front de supprimer l'ID localement
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
        if (keyword == null || keyword.trim().isEmpty()) {
            return List.of();
        }
        return messageRepository.searchMessagesGlobally(userId, keyword);
    }
}