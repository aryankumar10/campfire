package com.campfire.backend.controllers;

import com.campfire.backend.models.User;
import com.campfire.backend.repositories.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    private String getUserId() {
        return (String) SecurityContextHolder.getContext().getAuthentication().getCredentials();
    }

    @GetMapping("/me")
    public ResponseEntity<?> getMe() {
        try {
            User user = userRepository.findById(getUserId()).orElse(null);
            if (user == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));
            }
            // Clear password before sending
            user.setPassword(null);
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> searchUsers(@RequestParam(required = false) String search) {
        try {
            List<User> users;
            if (search != null && !search.trim().isEmpty()) {
                users = userRepository.searchByKeyword(search);
            } else {
                users = userRepository.findAll();
            }

            String currentUserId = getUserId();
            List<User> filtered = users.stream()
                    .filter(u -> !u.getId().equals(currentUserId))
                    .peek(u -> u.setPassword(null))
                    .collect(Collectors.toList());

            return ResponseEntity.ok(filtered);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }
}
