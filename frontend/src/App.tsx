import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, ListTodo, Folder, LogOut, Menu, Send, Plus, Check, Clock, Shield, Eye, EyeOff, UserPlus, Trash2 } from 'lucide-react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { motion, AnimatePresence } from 'framer-motion';

const PORT = process.env.REACT_APP_BACKEND_PORT || 5001;
const BASE_URL = `http://localhost:${PORT}`;

interface User {
  id: string;
  name: string;
  username: string;
  joined_rooms: string[];
}

interface ProjectMember {
  user: User;
  role: string;
}

interface Project {
  id: string;
  title: string;
  description: string;
  members: ProjectMember[];
}

interface Todo {
  id: string;
  title: string;
  status: string;
  assigned_to?: User;
}

interface ChatMessage {
  username: string;
  message: string;
  timestamp: string;
}

const CampfireApp: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeFeature, setActiveFeature] = useState('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [token, setToken] = useState(localStorage.getItem('token') || '');

  // Chat states
  const stompClientRef = useRef<Client | null>(null);
  const [currentRoom, setCurrentRoom] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [modalMode, setModalMode] = useState(''); 
  const [roomIdInput, setRoomIdInput] = useState('');
  const [roomError, setRoomError] = useState('');
  const [joinedRooms, setJoinedRooms] = useState<string[]>([]);
  const [showRoomId, setShowRoomId] = useState(false);
  const [showCollapsedChatMenu, setShowCollapsedChatMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Project & Todo States
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [newProject, setNewProject] = useState({ title: '', description: '' });
  const [newTodo, setNewTodo] = useState({ title: '', assigned_to: '' });
  
  // Admin Panel states
  const [userSearchResults, setUserSearchResults] = useState<User[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const fetchUserData = async (authToken: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/users/me`, { headers: { Authorization: `Bearer ${authToken}` } });
      if (res.ok) {
        const data = await res.json();
        setCurrentUser(data);
        setJoinedRooms(data.joined_rooms || []);
      } else if (res.status === 401 || res.status === 403) {
        handleLogout();
      }
    } catch (e) { }
  };

  const fetchProjects = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/api/projects`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
        if (activeProject) {
          const updated = data.find((p: Project) => p.id === activeProject.id);
          if (updated) setActiveProject(updated);
        }
      }
    } catch (e) { }
  };

  const fetchTodos = async (projectId: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${BASE_URL}/api/todos/${projectId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setTodos(await res.json());
    } catch (e) { }
  };

  useEffect(() => {
    if (activeFeature === 'projects' || activeFeature === 'todo') fetchProjects();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFeature, token]);

  useEffect(() => {
    if (activeProject && activeFeature === 'todo') fetchTodos(activeProject.id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeProject, activeFeature, token]);

  // Handle STOMP connection
  useEffect(() => {
    if (isLoggedIn && token) {
      fetchUserData(token);
      
      const client = new Client({
        webSocketFactory: () => new SockJS(`${BASE_URL}/ws`),
        connectHeaders: { Authorization: `Bearer ${token}` },
        reconnectDelay: 5000,
        onConnect: () => {
          console.log('Connected to STOMP');
        },
        onStompError: (frame) => {
          console.error('Broker reported error: ' + frame.headers['message']);
        }
      });
      
      client.activate();
      stompClientRef.current = client;

      return () => { client.deactivate(); };
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, token]);

  // Subscribe to current room changes
  useEffect(() => {
    if (stompClientRef.current && stompClientRef.current.connected && currentRoom) {
      const subscription = stompClientRef.current.subscribe(`/topic/room.${currentRoom}`, (msg) => {
        const chatMsg: ChatMessage = JSON.parse(msg.body);
        setMessages((prev) => [...prev, chatMsg]);
      });
      return () => subscription.unsubscribe();
    }
  }, [currentRoom, stompClientRef.current?.connected]);

  const handleLogin = async (e?: React.SyntheticEvent) => {
    if (e) e.preventDefault();
    setError('');
    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (response.ok) {
        setIsLoggedIn(true);
        setCurrentUser(data.user);
        setToken(data.token);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
      } else {
        setError(data.message || 'Login failed');
      }
    } catch (err) { setError(`Failed to connect to server.`); }
  };

  const handleLogout = () => {
    if (stompClientRef.current) stompClientRef.current.deactivate();
    setIsLoggedIn(false); setCurrentUser(null); setToken(''); setUsername(''); setPassword('');
    setActiveFeature('chat'); setCurrentRoom(''); setMessages([]);
    localStorage.clear();
  };

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      try { setCurrentUser(JSON.parse(savedUser)); setToken(savedToken); setIsLoggedIn(true); } 
      catch (e) { localStorage.clear(); }
    }
  }, []);

  const handleCreateOrJoinRoom = async (idOverride?: string) => {
    const id = idOverride || roomIdInput.trim();
    if (!id) return;
    setRoomError('');

    try {
      if (modalMode === 'create' && !idOverride) {
        const createRes = await fetch(`${BASE_URL}/api/chat/rooms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ roomId: id })
        });
        if (!createRes.ok) {
          const err = await createRes.json();
          return setRoomError(err.message || 'Failed to create room');
        }
      }

      const joinRes = await fetch(`${BASE_URL}/api/chat/rooms/${id}/join`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await joinRes.json();
      
      if (!joinRes.ok) {
        setRoomError(data.message || 'Failed to join. Are you authorized?');
        if (idOverride) alert(data.message || 'Failed to join. Are you authorized?');
        return;
      }

      setCurrentRoom(data.roomId);
      setMessages(data.history || []);
      setShowRoomModal(false);
      fetchUserData(token);
      setActiveFeature('chat');
      setShowRoomId(false);
    } catch (e) {
      setRoomError('Network error connecting to chat.');
    }
  };

  const sendMessage = () => {
    if (!message.trim() || !currentRoom || !stompClientRef.current || !stompClientRef.current.connected) return;
    stompClientRef.current.publish({
      destination: `/app/chat/${currentRoom}`,
      body: JSON.stringify({ message: message.trim() })
    });
    setMessage('');
  };

  const handleCreateProject = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newProject)
      });
      if (res.ok) {
        setShowProjectModal(false);
        fetchProjects();
        setNewProject({ title: '', description: '' });
      }
    } catch (e) {}
  };

  const handleCreateTodo = async () => {
    if (!activeProject || !newTodo.title || !currentUser) return;
    try {
      const res = await fetch(`${BASE_URL}/api/todos/${activeProject.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newTodo.title, assigned_to: newTodo.assigned_to || currentUser.id })
      });
      if (res.ok) {
        setNewTodo({ title: '', assigned_to: '' });
        fetchTodos(activeProject.id);
      } else {
        const data = await res.json();
        alert(data.message || 'Error creating task');
      }
    } catch (e) {}
  };

  const toggleTodoStatus = async (todo: Todo) => {
    const newStatus = todo.status === 'done' ? 'todo' : 'done';
    try {
      const res = await fetch(`${BASE_URL}/api/todos/${todo.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
          if(activeProject) fetchTodos(activeProject.id);
      }
    } catch (e) {}
  };

  // --- ADMIN PANEL FUNCTIONS ---
  const handleSearchUsers = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) { setUserSearchResults([]); return; }
    try {
      const res = await fetch(`${BASE_URL}/api/users?search=${q}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) setUserSearchResults(await res.json());
    } catch (e) {}
  };

  const addMemberToProject = async (projectId: string, userId: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId })
      });
      if (res.ok) { fetchProjects(); setSearchQuery(''); setUserSearchResults([]); }
    } catch (e) {}
  };

  const updateMemberRole = async (projectId: string, userId: string, role: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/projects/${projectId}/members/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role })
      });
      if (res.ok) fetchProjects();
    } catch (e) {}
  };

  const removeMemberFromProject = async (projectId: string, userId: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/projects/${projectId}/members/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchProjects();
    } catch (e) {}
  };

  // --- HELPERS ---
  const getUserRoleInProject = (proj: Project) => {
    if (!proj || !currentUser) return null;
    return proj.members.find(m => m.user?.id === currentUser.id)?.role || 'Member';
  };

  const getAssignableMembers = (proj: Project) => {
    if (!proj || !currentUser) return [];
    const role = getUserRoleInProject(proj);
    if (role === 'Leader') return proj.members;
    if (role === 'Manager') return proj.members.filter(m => m.role === 'Member' || m.user?.id === currentUser.id);
    return proj.members.filter(m => m.user?.id === currentUser.id);
  };

  const pageVariants = { initial: { opacity: 0, y: 20 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -20 } };

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen soft-gradient-bg flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="w-full max-w-md glass-panel rounded-2xl p-8">
          <div className="text-center mb-8">
            <motion.div whileHover={{ rotate: 180 }} transition={{ duration: 0.5 }} className="inline-flex items-center justify-center w-16 h-16 animated-gradient-bg rounded-full mb-4 shadow-lg">
              <MessageSquare className="w-8 h-8 text-white" />
            </motion.div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Campfire</h1>
            <p className="text-gray-600 font-medium">A mindful collaboration space.</p>
          </div>
          <form className="space-y-6" onSubmit={handleLogin}>
            <input type="text" value={username} onChange={(e) => setUsername(e.target.value)} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none transition" placeholder="Username" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none transition" placeholder="Password" />
            {error && <div className="text-red-500 text-sm font-medium">{error}</div>}
            <motion.button type="submit" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="w-full animated-gradient-bg text-white py-3 rounded-xl font-semibold shadow-md">Sign In</motion.button>
          </form>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen soft-gradient-bg flex">
      <aside className={`fixed top-0 left-0 bottom-0 z-50 transition-all duration-300 ease-in-out glass-panel-dark text-white flex flex-col ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-5 flex items-center justify-between border-b border-gray-700/50">
          {isSidebarOpen && <span className="font-bold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Campfire</span>}
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-gray-700/50 rounded-lg"><Menu className="w-5 h-5" /></button>
        </div>

        <nav className="flex-1 overflow-y-visible p-4 space-y-2 mt-2">
          
          <div className="relative" onMouseEnter={() => !isSidebarOpen && setShowCollapsedChatMenu(true)} onMouseLeave={() => !isSidebarOpen && setShowCollapsedChatMenu(false)}>
            <button onClick={() => setActiveFeature('chat')} className={`w-full flex items-center p-3 rounded-xl transition ${activeFeature === 'chat' ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-800'}`}>
              <MessageSquare className="w-5 h-5 min-w-[20px]" />
              {isSidebarOpen && <span className="ml-3 font-medium">Chat</span>}
            </button>

            {!isSidebarOpen && showCollapsedChatMenu && joinedRooms.length > 0 && (
              <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="absolute left-[70px] top-0 w-48 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-2 z-[100]">
                 <p className="text-xs text-gray-400 font-semibold mb-2 px-2 uppercase">Your Rooms</p>
                 {joinedRooms.map((roomIdStr) => (
                    <button key={roomIdStr} onClick={() => { handleCreateOrJoinRoom(roomIdStr); setShowCollapsedChatMenu(false); }} className="w-full text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white py-2 px-2 rounded-lg truncate">
                      # {roomIdStr}
                    </button>
                  ))}
              </motion.div>
            )}
            
            {isSidebarOpen && activeFeature === 'chat' && joinedRooms.length > 0 && (
              <div className="ml-8 space-y-1 my-2">
                <p className="text-xs text-gray-500 font-semibold mb-2 uppercase">Your Rooms</p>
                {joinedRooms.map((roomIdStr) => (
                  <button key={roomIdStr} onClick={() => handleCreateOrJoinRoom(roomIdStr)} className="w-full text-left text-sm text-gray-400 hover:text-white py-1 truncate">
                    # {roomIdStr}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button onClick={() => setActiveFeature('projects')} className={`w-full flex items-center p-3 rounded-xl transition ${activeFeature === 'projects' ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-gray-800'}`}>
            <Folder className="w-5 h-5 min-w-[20px]" />
            {isSidebarOpen && <span className="ml-3 font-medium">Projects</span>}
          </button>

          <button onClick={() => setActiveFeature('todo')} className={`w-full flex items-center p-3 rounded-xl transition ${activeFeature === 'todo' ? 'bg-orange-500/20 text-orange-400' : 'hover:bg-gray-800'}`}>
            <ListTodo className="w-5 h-5 min-w-[20px]" />
            {isSidebarOpen && <span className="ml-3 font-medium">Todo Lists</span>}
          </button>
        </nav>

        <div className="p-4 border-t border-gray-700/50">
          <button onClick={handleLogout} className="w-full flex items-center p-3 rounded-xl hover:bg-red-500/20 text-red-400 transition">
            <LogOut className="w-5 h-5 min-w-[20px]" />
            {isSidebarOpen && <span className="ml-3 font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      <main className={`flex-1 transition-all duration-300 ${isSidebarOpen ? 'ml-64' : 'ml-20'}`}>
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
              <motion.div key="chat" variants={pageVariants} initial="initial" animate="in" exit="out" className="h-full">
                {!currentRoom ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="glass-panel p-10 rounded-3xl max-w-lg w-full text-center shadow-xl border border-white/40">
                      <MessageSquare className="w-16 h-16 text-blue-500 mx-auto mb-6 opacity-80" />
                      <h3 className="text-2xl font-bold text-gray-800 mb-2">Join the Conversation</h3>
                      <p className="text-gray-500 mb-8">Enter a secure space to collaborate with your peers.</p>
                      <div className="flex gap-4 justify-center">
                        <button onClick={() => { setModalMode('create'); setShowRoomModal(true); setRoomError(''); }} className="px-6 py-3 bg-blue-500/10 text-blue-600 border border-blue-200 rounded-xl font-semibold hover:bg-blue-50 transition">Create Room</button>
                        <button onClick={() => { setModalMode('join'); setShowRoomModal(true); setRoomError(''); }} className="px-6 py-3 bg-blue-500 text-white rounded-xl font-semibold hover:bg-blue-600 transition shadow-md hover:shadow-lg">Join Room</button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="glass-panel h-full rounded-3xl flex flex-col shadow-xl border border-white/40 overflow-hidden">
                    <div className="p-5 border-b border-gray-200/50 bg-white/40 flex justify-between items-center backdrop-blur-md">
                      <div className="flex items-center space-x-3">
                        <Shield className="w-5 h-5 text-emerald-500" />
                        <div>
                          <h3 className="font-bold text-gray-800 flex items-center gap-2">
                            Secure Chat Room
                            <button onClick={() => setShowRoomId(!showRoomId)} className="text-gray-400 hover:text-gray-600 focus:outline-none">
                              {showRoomId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </h3>
                          {showRoomId && <p className="text-xs text-gray-500 bg-gray-100 inline-block px-2 py-0.5 rounded mt-1 font-mono">ID: {currentRoom}</p>}
                        </div>
                      </div>
                      <button onClick={() => { setCurrentRoom(''); setMessages([]); }} className="text-sm text-gray-500 hover:text-red-500 font-medium transition">Leave Room</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">
                      {messages.map((msg, idx) => (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} key={idx} className={`flex ${msg.username === currentUser?.username ? 'justify-end' : 'justify-start'}`}>
                          <div className={`max-w-md p-4 rounded-2xl shadow-sm ${msg.username === currentUser?.username ? 'bg-blue-500 text-white rounded-br-sm' : 'bg-white text-gray-800 rounded-bl-sm border border-gray-100'}`}>
                            <p className="text-xs font-semibold mb-1 opacity-70">{msg.username}</p>
                            <p className="text-sm leading-relaxed">{msg.message}</p>
                          </div>
                        </motion.div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>

                    <div className="p-4 bg-white/40 border-t border-gray-200/50 backdrop-blur-md">
                      <div className="flex gap-2">
                        <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} placeholder="Type a message..." className="flex-1 px-5 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-400 outline-none bg-white/80 transition" />
                        <button onClick={sendMessage} className="px-6 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition flex items-center justify-center shadow-md">
                          <Send className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {activeFeature === 'projects' && (
              <motion.div key="projects" variants={pageVariants} initial="initial" animate="in" exit="out" className="space-y-6">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-2xl font-bold text-gray-800">Your Projects</h3>
                  <button onClick={() => setShowProjectModal(true)} className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium shadow-md hover:bg-emerald-600 transition">
                    <Plus className="w-4 h-4" /> <span>New Project</span>
                  </button>
                </div>
                
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                  {projects.map((proj) => {
                    const userRole = getUserRoleInProject(proj);
                    const isLeader = userRole === 'Leader';

                    return (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={proj.id} className="glass-panel p-6 rounded-3xl shadow-lg border border-white/40 flex flex-col">
                      <div className="flex justify-between items-start mb-4">
                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center">
                          <Folder className="w-6 h-6" />
                        </div>
                        <div className="flex flex-col items-end gap-1">
                           <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-lg">{proj.members.length} Members</span>
                           <span className={`text-xs font-bold px-2 py-1 rounded-lg ${isLeader ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>Role: {userRole}</span>
                        </div>
                      </div>
                      <h4 className="text-lg font-bold text-gray-800 mb-2">{proj.title}</h4>
                      <p className="text-sm text-gray-500 mb-6 flex-1">{proj.description || 'No description provided.'}</p>
                      
                      {isLeader && (
                        <div className="mb-6 p-4 bg-white/50 rounded-xl border border-gray-100">
                          <h5 className="text-xs font-bold text-gray-700 mb-3 uppercase flex items-center gap-1"><Shield className="w-3 h-3"/> Admin Panel</h5>
                          
                          <div className="relative mb-4">
                            <input type="text" value={searchQuery} onChange={(e) => handleSearchUsers(e.target.value)} placeholder="Search users by name to add..." className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" />
                            {userSearchResults.length > 0 && (
                              <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
                                {userSearchResults.map(u => (
                                  <div key={u.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border-b last:border-0">
                                    <span className="text-sm">{u.name} <span className="text-gray-400">@{u.username}</span></span>
                                    <button onClick={() => addMemberToProject(proj.id, u.id)} className="text-emerald-500 p-1 hover:bg-emerald-50 rounded"><UserPlus className="w-4 h-4"/></button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {proj.members.map(m => (
                              <div key={m.user?.id} className="flex items-center justify-between text-sm bg-white p-2 rounded-lg shadow-sm border border-gray-50">
                                <span className="font-medium truncate mr-2">{m.user?.name} {m.user?.id === currentUser?.id && '(You)'}</span>
                                {m.user?.id !== currentUser?.id ? (
                                  <div className="flex items-center gap-2">
                                    <select value={m.role} onChange={(e) => updateMemberRole(proj.id, m.user.id, e.target.value)} className="bg-gray-50 border border-gray-200 text-xs rounded-md px-1 py-1 outline-none">
                                      <option value="Member">Member</option>
                                      <option value="Manager">Manager</option>
                                      <option value="Leader">Leader</option>
                                    </select>
                                    <button onClick={() => removeMemberFromProject(proj.id, m.user.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4"/></button>
                                  </div>
                                ) : <span className="text-xs text-gray-400">Leader</span>}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {!isLeader && (
                         <div className="mb-6">
                           <p className="text-xs font-semibold text-gray-500 mb-2">Project Roster:</p>
                           <div className="flex flex-wrap gap-2">
                             {proj.members.map(m => (
                               <span key={m.user?.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{m.user?.name} ({m.role})</span>
                             ))}
                           </div>
                         </div>
                      )}

                      <button onClick={() => handleCreateOrJoinRoom(`project-${proj.id}`)} className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition shadow-md">
                        Enter Project Chat
                      </button>
                    </motion.div>
                  )})}
                  {projects.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      You are not part of any projects yet. Create one to get started!
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeFeature === 'todo' && (
              <motion.div key="todo" variants={pageVariants} initial="initial" animate="in" exit="out" className="h-full flex flex-col">
                <div className="mb-6 flex gap-4 overflow-x-auto pb-2">
                  {projects.map(proj => (
                    <button key={proj.id} onClick={() => setActiveProject(proj)} className={`px-4 py-2 rounded-xl whitespace-nowrap font-medium transition shadow-sm ${activeProject?.id === proj.id ? 'bg-orange-500 text-white' : 'glass-panel text-gray-700 hover:bg-white/80'}`}>
                      {proj.title}
                    </button>
                  ))}
                </div>

                {!activeProject ? (
                  <div className="flex-1 flex items-center justify-center text-gray-500">Select a project above to view its Todo list.</div>
                ) : (
                  <div className="glass-panel flex-1 rounded-3xl p-6 shadow-xl border border-white/40 flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                      <h3 className="text-xl font-bold text-gray-800">Tasks for {activeProject.title}</h3>
                      <span className="text-sm font-medium px-3 py-1 bg-gray-100 text-gray-600 rounded-lg">Your Role: {getUserRoleInProject(activeProject)}</span>
                    </div>
                    
                    <div className="flex gap-4 mb-6">
                      <input type="text" value={newTodo.title} onChange={e => setNewTodo({...newTodo, title: e.target.value})} placeholder="What needs to be done?" className="flex-1 px-4 py-3 bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" />
                      <select value={newTodo.assigned_to} onChange={(e) => setNewTodo({...newTodo, assigned_to: e.target.value})} className="px-4 py-3 bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none">
                        <option value="">Assign to (Self)</option>
                        {getAssignableMembers(activeProject).map(m => (
                          <option key={m.user?.id} value={m.user?.id}>{m.user?.name} ({m.role})</option>
                        ))}
                      </select>
                      <button onClick={handleCreateTodo} className="px-6 py-3 bg-orange-500 text-white rounded-xl font-medium shadow-md hover:bg-orange-600 transition whitespace-nowrap">Add Task</button>
                    </div>

                    <div className="space-y-3 overflow-y-auto flex-1 pr-2">
                      {todos.map(todo => (
                        <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={todo.id} className="flex items-center justify-between p-4 bg-white/60 border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition">
                          <div className="flex items-center gap-4">
                            <button onClick={() => toggleTodoStatus(todo)} className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition ${todo.status === 'done' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                              {todo.status === 'done' && <Check className="w-4 h-4" />}
                            </button>
                            <div>
                              <p className={`font-medium ${todo.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{todo.title}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">Assigned: {todo.assigned_to?.name || 'Unassigned'}</span>
                                {todo.status !== 'done' && <span className="flex items-center text-xs text-orange-500"><Clock className="w-3 h-3 mr-1"/> Pending</span>}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                      {todos.length === 0 && <div className="text-center py-10 text-gray-500">No tasks here yet.</div>}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </main>

      <AnimatePresence>
        {showRoomModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
              <h3 className="text-2xl font-bold text-gray-800 mb-2">{modalMode === 'create' ? 'Create a Global Room' : 'Join a Room'}</h3>
              <p className="text-gray-500 mb-6 text-sm">{modalMode === 'create' ? 'Name your new global space.' : 'Enter the unique ID of the room. You must have access.'}</p>
              {roomError && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">{roomError}</div>}
              <input type="text" value={roomIdInput} onChange={(e) => setRoomIdInput(e.target.value)} placeholder="Room ID (e.g. study-group)" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none mb-6" />
              <div className="flex gap-3">
                <button onClick={() => {setShowRoomModal(false); setRoomError('');}} className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition">Cancel</button>
                <button onClick={() => handleCreateOrJoinRoom()} className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-xl shadow-md hover:bg-blue-600 transition">{modalMode === 'create' ? 'Create' : 'Join'}</button>
              </div>
            </motion.div>
          </div>
        )}

        {showProjectModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">New Project</h3>
              <div className="space-y-4 mb-8">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Project Title</label>
                  <input type="text" value={newProject.title} onChange={e => setNewProject({...newProject, title: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. Science Fair" />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">Description</label>
                  <textarea value={newProject.description} onChange={e => setNewProject({...newProject, description: e.target.value})} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none" placeholder="What is this project about?" rows={3} />
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowProjectModal(false)} className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition">Cancel</button>
                <button onClick={handleCreateProject} className="flex-1 py-3 bg-emerald-500 text-white font-medium rounded-xl shadow-md hover:bg-emerald-600 transition">Create Project</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CampfireApp;