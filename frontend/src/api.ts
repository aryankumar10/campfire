// Centralized API functions for the Campfire application

import { User, Project, Todo, RoomInfo } from './types';

const PORT = process.env.REACT_APP_BACKEND_PORT || 5001;
export const BASE_URL = `http://localhost:${PORT}`;

function authHeaders(token: string): Record<string, string> {
  return { Authorization: `Bearer ${token}` };
}

function jsonAuthHeaders(token: string): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ---------- Auth ----------

export async function loginUser(username: string, password: string): Promise<{ token: string; user: User } | { message: string }> {
  const res = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Login failed');
  return data;
}

// ---------- Users ----------

export async function fetchMe(token: string): Promise<User | null> {
  const res = await fetch(`${BASE_URL}/api/users/me`, { headers: authHeaders(token) });
  if (res.status === 401 || res.status === 403) throw new Error('UNAUTHORIZED');
  if (!res.ok) return null;
  return res.json();
}

export async function searchUsers(token: string, query: string): Promise<User[]> {
  const res = await fetch(`${BASE_URL}/api/users?search=${query}`, { headers: authHeaders(token) });
  if (!res.ok) return [];
  return res.json();
}

// ---------- Chat Rooms ----------

export async function fetchUserRooms(token: string): Promise<RoomInfo[]> {
  const res = await fetch(`${BASE_URL}/api/chat/rooms`, { headers: authHeaders(token) });
  if (!res.ok) return [];
  return res.json();
}

export async function createRoom(token: string, roomName: string, projectId?: string, memberIds?: string[]): Promise<{ roomId: string }> {
  const res = await fetch(`${BASE_URL}/api/chat/rooms`, {
    method: 'POST',
    headers: jsonAuthHeaders(token),
    body: JSON.stringify({ roomName, projectId: projectId || undefined, memberIds: memberIds || undefined }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to create room');
  return data;
}

export async function joinRoom(token: string, roomId: string): Promise<{ roomId: string; history: any[] }> {
  const res = await fetch(`${BASE_URL}/api/chat/rooms/${roomId}/join`, {
    method: 'POST',
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || 'Failed to join room');
  return data;
}

// ---------- Projects ----------

export async function fetchProjects(token: string): Promise<Project[]> {
  const res = await fetch(`${BASE_URL}/api/projects`, { headers: authHeaders(token) });
  if (!res.ok) return [];
  return res.json();
}

export async function createProject(token: string, title: string, description: string): Promise<Project | null> {
  const res = await fetch(`${BASE_URL}/api/projects`, {
    method: 'POST',
    headers: jsonAuthHeaders(token),
    body: JSON.stringify({ title, description }),
  });
  if (!res.ok) return null;
  return res.json();
}

export async function addMemberToProject(token: string, projectId: string, userId: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/members`, {
    method: 'POST',
    headers: jsonAuthHeaders(token),
    body: JSON.stringify({ userId }),
  });
  return res.ok;
}

export async function updateMemberRole(token: string, projectId: string, userId: string, role: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/members/${userId}`, {
    method: 'PUT',
    headers: jsonAuthHeaders(token),
    body: JSON.stringify({ role }),
  });
  return res.ok;
}

export async function removeMember(token: string, projectId: string, userId: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/projects/${projectId}/members/${userId}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  return res.ok;
}

// ---------- Todos ----------

export async function fetchTodos(token: string, projectId: string): Promise<Todo[]> {
  const res = await fetch(`${BASE_URL}/api/todos/${projectId}`, { headers: authHeaders(token) });
  if (!res.ok) return [];
  return res.json();
}

export async function createTodo(token: string, projectId: string, title: string, assignedTo: string, priority: string = 'medium'): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/todos/${projectId}`, {
    method: 'POST',
    headers: jsonAuthHeaders(token),
    body: JSON.stringify({ title, assigned_to: assignedTo, priority }),
  });
  if (!res.ok) {
    const data = await res.json();
    throw new Error(data.message || 'Error creating task');
  }
  return true;
}

export async function updateTodoStatus(token: string, todoId: string, status: string): Promise<boolean> {
  const res = await fetch(`${BASE_URL}/api/todos/${todoId}`, {
    method: 'PUT',
    headers: jsonAuthHeaders(token),
    body: JSON.stringify({ status }),
  });
  return res.ok;
}
