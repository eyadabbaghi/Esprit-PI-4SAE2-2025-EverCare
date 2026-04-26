package com.yourteam.communicationservice.service;



import lombok.RequiredArgsConstructor;

import lombok.extern.slf4j.Slf4j; // Optionnel : pour le debug

import org.springframework.messaging.simp.SimpMessagingTemplate;

import org.springframework.stereotype.Service;

import com.yourteam.communicationservice.entity.*;

import com.yourteam.communicationservice.Repository.*;

import java.time.Duration;

import java.time.LocalDateTime;



@Service

@RequiredArgsConstructor

@Slf4j // Permet d'utiliser log.info ou log.error

public class CallService {



    private final CallRepository callRepository;

    private final ConversationRepository conversationRepository;

    private final MessageRepository messageRepository;

    private final SimpMessagingTemplate messagingTemplate;



    public Call startCall(Long conversationId, String callerId) {

// 1. Récupération de la conversation

        Conversation conv = conversationRepository.findById(conversationId)

                .orElseThrow(() -> new RuntimeException("Conversation non trouvée"));



// 2. Identification du destinataire

        String receiverId = conv.getUser1Id().equals(callerId) ? conv.getUser2Id() : conv.getUser1Id();



// 3. RÈGLE 1 : Vérifier si le destinataire est déjà en appel

        if (callRepository.isUserInActiveCall(receiverId)) {

            throw new IllegalStateException("USER_BUSY");

        }



// 4. RÈGLE 2 : Anti-harcèlement (max 5 messages non lus envoyés par l'appelant)

        long unreadCount = messageRepository.countUnreadMessagesBySender(conversationId, callerId);

        if (unreadCount >= 5) {

            throw new IllegalStateException("TOO_MANY_UNREAD");

        }



// 5. Création et sauvegarde de l'appel

        Call call = Call.builder()

                .conversation(conv)

                .callerId(callerId)

                .status(CallStatus.INITIATED)

                .startTime(LocalDateTime.now())

                .build();



        Call savedCall = callRepository.save(call);



// 6. Notification WebSocket

// On s'assure d'envoyer l'objet sauvegardé sur le topic de la conversation

        log.info("Envoi d'une notification d'appel sur le topic: /topic/calls/{}", conversationId);

        messagingTemplate.convertAndSend("/topic/calls/" + conversationId, savedCall);



        return savedCall;

    }



    public Call endCall(Long callId) {

        Call call = callRepository.findById(callId)

                .orElseThrow(() -> new RuntimeException("Appel non trouvé"));



// 1. Mise à jour des informations de fin d'appel

        call.setEndTime(LocalDateTime.now());

        call.setStatus(CallStatus.COMPLETED);



// Calcul de la durée

        if (call.getStartTime() != null) {

            long seconds = Duration.between(call.getStartTime(), call.getEndTime()).getSeconds();

            call.setDurationInSeconds(seconds);

        }



// 2. Sauvegarde des modifications

        Call updatedCall = callRepository.save(call);



// 3. Notification de fin d'appel aux participants

        Long conversationId = updatedCall.getConversation().getId();

        log.info("Envoi notification fin d'appel pour la conversation: {}", conversationId);

        messagingTemplate.convertAndSend("/topic/calls/" + conversationId, updatedCall);



        return updatedCall;

    }}