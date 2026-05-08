package com.yourteam.communicationservice.Repository;

import com.yourteam.communicationservice.entity.Call;
import com.yourteam.communicationservice.entity.CallStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface CallRepository extends JpaRepository<Call, Long> {
    List<Call> findByConversationId(Long conversationId);

    @Query("SELECT COUNT(c) > 0 FROM Call c JOIN c.conversation conv " +
            "WHERE (conv.user1Id = :userId OR conv.user2Id = :userId) " +
            "AND c.status IN (:initiated, :ongoing)")
    boolean isUserInActiveCall(@Param("userId") String userId,
                               @Param("initiated") CallStatus initiated,
                               @Param("ongoing") CallStatus ongoing);
}