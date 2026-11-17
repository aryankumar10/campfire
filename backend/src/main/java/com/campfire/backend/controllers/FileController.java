package com.campfire.backend.controllers;

import com.campfire.backend.models.Room;
import com.campfire.backend.models.User;
import com.campfire.backend.repositories.RoomRepository;
import com.campfire.backend.repositories.UserRepository;
import com.campfire.backend.services.S3Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/files")
public class FileController {

    @Autowired
    private S3Service s3Service;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    private String getUserId() {
        return (String) SecurityContextHolder.getContext().getAuthentication().getCredentials();
    }

    @PostMapping("/presign")
    public ResponseEntity<?> getPresignedUploadUrl(@RequestParam String roomId,
                                                    @RequestParam String filename,
                                                    @RequestParam(required = false) String contentType) {
        try {
            Room room = roomRepository.findByName(roomId).orElse(null);
            if (room == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(Map.of("message", "Room not found"));
            }

            if (room.getAllowed_members() != null && !room.getAllowed_members().isEmpty()) {
                String userId = getUserId();
                if (!room.getAllowed_members().contains(userId)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN)
                            .body(Map.of("message", "Unauthorized to access this room"));
                }
            }

            String safeFilename = filename.replaceAll("[^a-zA-Z0-9._\\-]", "_");
            String fileKey = String.format("uploads/%s/%s-%s", roomId, UUID.randomUUID(), safeFilename);

            String uploadUrl = s3Service.generateUploadUrl(fileKey, contentType);

            return ResponseEntity.ok(Map.of(
                    "uploadUrl", uploadUrl,
                    "fileKey", fileKey
            ));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/url")
    public ResponseEntity<?> getDownloadUrl(@RequestParam String key) {
        try {
            if (key == null || key.trim().isEmpty()) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(Map.of("message", "Key cannot be empty"));
            }

            if (!key.startsWith("uploads/") && !key.startsWith("thumbnails/")) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("message", "Invalid key prefix"));
            }

            String downloadUrl = s3Service.generateDownloadUrl(key);
            return ResponseEntity.ok(Map.of("url", downloadUrl));

        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", e.getMessage()));
        }
    }
}
