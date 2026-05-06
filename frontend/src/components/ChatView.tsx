import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, Plus, Shield, Eye, EyeOff, Users, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChatMessage, RoomInfo, User, Project } from '../types';
import * as api from '../api';

interface ChatViewProps {
  token: string;
  currentUser: User | null;
  currentRoom: string;
  setCurrentRoom: (room: string) => void;
  messages: ChatMessage[];
  setMessages: (msgs: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  onRefreshUser: () => void;
  sendMessage: (msg: string) => void;
  rooms: RoomInfo[];
  onRefreshRooms: () => void;
  projects: Project[];
}

const pageVariants = { initial: { opacity: 0, y: 20 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -20 } };

const ChatView: React.FC<ChatViewProps> = ({
  token, currentUser, currentRoom, setCurrentRoom, messages, setMessages,
  onRefreshUser, sendMessage, rooms, onRefreshRooms, projects,
}) => {
  const [message, setMessage] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('');
  const [roomNameInput, setRoomNameInput] = useState('');
  const [roomError, setRoomError] = useState('');
  const [showRoomId, setShowRoomId] = useState(false);

  // Create room extended fields
  const [selectedProject, setSelectedProject] = useState('');
  const [memberSearch, setMemberSearch] = useState('');
  const [memberResults, setMemberResults] = useState<User[]>([]);
  const [selectedMembers, setSelectedMembers] = useState<User[]>([]);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const resetModal = () => {
    setShowModal(false); setRoomError(''); setRoomNameInput('');
    setSelectedProject(''); setMemberSearch(''); setMemberResults([]); setSelectedMembers([]);
  };

  const handleSearchMembers = async (q: string) => {
    setMemberSearch(q);
    if (q.length < 2) { setMemberResults([]); return; }
    const results = await api.searchUsers(token, q);
    // Filter out already-selected members
    setMemberResults(results.filter(u => !selectedMembers.find(s => s.id === u.id)));
  };

  const addMember = (user: User) => {
    setSelectedMembers(prev => [...prev, user]);
    setMemberResults(prev => prev.filter(u => u.id !== user.id));
    setMemberSearch('');
  };

  const removeMember = (userId: string) => {
    setSelectedMembers(prev => prev.filter(u => u.id !== userId));
  };

  const handleCreateRoom = async () => {
    const name = roomNameInput.trim();
    if (!name) return;
    setRoomError('');
    try {
      await api.createRoom(token, name, selectedProject || undefined, selectedMembers.map(u => u.id));
      const data = await api.joinRoom(token, name);
      setCurrentRoom(data.roomId);
      setMessages(data.history || []);
      resetModal();
      onRefreshUser();
      onRefreshRooms();
    } catch (err: any) {
      setRoomError(err.message || 'Failed to create room');
    }
  };

  const handleJoinRoom = async (roomName: string) => {
    setRoomError('');
    try {
      const data = await api.joinRoom(token, roomName);
      setCurrentRoom(data.roomId);
      setMessages(data.history || []);
      resetModal();
      onRefreshUser();
      onRefreshRooms();
    } catch (err: any) {
      setRoomError(err.message || 'Failed to join room');
      alert(err.message || 'Failed to join room');
    }
  };

  const handleSend = () => {
    if (!message.trim()) return;
    sendMessage(message.trim());
    setMessage('');
  };

  // Display-friendly room name
  const displayName = (name: string) => {
    if (name.startsWith('project-')) {
      const projId = name.replace('project-', '');
      const proj = projects.find(p => p.id === projId);
      return proj ? `${proj.title} Chat` : name;
    }
    return name;
  };

  // ======== Room listing view ========
  if (!currentRoom) {
    return (
      <motion.div key="chat" variants={pageVariants} initial="initial" animate="in" exit="out" className="h-full">
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-2xl font-bold text-gray-800">Your Chat Rooms</h3>
            <div className="flex gap-3">
              <button onClick={() => { setModalMode('create'); setShowModal(true); setRoomError(''); }} className="flex items-center space-x-2 px-4 py-2 bg-blue-500/10 text-blue-600 border border-blue-200 rounded-xl font-medium hover:bg-blue-50 transition">
                <Plus className="w-4 h-4" /> <span>Create Room</span>
              </button>
              <button onClick={() => { setModalMode('join'); setShowModal(true); setRoomError(''); }} className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-xl font-medium shadow-md hover:bg-blue-600 transition">
                <MessageSquare className="w-4 h-4" /> <span>Join Room</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {rooms.map((room) => (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={room.id} className="glass-panel p-6 rounded-3xl shadow-lg border border-white/40 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center">
                    {room.isProjectRoom ? <Shield className="w-6 h-6" /> : <MessageSquare className="w-6 h-6" />}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-lg flex items-center gap-1">
                      <Users className="w-3 h-3" /> {room.members.length} Members
                    </span>
                    {room.isProjectRoom && <span className="text-xs font-bold px-2 py-1 bg-purple-100 text-purple-700 rounded-lg">Project Room</span>}
                  </div>
                </div>
                <h4 className="text-lg font-bold text-gray-800 mb-2 truncate">{displayName(room.name)}</h4>
                <div className="flex flex-wrap gap-2 mb-4 flex-1">
                  {room.members.slice(0, 6).map(m => <span key={m.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{m.name}</span>)}
                  {room.members.length > 6 && <span className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">+{room.members.length - 6} more</span>}
                </div>
                <button onClick={() => handleJoinRoom(room.name)} className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition shadow-md">Enter Room</button>
              </motion.div>
            ))}
            {rooms.length === 0 && (
              <div className="col-span-full">
                <div className="glass-panel p-10 rounded-3xl max-w-lg mx-auto w-full text-center shadow-xl border border-white/40">
                  <MessageSquare className="w-16 h-16 text-blue-500 mx-auto mb-6 opacity-80" />
                  <h3 className="text-2xl font-bold text-gray-800 mb-2">No Rooms Yet</h3>
                  <p className="text-gray-500 mb-8">Create a new room or join an existing one to start chatting.</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Create / Join Modal */}
        <AnimatePresence>
          {showModal && (
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md max-h-[85vh] overflow-y-auto">
                <h3 className="text-2xl font-bold text-gray-800 mb-2">{modalMode === 'create' ? 'Create a Room' : 'Join a Room'}</h3>
                <p className="text-gray-500 mb-6 text-sm">{modalMode === 'create' ? 'Set up your new chat space.' : 'Enter the name of the room to join.'}</p>
                {roomError && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">{roomError}</div>}

                {/* Room Name */}
                <label className="text-sm font-semibold text-gray-700 mb-1 block">Room Name</label>
                <input type="text" value={roomNameInput} onChange={e => setRoomNameInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (modalMode === 'create' ? handleCreateRoom() : handleJoinRoom(roomNameInput.trim()))} placeholder="e.g. study-group" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none mb-4" />

                {/* Create-only fields */}
                {modalMode === 'create' && (
                  <>
                    {/* Project association */}
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">Link to Project (optional)</label>
                    <select value={selectedProject} onChange={e => setSelectedProject(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none mb-4 text-sm">
                      <option value="">No project</option>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>

                    {/* Add members */}
                    <label className="text-sm font-semibold text-gray-700 mb-1 block">Add Members (optional)</label>
                    <div className="relative mb-2">
                      <input type="text" value={memberSearch} onChange={e => handleSearchMembers(e.target.value)} placeholder="Search users by name..." className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm" />
                      {memberResults.length > 0 && (
                        <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-32 overflow-y-auto">
                          {memberResults.map(u => (
                            <button key={u.id} onClick={() => addMember(u)} className="w-full flex justify-between items-center p-2 hover:bg-gray-50 border-b last:border-0 text-sm text-left">
                              <span>{u.name} <span className="text-gray-400">@{u.username}</span></span>
                              <Plus className="w-4 h-4 text-blue-500" />
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    {selectedMembers.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {selectedMembers.map(u => (
                          <span key={u.id} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full flex items-center gap-1">
                            {u.name}
                            <button onClick={() => removeMember(u.id)} className="hover:text-red-500"><X className="w-3 h-3" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}

                <div className="flex gap-3 mt-4">
                  <button onClick={resetModal} className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition">Cancel</button>
                  <button onClick={() => modalMode === 'create' ? handleCreateRoom() : handleJoinRoom(roomNameInput.trim())} className="flex-1 py-3 bg-blue-500 text-white font-medium rounded-xl shadow-md hover:bg-blue-600 transition">
                    {modalMode === 'create' ? 'Create' : 'Join'}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  }

  // ======== Active chat room view ========
  return (
    <motion.div key="chat" variants={pageVariants} initial="initial" animate="in" exit="out" className="h-full">
      <div className="glass-panel h-full rounded-3xl flex flex-col shadow-xl border border-white/40 overflow-hidden">
        <div className="p-5 border-b border-gray-200/50 bg-white/40 flex justify-between items-center backdrop-blur-md">
          <div className="flex items-center space-x-3">
            <Shield className="w-5 h-5 text-emerald-500" />
            <div>
              <h3 className="font-bold text-gray-800">{displayName(currentRoom)}</h3>
              {showRoomId && <p className="text-xs text-gray-500 bg-gray-100 inline-block px-2 py-0.5 rounded mt-1 font-mono">ID: {currentRoom}</p>}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowRoomId(!showRoomId)} className="text-gray-400 hover:text-gray-600 focus:outline-none text-xs">
              {showRoomId ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button onClick={() => { setCurrentRoom(''); setMessages([]); }} className="text-sm text-gray-500 hover:text-red-500 font-medium transition">Leave Room</button>
          </div>
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
            <input type="text" value={message} onChange={e => setMessage(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSend()} placeholder="Type a message..." className="flex-1 px-5 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-400 outline-none bg-white/80 transition" />
            <button onClick={handleSend} className="px-6 bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition flex items-center justify-center shadow-md"><Send className="w-5 h-5" /></button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatView;
