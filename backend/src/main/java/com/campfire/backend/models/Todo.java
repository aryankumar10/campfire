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
    private String status = "todo";
    @DBRef
    private User assigned_to;
    private LocalDateTime deadline;
}
