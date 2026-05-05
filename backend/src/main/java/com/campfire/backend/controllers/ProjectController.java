package com.campfire.backend.controllers;

import com.campfire.backend.models.Project;
import com.campfire.backend.models.Room;
import com.campfire.backend.models.User;
import com.campfire.backend.repositories.ProjectRepository;
import com.campfire.backend.repositories.RoomRepository;
import com.campfire.backend.repositories.UserRepository;
import lombok.Data;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/projects")
public class ProjectController {

    @Autowired
    private ProjectRepository projectRepository;

    @Autowired
    private RoomRepository roomRepository;

    @Autowired
    private UserRepository userRepository;

    private String getUserId() {
        return (String) SecurityContextHolder.getContext().getAuthentication().getCredentials();
    }

    @GetMapping
    public ResponseEntity<?> getProjects() {
        try {
            List<Project> projects = projectRepository.findByMemberUserId(getUserId());
            return ResponseEntity.ok(projects);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @Data
    public static class CreateProjectRequest {
        private String title;
        private String description;
    }

    @PostMapping
    public ResponseEntity<?> createProject(@RequestBody CreateProjectRequest request) {
        try {
            User user = userRepository.findById(getUserId()).orElse(null);
            if (user == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).build();

            Project project = new Project();
            project.setTitle(request.getTitle());
            project.setDescription(request.getDescription());
            project.setCreated_by(user);

            Project.ProjectMember member = new Project.ProjectMember();
            member.setUser(user);
            member.setRole("Leader");
            project.getMembers().add(member);

            project = projectRepository.save(project);

            Room room = new Room();
            room.setName("project-" + project.getId());
            room.setProject(project);
            room.getAllowed_members().add(user.getId());
            roomRepository.save(room);

            return ResponseEntity.status(HttpStatus.CREATED).body(project);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @Data
    public static class AddMemberRequest {
        private String userId;
    }

    @PostMapping("/{projectId}/members")
    public ResponseEntity<?> addMember(@PathVariable String projectId, @RequestBody AddMemberRequest request) {
        try {
            Project project = projectRepository.findById(projectId).orElse(null);
            if (project == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Project not found"));

            boolean isLeader = project.getMembers().stream()
                    .anyMatch(m -> m.getUser().getId().equals(getUserId()) && "Leader".equals(m.getRole()));

            if (!isLeader) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Only leaders can add members"));

            User newUser = userRepository.findById(request.getUserId()).orElse(null);
            if (newUser == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "User not found"));

            boolean exists = project.getMembers().stream().anyMatch(m -> m.getUser().getId().equals(request.getUserId()));
            if (!exists) {
                Project.ProjectMember member = new Project.ProjectMember();
                member.setUser(newUser);
                member.setRole("Member");
                project.getMembers().add(member);
                projectRepository.save(project);

                Room room = roomRepository.findByProjectId(project.getId()).orElse(null);
                if (room != null && !room.getAllowed_members().contains(newUser.getId())) {
                    room.getAllowed_members().add(newUser.getId());
                    roomRepository.save(room);
                }
            }

            return ResponseEntity.ok(project);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @Data
    public static class UpdateRoleRequest {
        private String role;
    }

    @PutMapping("/{projectId}/members/{userId}")
    public ResponseEntity<?> updateMemberRole(@PathVariable String projectId, @PathVariable String userId, @RequestBody UpdateRoleRequest request) {
        try {
            Project project = projectRepository.findById(projectId).orElse(null);
            if (project == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Project not found"));

            boolean isLeader = project.getMembers().stream()
                    .anyMatch(m -> m.getUser().getId().equals(getUserId()) && "Leader".equals(m.getRole()));

            if (!isLeader) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Only leaders can update roles"));

            Optional<Project.ProjectMember> targetMember = project.getMembers().stream().filter(m -> m.getUser().getId().equals(userId)).findFirst();
            if (targetMember.isEmpty()) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Member not found in project"));

            targetMember.get().setRole(request.getRole());
            projectRepository.save(project);

            return ResponseEntity.ok(project);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{projectId}/members/{userId}")
    public ResponseEntity<?> removeMember(@PathVariable String projectId, @PathVariable String userId) {
        try {
            Project project = projectRepository.findById(projectId).orElse(null);
            if (project == null) return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("message", "Project not found"));

            boolean isLeader = project.getMembers().stream()
                    .anyMatch(m -> m.getUser().getId().equals(getUserId()) && "Leader".equals(m.getRole()));

            if (!isLeader) return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", "Only leaders can remove members"));

            project.getMembers().removeIf(m -> m.getUser().getId().equals(userId));
            projectRepository.save(project);

            Room room = roomRepository.findByProjectId(project.getId()).orElse(null);
            if (room != null) {
                room.getAllowed_members().remove(userId);
                roomRepository.save(room);
            }

            return ResponseEntity.ok(project);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", e.getMessage()));
        }
    }
}
