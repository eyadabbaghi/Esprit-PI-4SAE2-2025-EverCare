package com.yourteam.communicationservice.service;

import com.yourteam.communicationservice.Repository.ConversationRepository;
import com.yourteam.communicationservice.Repository.MessageRepository;
import com.yourteam.communicationservice.entity.Conversation;
import com.yourteam.communicationservice.entity.Message;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class ConversationService {

    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;

    public Conversation createConversation(Conversation conversation) {
        conversation.setUser1Id(conversation.getUser1Id().trim().toLowerCase());
        conversation.setUser2Id(conversation.getUser2Id().trim().toLowerCase());

        boolean exists = conversationRepository.existsByUser1IdAndUser2Id(
                conversation.getUser1Id(), conversation.getUser2Id()) ||
                conversationRepository.existsByUser1IdAndUser2Id(
                        conversation.getUser2Id(), conversation.getUser1Id());

        if (exists) {
            Conversation existingConversation = conversationRepository.findByUser1IdOrUser2Id(
                            conversation.getUser1Id(), conversation.getUser1Id())
                    .stream()
                    .filter(c -> c.getUser1Id().equals(conversation.getUser2Id()) ||
                            c.getUser2Id().equals(conversation.getUser2Id()))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Existing conversation not found"));

            if (!existingConversation.isActive()) {
                existingConversation.setActive(true);
                return conversationRepository.save(existingConversation);
            }

            return existingConversation;
        }

        return conversationRepository.save(conversation);
    }

    public List<Conversation> getConversationsByUserId(String userId) {
        String normalized = userId.trim().toLowerCase();
        return conversationRepository.findByUser1IdOrUser2Id(normalized, normalized)
                .stream()
                .filter(Conversation::isActive)
                .toList();
    }

    public List<Conversation> getArchivedConversationsByUserId(String userId) {
        String normalized = userId.trim().toLowerCase();
        return conversationRepository.findByUser1IdOrUser2Id(normalized, normalized)
                .stream()
                .filter(conversation -> !conversation.isActive())
                .toList();
    }

    public Optional<Conversation> getConversationById(Long id) {
        return conversationRepository.findById(id);
    }

    public Conversation toggleConversationStatus(Long id, boolean status) {
        return conversationRepository.findById(id).map(conv -> {
            conv.setActive(status);
            return conversationRepository.save(conv);
        }).orElseThrow(() -> new RuntimeException("Conversation not found"));
    }

    public void deleteConversation(Long id) {
        conversationRepository.deleteById(id);
    }

    @Transactional
    public void updateEmailReferences(String oldEmail, String newEmail) {
        String previous = normalizeEmail(oldEmail);
        String replacement = normalizeEmail(newEmail);
        if (previous == null || replacement == null || previous.equals(replacement)) {
            return;
        }

        List<Conversation> conversations = conversationRepository
                .findByUser1IdIgnoreCaseOrUser2IdIgnoreCase(previous, previous);
        conversations.forEach(conversation -> {
            if (previous.equalsIgnoreCase(conversation.getUser1Id())) {
                conversation.setUser1Id(replacement);
            }
            if (previous.equalsIgnoreCase(conversation.getUser2Id())) {
                conversation.setUser2Id(replacement);
            }
        });
        conversationRepository.saveAll(conversations);

        List<Message> messages = messageRepository.findBySenderIdIgnoreCase(previous);
        messages.forEach(message -> message.setSenderId(replacement));
        messageRepository.saveAll(messages);
    }

    private String normalizeEmail(String email) {
        if (email == null || email.trim().isEmpty()) {
            return null;
        }
        return email.trim().toLowerCase();
    }
}
