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
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.security.Principal;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

@Controller
public class ChatWebSocketController {

    @Autowired
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private EncryptionService encryptionService;

    @Data
    public static class ChatMessagePayload {
        private String message;
    }

    @MessageMapping("/chat/{roomId}")
    public void sendMessage(@DestinationVariable String roomId, @Payload ChatMessagePayload payload, Principal principal) {
        if (principal == null) return;
        
        // principal.getName() is the username in our JwtFilter
        String username = principal.getName();
        
        try {
            Room room = roomRepository.findByName(roomId).orElse(null);
            User user = userRepository.findByUsername(username).orElse(null);
            
            if (room == null || user == null) return;

            if (room.getAllowed_members() != null && !room.getAllowed_members().isEmpty()) {
                if (!room.getAllowed_members().contains(user.getId())) return;
            }

            Message msg = new Message();
            msg.setRoomId(room);
            msg.setSender(user);
            msg.setProject(room.getProject());
            msg.setContent(encryptionService.encryptMessage(payload.getMessage()));
            msg.setCreatedAt(LocalDateTime.now());
            
            messageRepository.save(msg);

            Map<String, Object> outgoing = new HashMap<>();
            outgoing.put("username", user.getUsername());
            outgoing.put("message", payload.getMessage());
            outgoing.put("timestamp", msg.getCreatedAt());

            messagingTemplate.convertAndSend("/topic/room." + roomId, outgoing);
        } catch (Exception e) {
            e.printStackTrace();
        }
    }
}
