package com.campfire.backend.models;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DBRef;

import java.time.LocalDateTime;

@Data
@Document(collection = "messages")
public class Message {
    @Id
    private String id;
    @DBRef
    private Room roomId;
    @DBRef
    private User sender;
    private String content;
    @DBRef
    private Project project;
    private LocalDateTime createdAt = LocalDateTime.now();

    /**
     * S3 object key for an attached file, e.g. "uploads/roomId/uuid-photo.jpg".
     * Null when the message has no attachment.
     * The thumbnail lives at the same key under the "thumbnails/" prefix.
     */
    private String fileKey;
}
