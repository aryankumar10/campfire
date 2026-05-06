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
    private String projectId;
    private LocalDateTime createdAt = LocalDateTime.now();
}
