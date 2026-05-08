package com.yourteam.communicationservice.service;

import com.yourteam.communicationservice.Repository.CallRepository;
import com.yourteam.communicationservice.Repository.ConversationRepository;
import com.yourteam.communicationservice.Repository.MessageRepository;
import com.yourteam.communicationservice.entity.Call;
import com.yourteam.communicationservice.entity.CallStatus;
import com.yourteam.communicationservice.entity.Conversation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
@Slf4j
public class CallService {

    private final CallRepository callRepository;
    private final ConversationRepository conversationRepository;
    private final MessageRepository messageRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public Call startCall(Long conversationId, String callerId) {
        Conversation conv = conversationRepository.findById(conversationId)
                .orElseThrow(() -> new RuntimeException("Conversation non trouvée"));
        String receiverId = conv.getUser1Id().equals(callerId) ? conv.getUser2Id() : conv.getUser1Id();

        // ✅ Correction : passer les deux statuts requis
        if (callRepository.isUserInActiveCall(receiverId, CallStatus.INITIATED, CallStatus.ONGOING)) {
            throw new IllegalStateException("USER_BUSY");
        }
        long unreadCount = messageRepository.countUnreadMessagesBySender(conversationId, callerId);
        if (unreadCount >= 5) {
            throw new IllegalStateException("TOO_MANY_UNREAD");
        }

        Call call = Call.builder()
                .conversation(conv)
                .callerId(callerId)
                .status(CallStatus.INITIATED)
                .startTime(LocalDateTime.now())
                .build();
        Call savedCall = callRepository.save(call);
        log.info("Envoi d'une notification d'appel sur le topic: /topic/calls/{}", conversationId);
        messagingTemplate.convertAndSend("/topic/calls/" + conversationId, savedCall);
        return savedCall;
    }

    public Call endCall(Long callId) {
        Call call = callRepository.findById(callId)
                .orElseThrow(() -> new RuntimeException("Appel non trouvé"));
        call.setEndTime(LocalDateTime.now());
        call.setStatus(CallStatus.COMPLETED);
        if (call.getStartTime() != null) {
            long seconds = Duration.between(call.getStartTime(), call.getEndTime()).getSeconds();
            call.setDurationInSeconds(seconds);
        }
        Call updatedCall = callRepository.save(call);
        Long conversationId = updatedCall.getConversation().getId();
        log.info("Envoi notification fin d'appel pour la conversation: {}", conversationId);
        messagingTemplate.convertAndSend("/topic/calls/" + conversationId, updatedCall);
        return updatedCall;
    }
}