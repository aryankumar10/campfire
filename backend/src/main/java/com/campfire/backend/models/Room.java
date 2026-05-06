package com.campfire.backend.models;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.util.ArrayList;
import java.util.List;

@Data
@Document(collection = "rooms")
public class Room {
    @Id
    private String id;
    private String name;
    private String projectId;
    private List<String> allowed_members = new ArrayList<>();
}
