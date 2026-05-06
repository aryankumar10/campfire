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

import java.util.*;
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

    /**
     * Resolves a Room by trying name first, then falling back to ID lookup.
     */
    private Room resolveRoom(String ref) {
        return roomRepository.findByName(ref)
                .orElseGet(() -> roomRepository.findById(ref).orElse(null));
    }

    @Data
    public static class CreateRoomRequest {
        private String roomId;      // kept for backwards compat
        private String roomName;    // preferred field
        private String projectId;   // optional project association
        private List<String> memberIds; // optional user IDs to invite
    }

    /**
     * GET /api/chat/rooms — returns all rooms the current user has joined,
     * with member info for each room.
     */
    @GetMapping("/rooms")
    public ResponseEntity<?> listUserRooms() {
        try {
            User user = userRepository.findById(getUserId()).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
            }

            // Resolve all rooms the user belongs to
            List<Room> userRooms = new ArrayList<>();
            List<String> normalizedNames = new ArrayList<>();

            for (String ref : user.getJoined_rooms()) {
                Room room = resolveRoom(ref);
                if (room != null) {
                    userRooms.add(room);
                    normalizedNames.add(room.getName());
                }
            }

            // Normalize user's joined_rooms to names if any were ObjectIds
            if (!normalizedNames.equals(user.getJoined_rooms())) {
                user.setJoined_rooms(normalizedNames);
                userRepository.save(user);
            }

            // Build all users list once for member lookups
            List<User> allUsers = userRepository.findAll();

            List<Map<String, Object>> result = new ArrayList<>();
            for (Room room : userRooms) {
                List<Map<String, String>> members = allUsers.stream()
                        .filter(u -> u.getJoined_rooms().contains(room.getName())
                                || u.getJoined_rooms().contains(room.getId()))
                        .map(u -> {
                            Map<String, String> m = new HashMap<>();
                            m.put("id", u.getId());
                            m.put("name", u.getName());
                            m.put("username", u.getUsername());
                            return m;
                        })
                        .collect(Collectors.toList());

                Map<String, Object> info = new HashMap<>();
                info.put("id", room.getId());
                info.put("name", room.getName());
                info.put("members", members);
                info.put("isProjectRoom", room.getProjectId() != null && !room.getProjectId().isEmpty());
                result.add(info);
            }

            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/rooms")
    public ResponseEntity<?> createRoom(@RequestBody CreateRoomRequest request) {
        try {
            // Accept roomName (preferred) or roomId (backwards compat)
            String name = request.getRoomName() != null ? request.getRoomName().trim()
                        : request.getRoomId() != null ? request.getRoomId().trim() : "";
            if (name.isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "Room name is required"));
            }
            if (roomRepository.findByName(name).isPresent()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("message", "A room with this name already exists"));
            }

            Room room = new Room();
            room.setName(name);

            // Optional project association
            if (request.getProjectId() != null && !request.getProjectId().trim().isEmpty()) {
                room.setProjectId(request.getProjectId().trim());
            }

            // Creator always allowed
            String creatorId = getUserId();
            room.getAllowed_members().add(creatorId);

            // Add specified members
            if (request.getMemberIds() != null) {
                for (String uid : request.getMemberIds()) {
                    if (!room.getAllowed_members().contains(uid)) {
                        room.getAllowed_members().add(uid);
                    }
                }
            }

            roomRepository.save(room);

            // Auto-join the creator
            User user = userRepository.findById(creatorId).orElse(null);
            if (user != null && !user.getJoined_rooms().contains(room.getName())) {
                user.getJoined_rooms().add(room.getName());
                userRepository.save(user);
            }

            return ResponseEntity.ok(Map.of("roomId", room.getName()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/rooms/{roomId}/join")
    public ResponseEntity<?> joinRoom(@PathVariable String roomId) {
        try {
            Room room = resolveRoom(roomId);
            if (room == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Room not found"));
            }

            User user = userRepository.findById(getUserId()).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
            }

            // SECURITY: check allowed_members restriction
            if (room.getAllowed_members() != null && !room.getAllowed_members().isEmpty()) {
                if (!room.getAllowed_members().contains(user.getId())) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("message", "Unauthorized to join this room"));
                }
            }

            // Normalize: store room NAME, remove stale ObjectId if present
            user.getJoined_rooms().remove(room.getId());
            if (!user.getJoined_rooms().contains(room.getName())) {
                user.getJoined_rooms().add(room.getName());
            }
            userRepository.save(user);

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
