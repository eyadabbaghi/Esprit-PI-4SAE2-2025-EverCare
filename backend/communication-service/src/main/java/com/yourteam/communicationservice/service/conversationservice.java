package com.yourteam.communicationservice.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import com.yourteam.communicationservice.entity.Conversation;
import com.yourteam.communicationservice.Repository.ConversationRepository;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor

public class conversationservice {

    private final ConversationRepository conversationRepository;

    // Créer une conversation privée [cite: 4]
    public Conversation createConversation(Conversation conversation) {
        // Vérification de l'existence dans les deux sens
        boolean exists = conversationRepository.existsByUser1IdAndUser2Id(conversation.getUser1Id(), conversation.getUser2Id()) ||
                conversationRepository.existsByUser1IdAndUser2Id(conversation.getUser2Id(), conversation.getUser1Id());

        if (exists) {
            // Optionnel : Récupérer et retourner la conversation existante au lieu d'une erreur
            return conversationRepository.findByUser1IdOrUser2Id(conversation.getUser1Id(), conversation.getUser1Id())
                    .stream()
                    .filter(c -> (c.getUser1Id().equals(conversation.getUser2Id()) || c.getUser2Id().equals(conversation.getUser2Id())))
                    .findFirst()
                    .orElseThrow(() -> new RuntimeException("Erreur lors de la récupération de la conversation existante"));
        }

        return conversationRepository.save(conversation);
    }

    // Récupérer la liste pour un utilisateur spécifique [cite: 5]
    public List<Conversation> getConversationsByUserId(String userId) {
        return conversationRepository.findByUser1IdOrUser2Id(userId, userId);
    }

    // Voir les détails d'une conversation [cite: 5]
    public Optional<Conversation> getConversationById(Long id) {
        return conversationRepository.findById(id);
    }

    // Archiver (deactivate) une conversation
    public Conversation toggleConversationStatus(Long id, boolean status) {
        return conversationRepository.findById(id).map(conv -> {
            conv.setActive(status);
            return conversationRepository.save(conv);
        }).orElseThrow(() -> new RuntimeException("Conversation non trouvée"));
    }

    // Supprimer une conversation [cite: 7]
    public void deleteConversation(Long id) {
        conversationRepository.deleteById(id);
    }
}