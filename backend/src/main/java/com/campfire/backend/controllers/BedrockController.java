package com.campfire.backend.controllers;

import com.campfire.backend.models.Message;
import com.campfire.backend.models.Room;
import com.campfire.backend.repositories.MessageRepository;
import com.campfire.backend.repositories.RoomRepository;
import com.campfire.backend.services.BedrockService;
import com.campfire.backend.utils.EncryptionService;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/ai")
public class BedrockController {

    @Autowired
    private BedrockService bedrockService;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private MessageRepository messageRepository;

    @Autowired
    private EncryptionService encryptionService;

    private String getUsername() {
        return (String) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
    }

    @PostMapping("/rooms/{roomId}/summarize")
    public ResponseEntity<?> summarizeRoom(@PathVariable String roomId) {
        try {
            Room room = roomRepository.findByName(roomId).orElse(null);
            if (room == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Room not found"));
            }

            List<Map<String, String>> messages = loadDecryptedMessages(room);
            if (messages.isEmpty()) {
                return ResponseEntity.ok(Map.of("summary", "No messages to summarize yet."));
            }

            String summary = bedrockService.summarizeChat(messages, room.getName());
            return ResponseEntity.ok(Map.of("summary", summary, "messageCount", messages.size()));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @Data
    public static class AskRequest {
        private String question;
    }

    @PostMapping("/rooms/{roomId}/ask")
    public ResponseEntity<?> askQuestion(@PathVariable String roomId, @RequestBody AskRequest request) {
        try {
            if (request.getQuestion() == null || request.getQuestion().trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Question cannot be empty"));
            }

            Room room = roomRepository.findByName(roomId).orElse(null);
            if (room == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Room not found"));
            }

            List<Map<String, String>> messages = loadDecryptedMessages(room);
            if (messages.isEmpty()) {
                return ResponseEntity.ok(Map.of("answer", "No messages found in this room."));
            }

            String answer = bedrockService.answerQuestion(messages, request.getQuestion(), room.getName(), getUsername());
            return ResponseEntity.ok(Map.of(
                    "question", request.getQuestion(),
                    "answer", answer,
                    "contextMessages", messages.size()
            ));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    private List<Map<String, String>> loadDecryptedMessages(Room room) {
        List<Message> rawMessages = messageRepository.findByRoomIdOrderByCreatedAtAsc(room.getId());
        return rawMessages.stream().map(msg -> Map.of(
                "username", msg.getSender() != null ? msg.getSender().getUsername() : "Unknown",
                "message", encryptionService.decryptMessage(msg.getContent())
        )).collect(Collectors.toList());
    }
}
