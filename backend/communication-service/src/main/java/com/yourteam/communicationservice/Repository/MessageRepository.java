package com.yourteam.communicationservice.Repository; // Vérifie bien la majuscule sur Repository selon ton dossier



import com.yourteam.communicationservice.DTO.MessageSearchDTO;

import org.springframework.data.jpa.repository.JpaRepository;

import com.yourteam.communicationservice.entity.Message; // Import corrigé ici

import org.springframework.data.jpa.repository.Query;

import org.springframework.data.repository.query.Param;



import java.util.List;



public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByConversationIdOrderBySentAtAsc(Long conversationId);



// Recherche globale filtrée par utilisateur

    @Query("SELECT new com.yourteam.communicationservice.DTO.MessageSearchDTO(m.id, m.content, m.senderId, m.sentAt, CAST(c.id AS string)) " +

            "FROM Message m JOIN m.conversation c WHERE " +

            "(c.user1Id = :userId OR c.user2Id = :userId) AND " +

            "LOWER(m.content) LIKE LOWER(CONCAT('%', :keyword, '%')) " +

            "ORDER BY m.sentAt DESC")



    List<MessageSearchDTO> searchMessagesGlobally(@Param("userId") String userId, @Param("keyword") String keyword);

    @Query("SELECT COUNT(m) FROM Message m WHERE m.conversation.id = :convId AND m.senderId = :senderId AND m.isRead = false")

    long countUnreadMessagesBySender(@Param("convId") Long convId, @Param("senderId") String senderId);

}