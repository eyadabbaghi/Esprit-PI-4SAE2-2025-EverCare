package com.yourteam.communicationservice.Repository;



import com.yourteam.communicationservice.entity.Conversation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    // Cette méthode permet de trouver toutes les conversations d'un utilisateur
    // que son ID soit en position 1 ou 2.
    List<Conversation> findByUser1IdOrUser2Id(String user1Id, String user2Id);
    // Ajoute ceci pour l'unicité
    boolean existsByUser1IdAndUser2Id(String user1Id, String user2Id);
}
