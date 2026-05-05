package com.campfire.backend.repositories;

import com.campfire.backend.models.Todo;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface TodoRepository extends MongoRepository<Todo, String> {
    List<Todo> findByProjectId(String projectId);
}
