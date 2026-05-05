package com.campfire.backend.repositories;

import com.campfire.backend.models.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import java.util.Optional;
import java.util.List;

public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByUsername(String username);

    @Query("{$or: [ {'username': {$regex : ?0, $options: 'i'}}, {'name': {$regex : ?0, $options: 'i'}} ] }")
    List<User> searchByKeyword(String keyword);
}
