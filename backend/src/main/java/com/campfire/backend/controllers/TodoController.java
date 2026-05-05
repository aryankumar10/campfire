package com.campfire.backend.controllers;

import com.campfire.backend.models.Project;
import com.campfire.backend.models.Todo;
import com.campfire.backend.models.User;
import com.campfire.backend.repositories.ProjectRepository;
import com.campfire.backend.repositories.TodoRepository;
import com.campfire.backend.repositories.UserRepository;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/todos")
public class TodoController {

    @Autowired
    private TodoRepository todoRepository;

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private UserRepository userRepository;

    private String getUserId() {
        return (String) SecurityContextHolder.getContext().getAuthentication().getCredentials();
    }

    @GetMapping("/{projectId}")
    public ResponseEntity<?> getTodos(@PathVariable String projectId) {
        try {
            Project project = projectRepository.findById(projectId).orElse(null);
            if (project == null || project.getMembers().stream().noneMatch(m -> m.getUser().getId().equals(getUserId()))) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Not authorized"));
            }

            List<Todo> todos = todoRepository.findByProjectId(projectId);
            return ResponseEntity.ok(todos);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @Data
    public static class CreateTodoRequest {
        private String title;
        private String description;
        private String assigned_to;
    }

    @PostMapping("/{projectId}")
    public ResponseEntity<?> createTodo(@PathVariable String projectId, @RequestBody CreateTodoRequest request) {
        try {
            Project project = projectRepository.findById(projectId).orElse(null);
            if (project == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Project not found"));

            String currentUserId = getUserId();
            String userRole = project.getMembers().stream()
                    .filter(m -> m.getUser().getId().equals(currentUserId))
                    .map(Project.ProjectMember::getRole)
                    .findFirst()
                    .orElse(null);

            if (userRole == null) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Not a member"));

            String assignedToId = request.getAssigned_to();
            if (assignedToId == null || assignedToId.trim().isEmpty()) {
                assignedToId = currentUserId;
            }

            if (!assignedToId.equals(currentUserId)) {
                if ("Member".equals(userRole)) {
                    return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Members can only assign tasks to themselves"));
                }
                if ("Manager".equals(userRole)) {
                    final String targetId = assignedToId;
                    String targetRole = project.getMembers().stream()
                            .filter(m -> m.getUser().getId().equals(targetId))
                            .map(Project.ProjectMember::getRole)
                            .findFirst()
                            .orElse("Member");
                    if ("Leader".equals(targetRole) || "Manager".equals(targetRole)) {
                        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Managers can only assign tasks to Members"));
                    }
                }
            }

            User assignedUser = userRepository.findById(assignedToId).orElse(null);

            Todo todo = new Todo();
            todo.setProject(project);
            todo.setTitle(request.getTitle());
            todo.setDescription(request.getDescription());
            todo.setAssigned_to(assignedUser);

            todoRepository.save(todo);
            return ResponseEntity.status(HttpStatus.CREATED).body(todo);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @Data
    public static class UpdateStatusRequest {
        private String status;
    }

    @PutMapping("/{todoId}")
    public ResponseEntity<?> updateTodoStatus(@PathVariable String todoId, @RequestBody UpdateStatusRequest request) {
        try {
            Todo todo = todoRepository.findById(todoId).orElse(null);
            if (todo == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Todo not found"));

            todo.setStatus(request.getStatus());
            todoRepository.save(todo);

            return ResponseEntity.ok(todo);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }
}
