// Shared type definitions for the Campfire application

export interface User {
  id: string;
  name: string;
  username: string;
  joined_rooms: string[];
}

export interface ProjectMember {
  user: User;
  role: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  members: ProjectMember[];
}

export interface Todo {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  assigned_to?: User;
  assigned_by?: User;
  createdAt?: string;
  completedAt?: string;
  deadline?: string;
}

export interface ChatMessage {
  username: string;
  message: string;
  timestamp: string;
}

export interface RoomMember {
  id: string;
  name: string;
  username: string;
}

export interface RoomInfo {
  id: string;
  name: string;
  members: RoomMember[];
  isProjectRoom: boolean;
}
