import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { AnimatePresence } from 'framer-motion';
import { User, Project, Todo, ChatMessage, RoomInfo } from './types';
import { BASE_URL } from './api';
import * as api from './api';
import LoginPage from './components/LoginPage';
import Sidebar from './components/Sidebar';
import ChatView from './components/ChatView';
import ProjectsView from './components/ProjectsView';
import TodoView from './components/TodoView';

const CampfireApp: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [token, setToken] = useState(localStorage.getItem('token') || '');
  const [activeFeature, setActiveFeature] = useState('todo');

  // Chat state
  const stompClientRef = useRef<Client | null>(null);
  const [currentRoom, setCurrentRoom] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [joinedRooms, setJoinedRooms] = useState<string[]>([]);
  const [rooms, setRooms] = useState<RoomInfo[]>([]);

  // Project & Todo state
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);

  // --- Data fetchers ---
  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const user = await api.fetchMe(token);
      if (user) { setCurrentUser(user); setJoinedRooms(user.joined_rooms || []); }
    } catch (e: any) {
      if (e.message === 'UNAUTHORIZED') handleLogout();
    }
  }, [token]);

  const refreshRooms = useCallback(async () => {
    if (!token) return;
    const data = await api.fetchUserRooms(token);
    setRooms(data);
  }, [token]);

  const refreshProjects = useCallback(async () => {
    if (!token) return;
    const data = await api.fetchProjects(token);
    setProjects(data);
    if (activeProject) {
      const updated = data.find((p: Project) => p.id === activeProject.id);
      if (updated) setActiveProject(updated);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeProject?.id]);

  const refreshTodos = useCallback(async (projectId: string) => {
    if (!token) return;
    setTodos(await api.fetchTodos(token, projectId));
  }, [token]);

  // --- Auth ---
  const handleLogin = (authToken: string, user: User) => {
    setIsLoggedIn(true);
    setCurrentUser(user);
    setToken(authToken);
    localStorage.setItem('token', authToken);
    localStorage.setItem('user', JSON.stringify(user));
  };

  const handleLogout = () => {
    if (stompClientRef.current) stompClientRef.current.deactivate();
    setIsLoggedIn(false); setCurrentUser(null); setToken('');
    setActiveFeature('todo'); setCurrentRoom(''); setMessages([]);
    setJoinedRooms([]); setRooms([]); setProjects([]);
    localStorage.clear();
  };

  // Restore session
  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      try { setCurrentUser(JSON.parse(savedUser)); setToken(savedToken); setIsLoggedIn(true); }
      catch { localStorage.clear(); }
    }
  }, []);

  // Fetch data on feature switch
  useEffect(() => {
    if (activeFeature === 'chat') { refreshRooms(); refreshProjects(); }
    if (activeFeature === 'projects' || activeFeature === 'todo') refreshProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFeature, token]);

  useEffect(() => {
    if (activeProject && activeFeature === 'todo') refreshTodos(activeProject.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject, activeFeature, token]);

  // STOMP connection
  useEffect(() => {
    if (isLoggedIn && token) {
      refreshUser();
      refreshRooms();
      const client = new Client({
        webSocketFactory: () => new SockJS(`${BASE_URL}/ws`),
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 5000,
        onConnect: () => console.log('Connected to STOMP'),
        onStompError: (frame) => console.error('Broker error: ' + frame.headers['message']),
      });
      client.activate();
      stompClientRef.current = client;
      return () => { client.deactivate(); };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, token]);

  // Subscribe to current room
  useEffect(() => {
    if (stompClientRef.current && stompClientRef.current.connected && currentRoom) {
      const sub = stompClientRef.current.subscribe(`/topic/room.${currentRoom}`, (msg) => {
        setMessages(prev => [...prev, JSON.parse(msg.body)]);
      });
      return () => sub.unsubscribe();
    }
  }, [currentRoom, stompClientRef.current?.connected]);

  // Send message via STOMP
  const sendMessage = (text: string) => {
    if (!currentRoom || !stompClientRef.current || !stompClientRef.current.connected) return;
    stompClientRef.current.publish({ destination: `/app/chat/${currentRoom}`, body: JSON.stringify({ message: text }) });
  };

  // Enter a room (from sidebar or project chat button)
  const handleEnterRoom = async (roomName: string) => {
    try {
      const data = await api.joinRoom(token, roomName);
      setCurrentRoom(data.roomId);
      setMessages(data.history || []);
      setActiveFeature('chat');
      refreshUser();
      refreshRooms();
    } catch (err: any) {
      alert(err.message || 'Failed to join room');
    }
  };

  if (!isLoggedIn) return <LoginPage onLogin={handleLogin} />;

  return (
    <div className="min-h-screen soft-gradient-bg flex">
      <Sidebar
        activeFeature={activeFeature}
        setActiveFeature={setActiveFeature}
        joinedRooms={joinedRooms}
        onRoomClick={handleEnterRoom}
        onLogout={handleLogout}
      />

      <main className="flex-1 transition-all duration-300 ml-20">
        <header className="glass-panel border-b border-white/20 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <h2 className="text-2xl font-bold text-gray-800 capitalize tracking-tight">{activeFeature.replace('-', ' ')}</h2>
          <div className="flex items-center space-x-3">
            <div className="text-right mr-2 hidden sm:block">
              <p className="text-sm font-semibold text-gray-700">{currentUser?.name}</p>
              <p className="text-xs text-gray-500">@{currentUser?.username}</p>
            </div>
            <div className="w-10 h-10 animated-gradient-bg rounded-xl flex items-center justify-center font-bold text-white shadow-md">
              {currentUser?.name?.charAt(0)}
            </div>
          </div>
        </header>

        <div className="p-8 h-[calc(100vh-80px)] overflow-y-auto">
          <AnimatePresence mode="wait">
            {activeFeature === 'chat' && (
              <ChatView
                token={token}
                currentUser={currentUser}
                currentRoom={currentRoom}
                setCurrentRoom={setCurrentRoom}
                messages={messages}
                setMessages={setMessages}
                onRefreshUser={refreshUser}
                sendMessage={sendMessage}
                rooms={rooms}
                onRefreshRooms={refreshRooms}
                projects={projects}
              />
            )}
            {activeFeature === 'projects' && (
              <ProjectsView
                token={token}
                currentUser={currentUser}
                projects={projects}
                onRefreshProjects={refreshProjects}
                onEnterProjectChat={handleEnterRoom}
              />
            )}
            {activeFeature === 'todo' && (
              <TodoView
                token={token}
                currentUser={currentUser}
                projects={projects}
                activeProject={activeProject}
                setActiveProject={setActiveProject}
                todos={todos}
                onRefreshTodos={refreshTodos}
              />
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default CampfireApp;