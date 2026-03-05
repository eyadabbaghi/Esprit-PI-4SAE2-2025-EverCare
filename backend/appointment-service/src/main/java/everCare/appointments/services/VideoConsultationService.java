package everCare.appointments.services;

import everCare.appointments.entities.Appointment;
import everCare.appointments.entities.ConsultationRoom;
import everCare.appointments.entities.User;
import everCare.appointments.dtos.RoomDTO;
import everCare.appointments.dtos.SignalingMessageDTO;
import everCare.appointments.repositories.AppointmentRepository;
import everCare.appointments.repositories.ConsultationRoomRepository;
import everCare.appointments.repositories.UserRepository;
import everCare.appointments.exceptions.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class VideoConsultationService {

    private final ConsultationRoomRepository roomRepository;
    private final AppointmentRepository appointmentRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public RoomDTO createRoom(String appointmentId, String userId) {
        // Check if room already exists
        var existingRoom = roomRepository.findByAppointment_AppointmentId(appointmentId);
        if (existingRoom.isPresent()) {
            return convertToDTO(existingRoom.get());
        }

        // Get appointment
        Appointment appointment = appointmentRepository.findById(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Appointment not found"));

        // Verify user is authorized
        if (!userId.equals(appointment.getDoctor().getUserId()) &&
                !userId.equals(appointment.getPatient().getUserId()) &&
                (appointment.getCaregiver() == null || !userId.equals(appointment.getCaregiver().getUserId()))) {
            throw new RuntimeException("Not authorized to create room for this appointment");
        }

        // Create new room
        ConsultationRoom room = new ConsultationRoom();
        room.setAppointment(appointment);
        room.setDoctorId(appointment.getDoctor().getUserId());
        room.setPatientId(appointment.getPatient().getUserId());
        if (appointment.getCaregiver() != null) {
            room.setCaregiverId(appointment.getCaregiver().getUserId());
        }
        room.setActive(true);

        ConsultationRoom savedRoom = roomRepository.save(room);
        log.info("✅ Created consultation room: {} for appointment: {}", savedRoom.getRoomId(), appointmentId);

        return convertToDTO(savedRoom);
    }

    @Transactional
    public RoomDTO joinRoom(String roomId, String userId) {
        ConsultationRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found"));

        if (!room.isActive()) {
            throw new RuntimeException("Room is no longer active");
        }

        if (!room.canJoin(userId)) {
            throw new RuntimeException("User not authorized to join this room");
        }

        if (!room.getParticipants().contains(userId)) {
            room.addParticipant(userId);
            roomRepository.save(room);
            log.info("✅ User {} joined room {}", userId, roomId);

            // Notify others in the room
            SignalingMessageDTO joinMessage = new SignalingMessageDTO();
            joinMessage.setType("participant-joined");
            joinMessage.setSenderId(userId);
            joinMessage.setRoomId(roomId);
            broadcastToRoom(roomId, joinMessage);
        }

        return convertToDTO(room);
    }

    @Transactional
    public void leaveRoom(String roomId, String userId) {
        ConsultationRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found"));

        room.removeParticipant(userId);
        roomRepository.save(room);
        log.info("👋 User {} left room {}", userId, roomId);

        // Notify others
        SignalingMessageDTO leaveMessage = new SignalingMessageDTO();
        leaveMessage.setType("participant-left");
        leaveMessage.setSenderId(userId);
        leaveMessage.setRoomId(roomId);
        broadcastToRoom(roomId, leaveMessage);

        // If room is empty, deactivate it
        if (room.getParticipants().isEmpty()) {
            room.setActive(false);
            roomRepository.save(room);
            log.info("🚪 Room {} deactivated (empty)", roomId);
        }
    }

    @Transactional
    public void endRoom(String roomId, String userId) {
        ConsultationRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found"));

        // Only doctor or patient can end the room
        if (!userId.equals(room.getDoctorId()) && !userId.equals(room.getPatientId())) {
            throw new RuntimeException("Only doctor or patient can end the consultation");
        }

        room.setActive(false);
        roomRepository.save(room);
        log.info("🏁 Room {} ended by user {}", roomId, userId);

        // Notify all participants
        SignalingMessageDTO endMessage = new SignalingMessageDTO();
        endMessage.setType("room-ended");
        endMessage.setSenderId(userId);
        endMessage.setRoomId(roomId);
        broadcastToRoom(roomId, endMessage);
    }

    public RoomDTO getRoom(String roomId) {
        ConsultationRoom room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found"));
        return convertToDTO(room);
    }

    public RoomDTO getRoomByAppointment(String appointmentId) {
        ConsultationRoom room = roomRepository.findByAppointment_AppointmentId(appointmentId)
                .orElseThrow(() -> new ResourceNotFoundException("No room found for this appointment"));
        return convertToDTO(room);
    }

    public void handleSignaling(SignalingMessageDTO message) {
        log.debug("📨 Signaling message: {} from {} to {}",
                message.getType(), message.getSenderId(), message.getTargetId());

        if (message.getTargetId() != null) {
            // Send to specific user
            messagingTemplate.convertAndSendToUser(
                    message.getTargetId(),
                    "/queue/video",
                    message
            );
        } else {
            // Broadcast to all in room (except sender)
            broadcastToRoom(message.getRoomId(), message);
        }
    }

    private void broadcastToRoom(String roomId, SignalingMessageDTO message) {
        messagingTemplate.convertAndSend("/topic/room/" + roomId, message);
    }

    private RoomDTO convertToDTO(ConsultationRoom room) {
        RoomDTO dto = new RoomDTO();
        dto.setRoomId(room.getRoomId());
        dto.setAppointmentId(room.getAppointment().getAppointmentId());
        dto.setDoctorId(room.getDoctorId());
        dto.setDoctorName(room.getAppointment().getDoctor().getName());
        dto.setPatientId(room.getPatientId());
        dto.setPatientName(room.getAppointment().getPatient().getName());
        if (room.getCaregiverId() != null && room.getAppointment().getCaregiver() != null) {
            dto.setCaregiverId(room.getCaregiverId());
            dto.setCaregiverName(room.getAppointment().getCaregiver().getName());
        }
        dto.setParticipants(room.getParticipants());
        dto.setCreatedAt(room.getCreatedAt());
        dto.setExpiresAt(room.getExpiresAt());
        dto.setActive(room.isActive());
        return dto;
    }
}