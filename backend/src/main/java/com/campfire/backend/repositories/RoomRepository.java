package com.campfire.backend.repositories;

import com.campfire.backend.models.Room;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface RoomRepository extends MongoRepository<Room, String> {
    Optional<Room> findByName(String name);
    Optional<Room> findByProjectId(String projectId);
}
