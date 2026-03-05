package everCare.appointments.controllers;

import everCare.appointments.dtos.RoomDTO;
import everCare.appointments.dtos.SignalingMessageDTO;
import everCare.appointments.services.VideoConsultationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/video")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class VideoConsultationController {

    private final VideoConsultationService videoService;

    @PostMapping("/rooms")
    public ResponseEntity<?> createRoom(@RequestBody Map<String, String> request) {
        try {
            String appointmentId = request.get("appointmentId");
            String userId = request.get("userId");

            RoomDTO room = videoService.createRoom(appointmentId, userId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("room", room);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/rooms/{roomId}/join")
    public ResponseEntity<?> joinRoom(@PathVariable String roomId, @RequestBody Map<String, String> request) {
        try {
            String userId = request.get("userId");
            RoomDTO room = videoService.joinRoom(roomId, userId);

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "room", room
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/rooms/{roomId}/leave")
    public ResponseEntity<?> leaveRoom(@PathVariable String roomId, @RequestBody Map<String, String> request) {
        try {
            String userId = request.get("userId");
            videoService.leaveRoom(roomId, userId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    @PostMapping("/rooms/{roomId}/end")
    public ResponseEntity<?> endRoom(@PathVariable String roomId, @RequestBody Map<String, String> request) {
        try {
            String userId = request.get("userId");
            videoService.endRoom(roomId, userId);
            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "error", e.getMessage()
            ));
        }
    }

    @GetMapping("/rooms/{roomId}")
    public ResponseEntity<?> getRoom(@PathVariable String roomId) {
        try {
            RoomDTO room = videoService.getRoom(roomId);
            return ResponseEntity.ok(room);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/appointments/{appointmentId}/room")
    public ResponseEntity<?> getRoomByAppointment(@PathVariable String appointmentId) {
        try {
            RoomDTO room = videoService.getRoomByAppointment(appointmentId);
            return ResponseEntity.ok(room);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
}