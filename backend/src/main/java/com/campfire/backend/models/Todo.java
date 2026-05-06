package com.campfire.backend.models;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DBRef;

import java.time.LocalDateTime;

@Data
@Document(collection = "todos")
public class Todo {
    @Id
    private String id;
    @DBRef
    private Project project;
    private String title;
    private String description;
    private String status = "todo"; // "todo", "in-progress", "done"
    private String priority = "medium"; // "low", "medium", "high", "urgent"
    @DBRef
    private User assigned_to;
    @DBRef
    private User assigned_by;
    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime completedAt;
    private LocalDateTime deadline;
}
