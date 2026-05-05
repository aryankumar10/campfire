package com.campfire.backend.models;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DBRef;

import java.util.ArrayList;
import java.util.List;

@Data
@Document(collection = "projects")
public class Project {
    @Id
    private String id;
    private String title;
    private String description;
    @DBRef
    private User created_by;
    private List<ProjectMember> members = new ArrayList<>();

    @Data
    public static class ProjectMember {
        @DBRef
        private User user;
        private String role;
    }
}
