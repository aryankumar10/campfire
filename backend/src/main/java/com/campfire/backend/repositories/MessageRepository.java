package com.campfire.backend.repositories;

import com.campfire.backend.models.Message;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface MessageRepository extends MongoRepository<Message, String> {
    List<Message> findByRoomIdOrderByCreatedAtAsc(String roomId);
}
