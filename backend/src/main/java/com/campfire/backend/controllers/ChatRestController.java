package com.campfire.backend.controllers;

import com.campfire.backend.models.Message;
import com.campfire.backend.models.Room;
import com.campfire.backend.models.User;
import com.campfire.backend.repositories.MessageRepository;
import com.campfire.backend.repositories.RoomRepository;
import com.campfire.backend.repositories.UserRepository;
import com.campfire.backend.utils.EncryptionService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chat")
public class ChatRestController {

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private EncryptionService encryptionService;

    private String getUserId() {
        return (String) SecurityContextHolder.getContext().getAuthentication().getCredentials();
    }

    @Data
    public static class CreateRoomRequest {
        private String roomId;
    }

    @PostMapping("/rooms")
    public ResponseEntity<?> createRoom(@RequestBody CreateRoomRequest request) {
        try {
            if (request.getRoomId() == null || request.getRoomId().trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Invalid room ID"));
            }
            if (roomRepository.findByName(request.getRoomId()).isPresent()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Room already exists"));
            }
            Room room = new Room();
            room.setName(request.getRoomId());
            roomRepository.save(room);
            return ResponseEntity.ok(Map.of("roomId", room.getName()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/rooms/{roomId}/join")
    public ResponseEntity<?> joinRoom(@PathVariable String roomId) {
        try {
            Room room = roomRepository.findByName(roomId).orElse(null);
            if (room == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Room not found"));

            User user = userRepository.findById(getUserId()).orElse(null);
            if (user == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));

            // SECURITY
            if (room.getAllowed_members() != null && !room.getAllowed_members().isEmpty()) {
                if (!room.getAllowed_members().contains(user.getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Unauthorized to join this room"));
                }
            }

            if (!user.getJoined_rooms().contains(room.getId())) {
                user.getJoined_rooms().add(room.getId());
                userRepository.save(user);
            }

            List<Message> messages = messageRepository.findByRoomIdOrderByCreatedAtAsc(room.getId());
            List<Map<String, Object>> history = messages.stream().map(msg -> {
                Map<String, Object> map = new HashMap<>();
                map.put("username", msg.getSender() != null ? msg.getSender().getUsername() : "Unknown");
                map.put("message", encryptionService.decryptMessage(msg.getContent()));
                map.put("timestamp", msg.getCreatedAt());
                return map;
            }).collect(Collectors.toList());

            return ResponseEntity.ok(Map.of("roomId", room.getName(), "history", history));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }
}
