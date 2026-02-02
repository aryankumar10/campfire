import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Video, Github, ListTodo, Folder, LogOut, Menu, X, Send, Users, Hash } from 'lucide-react';
import io from 'socket.io-client';

const PORT = process.env.REACT_APP_BACKEND_PORT || 5000;

// Test users
const TEST_USERS = [
  { username: 'student1', password: 'pass123', name: 'Alice Johnson' },
  { username: 'student2', password: 'pass123', name: 'Bob Smith' },
  { username: 'student3', password: 'pass123', name: 'Charlie Brown' },
  { username: 'student4', password: 'pass123', name: 'Diana Prince' }
];

const CampfireApp = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [activeFeature, setActiveFeature] = useState('chat');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Chat states
  const [socket, setSocket] = useState(null);
  const [roomId, setRoomId] = useState('');
  const [currentRoom, setCurrentRoom] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [showRoomModal, setShowRoomModal] = useState(false);
  const [modalMode, setModalMode] = useState(''); // 'create' or 'join'
  const [roomError, setRoomError] = useState('');
  const [roomName, setRoomName] = useState('');
  
  // Projects states
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [showManageRoomModal, setShowManageRoomModal] = useState(false);
  const [manageRoom, setManageRoom] = useState(null);
  const [manageUsername, setManageUsername] = useState('');
  const [inviteUsername, setInviteUsername] = useState('');

  const messagesEndRef = useRef(null);
  const logoutTimerRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isLoggedIn) {
      // Connect to socket.io server (change URL to your backend)
      const newSocket = io(`http://localhost:${PORT}`);
      // const newSocket = io('http://localhost:5000');
      setSocket(newSocket);

      newSocket.on('message', (msg) => {
        setMessages((prev) => [...prev, msg]);
      });

      newSocket.on('roomJoined', ({ roomId: joinedRoom, roomName: name, history }) => {
        setCurrentRoom(joinedRoom);
        setRoomName(name || joinedRoom);
        setMessages(history || []);
        setShowRoomModal(false);
        setRoomError('');
      });

      newSocket.on('roomNotFound', ({ roomId: badId }) => {
        setRoomError('Room not found');
      });

      newSocket.on('error', (err) => {
        // generic error handler from server
        if (err && err.error) setRoomError(err.error);
      });

      return () => newSocket.close();
    }
  }, [isLoggedIn]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch(`http://localhost:${PORT}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsLoggedIn(true);
        setCurrentUser(data.user); // Contains { name, username, id } from backend
        
        // 2. Save Token & User to LocalStorage (for page refreshes)
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

      }
      else {
        setError(data.message || 'Login failed');
      }
    } 
    catch (err) {
      console.error('Login error:', err);
      setError(`Failed to connect to server. Trying to connect to port :${PORT}`);
    }
  };

  const handleLogout = () => {
    if (socket) {
      socket.disconnect();
    }
    
    setIsLoggedIn(false);
    setCurrentUser(null);
    setUsername('');
    setPassword('');
    setActiveFeature('chat');
    setCurrentRoom('');
    setMessages([]);
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const handleCreateOrJoinRoom = () => {
    setRoomError('');
    if (!roomId.trim()) {
      setRoomError('Please enter a room ID');
      return;
    }
    if (!socket || !currentUser) {
      setRoomError('Not connected');
      return;
    }

    const id = roomId.trim();

    if (modalMode === 'create') {
      // create room then join
      socket.emit('createRoom', { roomId: id }, (res) => {
        if (!res || !res.ok) {
          setRoomError(res && res.error ? res.error : 'Failed to create room');
          return;
        }
        // on success, join the room to receive history
        socket.emit('joinRoom', { roomId: id, username: currentUser.name }, (joinRes) => {
          if (!joinRes || !joinRes.ok) {
            setRoomError(joinRes && joinRes.error ? joinRes.error : 'Failed to join room');
            return;
          }
          setRoomId('');
        });
      });
      return;
    }

    // join mode
    socket.emit('joinRoom', { roomId: id, username: currentUser.name }, (res) => {
      if (!res || !res.ok) {
        setRoomError(res && res.error ? res.error : 'Room not found');
        return;
      }
      setRoomId('');
    });
  };

  const handleSendMessage = () => {
    if (message.trim() && socket && currentRoom) {
      socket.emit('chatMessage', { roomId: currentRoom, message: message.trim(), username: currentUser.username });
      setMessage('');
    }
  };

  const handleLeaveRoom = () => {
    if (socket && currentRoom) {
      socket.emit('leaveRoom', { roomId: currentRoom, username: currentUser.username });
      setCurrentRoom('');
      setRoomName('');
      setMessages([]);
    }
  };

  const fetchProjects = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:${PORT}/api/projects`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) setProjects(data);
    } catch (err) {
      console.error('Fetch projects error:', err);
    }
  };

  const fetchProjectDetails = async (id) => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:${PORT}/api/projects/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) setSelectedProject(data);
    } catch (err) {
      console.error('Fetch project details error:', err);
    }
  };

  const isOwnerOf = (project) => {
    if (!project || !currentUser) return false;
    const createdBy = project.created_by;
    if (!createdBy) return false;
    return (createdBy.toString ? createdBy.toString() === currentUser.id : createdBy === currentUser.id);
  };

  const handleInviteProjectMember = async () => {
    const token = localStorage.getItem('token');
    if (!inviteUsername || inviteUsername.trim().length === 0) return alert('Enter username');
    try {
      const ures = await fetch(`http://localhost:${PORT}/api/users?q=${encodeURIComponent(inviteUsername.trim())}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const users = await ures.json();
      if (!ures.ok || !users || users.length === 0) return alert('User not found');
      const userId = users[0]._id;
      const pres = await fetch(`http://localhost:${PORT}/api/projects/${selectedProject._id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId })
      });
      const pdata = await pres.json();
      if (pres.ok) {
        setInviteUsername('');
        setSelectedProject(pdata);
      } else {
        alert(pdata.message || 'Failed to add member');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to add member');
    }
  };

  const handleRemoveProjectMember = async (memberId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:${PORT}/api/projects/${selectedProject._id}/members/${memberId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setSelectedProject(data);
      } else {
        alert(data.message || 'Failed to remove');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to remove member');
    }
  };

  const openManageRoomModal = (room) => {
    setManageRoom(room);
    setManageUsername('');
    setShowManageRoomModal(true);
  };

  const handleAddRoomAllowedMember = async () => {
    const token = localStorage.getItem('token');
    if (!manageUsername || manageUsername.trim() === '') return alert('Enter username');
    try {
      const ures = await fetch(`http://localhost:${PORT}/api/users?q=${encodeURIComponent(manageUsername.trim())}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const users = await ures.json();
      if (!ures.ok || !users || users.length === 0) return alert('User not found');
      const userId = users[0]._id;
      const res = await fetch(`http://localhost:${PORT}/api/projects/${selectedProject._id}/rooms/${manageRoom._id}/allowed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (res.ok) {
        // refresh project details
        const pRes = await fetchProjectDetails(selectedProject._id);
        // update manageRoom from latest project
        const updated = await (await fetch(`http://localhost:${PORT}/api/projects/${selectedProject._id}`, { headers: { 'Authorization': `Bearer ${token}` } })).json();
        setSelectedProject(updated);
        const newRoom = updated.rooms.find(r => r._id === manageRoom._id);
        setManageRoom(newRoom);
        setManageUsername('');
      } else {
        alert(data.message || 'Failed to add allowed user');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to add allowed user');
    }
  };

  const handleRemoveRoomAllowedMember = async (userId) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:${PORT}/api/projects/${selectedProject._id}/rooms/${manageRoom._id}/allowed/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        const updated = await (await fetch(`http://localhost:${PORT}/api/projects/${selectedProject._id}`, { headers: { 'Authorization': `Bearer ${token}` } })).json();
        setSelectedProject(updated);
        const newRoom = updated.rooms.find(r => r._id === manageRoom._id);
        setManageRoom(newRoom);
      } else {
        alert(data.message || 'Failed to remove allowed user');
      }
    } catch (err) {
      console.error(err);
      alert('Failed to remove allowed user');
    }
  };

  const handleCreateProject = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('You must be logged in to create a project');
      return;
    }
    if (!newProjectTitle || newProjectTitle.trim().length < 3) {
      alert('Project title must be at least 3 characters');
      return;
    }

    try {
      const response = await fetch(`http://localhost:${PORT}/api/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: newProjectTitle.trim(), description: newProjectDesc })
      });
      const data = await response.json();
      if (response.ok) {
        setShowCreateProjectModal(false);
        setNewProjectTitle('');
        setNewProjectDesc('');
        fetchProjects();
      } else {
        console.error('Create project failed:', data);
        alert(data.message || 'Failed to create project');
      }
    } catch (err) {
      console.error('Create project error:', err);
      alert('Failed to create project');
    }
  };

  const handleCreateRoomInProject = async () => {
    const token = localStorage.getItem('token');
    try {
      const response = await fetch(`http://localhost:${PORT}/api/projects/${selectedProject._id}/rooms`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name: newRoomName })
      });
      if (response.ok) {
        setShowCreateRoomModal(false);
        setNewRoomName('');
        fetchProjectDetails(selectedProject._id);
      }
    } catch (err) {
      console.error('Create room error:', err);
    }
  };

  useEffect(() => {
    if (isLoggedIn && activeFeature === 'projects') {
      fetchProjects();
    }
  }, [isLoggedIn, activeFeature]);

  const handleJoinProjectRoom = (roomId) => {
    if (socket && currentUser) {
      socket.emit('joinRoom', { roomId, username: currentUser.name }, (res) => {
        if (res && res.ok) {
          setActiveFeature('chat');
        }
      });
    }
  };

  const features = [
    { id: 'chat', name: 'Chat Room', icon: MessageSquare, color: 'bg-blue-500', available: true },
    { id: 'zoom', name: 'Video Call', icon: Video, color: 'bg-green-500', available: false },
    { id: 'github', name: 'GitHub', icon: Github, color: 'bg-purple-500', available: false },
    { id: 'todo', name: 'Todo Lists', icon: ListTodo, color: 'bg-orange-500', available: false },
    { id: 'projects', name: 'Projects', icon: Folder, color: 'bg-pink-500', available: true }
  ];

  // collapsed when sidebar closed
  const isCollapsed = !isSidebarOpen;

  // restore session on mount if valid
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');

    if (token && savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setIsLoggedIn(true);
        setCurrentUser(user);
      } 
      catch (e) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4">
                <MessageSquare className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">Campfire</h1>
              <p className="text-gray-600">Student Collaboration Platform</p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="Enter username"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleLogin(e)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                  placeholder="Enter password"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={handleLogin}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 rounded-lg font-semibold hover:from-blue-600 hover:to-purple-700 transition shadow-lg hover:shadow-xl"
              >
                Sign In
              </button>
            </div>

            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-600 font-semibold mb-2">Test Credentials:</p>
              <div className="space-y-1 text-xs text-gray-500">
                {TEST_USERS.slice(0, 2).map((user, idx) => (
                  <div key={idx}>
                    {user.username} / {user.password}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        aria-label="Toggle sidebar"
        className="fixed top-4 left-4 z-60 p-2 rounded-md bg-white shadow-lg text-gray-800"
      >
        {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>
      {/* Sidebar */}
      <aside className={`fixed top-0 left-0 bottom-0 z-50 transition-all duration-300 ease-in-out flex flex-col bg-gradient-to-b from-gray-900 to-gray-800 text-white ${isSidebarOpen ? 'w-64' : 'w-20'}`}>
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-between">
            {isSidebarOpen && (
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="font-bold text-lg">Campfire</h2>
                </div>
              </div>
            )}
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-gray-700 rounded-lg transition"
              aria-label="Toggle sidebar"
            >
              {isSidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {isSidebarOpen && (
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center font-semibold text-sm">
                {currentUser.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{currentUser.name}</p>
                <p className="text-xs text-gray-400 truncate">@{currentUser.username}</p>
              </div>
            </div>
          </div>
        )}

        <nav className="flex-1 p-4 space-y-2">
          {features.map((feature) => {
            const Icon = feature.icon;
            const isActive = activeFeature === feature.id;
            
            return (
              <button
                key={feature.id}
                onClick={() => feature.available && setActiveFeature(feature.id)}
                disabled={!feature.available}
                className={`w-full flex items-center ${isCollapsed ? 'justify-center px-0' : 'space-x-3 px-4'} py-3 rounded-lg transition group relative ${
                  isActive
                    ? 'bg-white text-gray-900 shadow-lg'
                    : feature.available
                    ? 'hover:bg-gray-700 text-gray-300'
                    : 'opacity-50 cursor-not-allowed text-gray-500'
                }`}
                title={!isSidebarOpen ? feature.name : ''}
              >
                <div className={`${isActive ? feature.color : 'bg-gray-700'} ${isCollapsed ? 'p-3 rounded-full' : 'p-2 rounded-lg'} flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-white' : 'text-gray-300'}`} />
                </div>
                {isSidebarOpen && (
                  <div className="flex-1 text-left">
                    <span className="font-medium">{feature.name}</span>
                    {!feature.available && (
                      <span className="block text-xs text-gray-500">Coming soon</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-red-600 transition text-gray-300 hover:text-white"
            title={!isSidebarOpen ? 'Logout' : ''}
          >
            <LogOut className="w-5 h-5" />
            {isSidebarOpen && <span className="font-medium">Logout</span>}
          </button>
        </div>
      </aside>

      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 z-40"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <main className="flex-1 transition-all duration-300 ml-0 sm:ml-20">
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">
              {features.find(f => f.id === activeFeature)?.name}
            </h1>
            {currentRoom && activeFeature === 'chat' && (
              <div className="flex items-center space-x-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                <Hash className="w-4 h-4" />
                <span>{roomName || currentRoom}</span>
              </div>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-gray-700">{currentUser.name}</p>
              <p className="text-xs text-gray-500">@{currentUser.username}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center font-semibold text-white">
              {currentUser.name.split(' ').map(n => n[0]).join('')}
            </div>
          </div>
        </header>

        <div className="p-6 h-[calc(100vh-88px)]">
          {activeFeature === 'chat' && (
            <>
              {!currentRoom ? (
                <div className="bg-white rounded-xl shadow-lg p-8 max-w-4xl mx-auto">
                  <div className="text-center">
                    <MessageSquare className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Chat Room</h2>
                    <p className="text-gray-600 mb-6">
                      Connect with your teammates in real-time. Create or join a chat room to get started.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                      <button 
                        onClick={() => { setModalMode('create'); setShowRoomModal(true); }}
                        className="px-6 py-3 bg-blue-500 text-white rounded-lg font-semibold hover:bg-blue-600 transition shadow-lg hover:shadow-xl"
                      >
                        Create Chat Room
                      </button>
                      <button 
                        onClick={() => { setModalMode('join'); setShowRoomModal(true); }}
                        className="px-6 py-3 bg-white border-2 border-blue-500 text-blue-500 rounded-lg font-semibold hover:bg-blue-50 transition"
                      >
                        Join with ID
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-lg h-full flex flex-col max-w-5xl mx-auto">
                  <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Users className="w-5 h-5 text-blue-500" />
                      <div>
                        <h3 className="font-semibold text-gray-800">Room: {currentRoom}</h3>
                        <p className="text-xs text-gray-500">Connected</p>
                      </div>
                    </div>
                    <button
                      onClick={handleLeaveRoom}
                      className="px-4 py-2 text-sm bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                    >
                      Leave Room
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.map((msg, idx) => (
                      <div
                        key={idx}
                        className={`flex ${msg.username === currentUser.username ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-xs lg:max-w-md ${msg.username === currentUser.username ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-800'} rounded-lg px-4 py-2`}>
                          <p className="text-xs font-semibold mb-1 opacity-75">{msg.username}</p>
                          <p className="text-sm">{msg.message}</p>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>

                  <div className="p-4 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type your message..."
                        className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      />
                      <button
                        onClick={handleSendMessage}
                        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition flex items-center space-x-2"
                      >
                        <Send className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
          
          {activeFeature === 'projects' ? (
            <div className="bg-white rounded-xl shadow-lg p-6 max-w-6xl mx-auto h-full flex">
              <div className="w-80 border-r border-gray-100 pr-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">Projects</h3>
                  <button
                    onClick={() => setShowCreateProjectModal(true)}
                    className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm"
                  >
                    New
                  </button>
                </div>

                <div className="space-y-3 overflow-y-auto max-h-[60vh] pr-2">
                  {projects.length === 0 && (
                    <div className="text-sm text-gray-500">No projects yet</div>
                  )}
                  {projects.map((p) => (
                    <button
                      key={p._id}
                      onClick={() => fetchProjectDetails(p._id)}
                      className={`w-full text-left p-3 rounded-lg hover:bg-gray-50 transition flex items-center justify-between ${selectedProject && selectedProject._id === p._id ? 'bg-gray-100' : ''}`}
                    >
                      <div>
                        <div className="font-medium text-gray-800">{p.title}</div>
                        <div className="text-xs text-gray-500 truncate">{p.description}</div>
                      </div>
                      <div className="text-xs text-gray-400">{(new Date(p.createdAt)).toLocaleDateString()}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 p-6">
                {!selectedProject ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <Folder className="w-16 h-16 text-gray-400 mb-4" />
                    <h2 className="text-xl font-bold mb-2">No project selected</h2>
                    <p className="text-gray-600 mb-6">Pick a project from the left or create a new one.</p>
                    <button
                      onClick={() => setShowCreateProjectModal(true)}
                      className="px-6 py-3 bg-blue-500 text-white rounded-lg"
                    >
                      Create Project
                    </button>
                  </div>
                ) : (
                  <div className="h-full flex flex-col">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-bold">{selectedProject.title}</h2>
                        <p className="text-sm text-gray-500">{selectedProject.description}</p>
                      </div>
                      <div className="space-x-2">
                        <button
                          onClick={() => setSelectedProject(null)}
                          className="px-3 py-1 border rounded-lg text-sm"
                        >
                          Back
                        </button>
                        <button
                          onClick={() => setShowCreateRoomModal(true)}
                          className="px-3 py-1 bg-green-500 text-white rounded-lg text-sm"
                        >
                          New Room
                        </button>
                      </div>
                    </div>

                    <div className="flex-1 overflow-y-auto">
                      <h3 className="text-lg font-semibold mb-2">Members</h3>
                      <div className="mb-4">
                        <div className="space-y-2">
                          {selectedProject.members && selectedProject.members.map((m) => (
                            <div key={m.user._id || m.user} className="flex items-center justify-between p-2 border rounded-md">
                              <div className="text-sm">
                                <div className="font-medium">{m.user.name || m.user.username}</div>
                                <div className="text-xs text-gray-400">@{m.user.username}</div>
                              </div>
                              <div>
                                {(isOwnerOf(selectedProject) || (currentUser && currentUser.id === (m.user._id || m.user))) && (
                                  <button onClick={() => handleRemoveProjectMember(m.user._id || m.user)} className="px-2 py-1 text-sm border rounded">Remove</button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        {isOwnerOf(selectedProject) && (
                          <div className="mt-3 flex items-center space-x-2">
                            <input value={inviteUsername} onChange={(e) => setInviteUsername(e.target.value)} placeholder="username to invite" className="flex-1 px-3 py-2 border rounded" />
                            <button onClick={handleInviteProjectMember} className="px-3 py-2 bg-blue-500 text-white rounded">Invite</button>
                          </div>
                        )}
                      </div>

                      <h3 className="text-lg font-semibold mb-2">Rooms</h3>
                      {(!selectedProject.rooms || selectedProject.rooms.length === 0) && (
                        <div className="text-sm text-gray-500 mb-4">No rooms yet for this project.</div>
                      )}
                      <div className="space-y-3">
                        {selectedProject.rooms && selectedProject.rooms.map((r) => (
                          <div key={r._id} className="p-3 border rounded-lg flex items-center justify-between">
                            <div>
                              <div className="font-medium">{r.name}</div>
                              <div className="text-xs text-gray-400">Created: {(new Date(r.createdAt)).toLocaleString()}</div>
                            </div>
                            <div className="space-x-2">
                              <button
                                onClick={() => handleJoinProjectRoom(r._id)}
                                className="px-3 py-1 bg-blue-500 text-white rounded-lg text-sm"
                              >
                                Join
                              </button>
                              {isOwnerOf(selectedProject) && (
                                <button onClick={() => openManageRoomModal(r)} className="px-3 py-1 border rounded-lg text-sm">Manage</button>
                              )}
                              <button
                                onClick={() => { navigator.clipboard?.writeText(r._id); }}
                                className="px-3 py-1 border rounded-lg text-sm"
                              >
                                Copy ID
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            activeFeature !== 'chat' && (
              <div className="bg-white rounded-xl shadow-lg p-12 max-w-2xl mx-auto text-center">
                {(() => {
                  const Icon = features.find(f => f.id === activeFeature)?.icon;
                  return Icon && <Icon className="w-20 h-20 text-gray-400 mx-auto mb-4" />;
                })()}
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Coming Soon</h2>
                <p className="text-gray-600">
                  This feature is currently under development. Stay tuned!
                </p>
              </div>
            )
          )}
        </div>
      </main>

      {/* Room Modal */}
      {showRoomModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">
              {modalMode === 'create' ? 'Create Chat Room' : 'Join Chat Room'}
            </h3>
            <p className="text-gray-600 mb-4 text-sm">
              {modalMode === 'create' 
                ? 'Enter a unique room ID to create a new chat room'
                : 'Enter the room ID to join an existing chat room'}
            </p>
            {roomError && (
              <div className="mb-4 px-3 py-2 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
                {roomError}
              </div>
            )}
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleCreateOrJoinRoom()}
              placeholder="Enter Room ID"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-4"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => { setShowRoomModal(false); setRoomId(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateOrJoinRoom}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                {modalMode === 'create' ? 'Create' : 'Join'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Create Project Modal */}
      {showCreateProjectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Create Project</h3>
            <p className="text-gray-600 mb-4 text-sm">Provide a title and optional description for your project.</p>
            <input
              type="text"
              value={newProjectTitle}
              onChange={(e) => setNewProjectTitle(e.target.value)}
              placeholder="Project Title"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-3"
            />
            <textarea
              value={newProjectDesc}
              onChange={(e) => setNewProjectDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-4"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => { setShowCreateProjectModal(false); setNewProjectTitle(''); setNewProjectDesc(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateProject}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Room in Project Modal */}
      {showCreateRoomModal && selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Create Room in {selectedProject.title}</h3>
            <p className="text-gray-600 mb-4 text-sm">Enter a name for the room (will be visible to project members).</p>
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Room name"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-4"
            />
            <div className="flex space-x-3">
              <button
                onClick={() => { setShowCreateRoomModal(false); setNewRoomName(''); }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateRoomInProject}
                className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
              >
                Create Room
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Manage Room Modal */}
      {showManageRoomModal && manageRoom && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Manage Room: {manageRoom.name}</h3>
            <p className="text-gray-600 mb-4 text-sm">Allowed members for this room.</p>
            <div className="space-y-2 mb-4">
              {(manageRoom.allowed_members && manageRoom.allowed_members.length > 0) ? (
                manageRoom.allowed_members.map((u) => (
                  <div key={u._id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <div className="font-medium">{u.name}</div>
                      <div className="text-xs text-gray-400">@{u.username}</div>
                    </div>
                    <div>
                      <button onClick={() => handleRemoveRoomAllowedMember(u._id)} className="px-2 py-1 border rounded text-sm">Remove</button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-gray-500">No allowed members — room is public to project members.</div>
              )}
            </div>
            <div className="flex items-center space-x-2 mb-4">
              <input value={manageUsername} onChange={(e) => setManageUsername(e.target.value)} placeholder="username to allow" className="flex-1 px-3 py-2 border rounded" />
              <button onClick={handleAddRoomAllowedMember} className="px-3 py-2 bg-blue-500 text-white rounded">Allow</button>
            </div>
            <div className="flex space-x-2">
              <button onClick={() => setShowManageRoomModal(false)} className="flex-1 px-4 py-2 border rounded">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CampfireApp;