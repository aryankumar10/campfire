import React, { useState } from 'react';
import { MessageSquare, ListTodo, Folder, LogOut, Menu } from 'lucide-react';
import { motion } from 'framer-motion';

interface SidebarProps {
  activeFeature: string;
  setActiveFeature: (feature: string) => void;
  joinedRooms: string[];
  onRoomClick: (roomName: string) => void;
  onLogout: () => void;
}

const MAX_SIDEBAR_ROOMS = 5;

const Sidebar: React.FC<SidebarProps> = ({ activeFeature, setActiveFeature, joinedRooms, onRoomClick, onLogout }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showPopup, setShowPopup] = useState(false);

  const recentRooms = joinedRooms.slice(-MAX_SIDEBAR_ROOMS).reverse();

  // Pretty-print room name: "project-abc123" → "Project Room"
  const displayName = (name: string) => {
    if (name.startsWith('project-')) return '📁 ' + name.replace('project-', '').substring(0, 8) + '…';
    return '# ' + name;
  };

  return (
    <aside className={`fixed top-0 left-0 bottom-0 z-50 transition-all duration-300 ease-in-out glass-panel-dark text-white flex flex-col ${isOpen ? 'w-64' : 'w-20'}`}>
      {/* Header */}
      <div className="p-5 flex items-center justify-between border-b border-gray-700/50">
        {isOpen && <span className="font-bold text-xl tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400">Campfire</span>}
        <button onClick={() => setIsOpen(!isOpen)} className="p-2 hover:bg-gray-700/50 rounded-lg"><Menu className="w-5 h-5" /></button>
      </div>

      <nav className="flex-1 overflow-y-visible p-4 space-y-2 mt-2">
        {/* Todo — first / landing */}
        <button onClick={() => setActiveFeature('todo')} className={`w-full flex items-center p-3 rounded-xl transition ${activeFeature === 'todo' ? 'bg-orange-500/20 text-orange-400' : 'hover:bg-gray-800'}`}>
          <ListTodo className="w-5 h-5 min-w-[20px]" />
          {isOpen && <span className="ml-3 font-medium">Todo Lists</span>}
        </button>

        {/* Chat + room popup — uses a wrapper div with no gap so hover doesn't break */}
        <div
          className="relative"
          onMouseEnter={() => { if (!isOpen && recentRooms.length > 0) setShowPopup(true); }}
          onMouseLeave={() => setShowPopup(false)}
        >
          <button
            onClick={() => { setActiveFeature('chat'); setShowPopup(false); }}
            className={`w-full flex items-center p-3 rounded-xl transition ${activeFeature === 'chat' ? 'bg-blue-500/20 text-blue-400' : 'hover:bg-gray-800'}`}
          >
            <MessageSquare className="w-5 h-5 min-w-[20px]" />
            {isOpen && <span className="ml-3 font-medium">Chat</span>}
          </button>

          {/* Collapsed hover popup — positioned flush to sidebar edge with transparent bridge */}
          {!isOpen && showPopup && recentRooms.length > 0 && (
            <div className="absolute top-0 left-full h-auto z-[100]" style={{ paddingLeft: '4px' }}>
              <motion.div
                initial={{ opacity: 0, x: -5 }}
                animate={{ opacity: 1, x: 0 }}
                className="w-52 bg-gray-800 rounded-xl shadow-2xl border border-gray-700 p-2"
              >
                <p className="text-xs text-gray-400 font-semibold mb-2 px-2 uppercase">Recent Rooms</p>
                {recentRooms.map(name => (
                  <button
                    key={name}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onRoomClick(name);
                      setShowPopup(false);
                    }}
                    className="w-full text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white py-2 px-3 rounded-lg truncate cursor-pointer transition block"
                  >
                    {displayName(name)}
                  </button>
                ))}
              </motion.div>
            </div>
          )}

          {/* Expanded inline rooms */}
          {isOpen && activeFeature === 'chat' && recentRooms.length > 0 && (
            <div className="ml-8 space-y-1 my-2">
              <p className="text-xs text-gray-500 font-semibold mb-2 uppercase">Recent Rooms</p>
              {recentRooms.map(name => (
                <button key={name} onClick={() => onRoomClick(name)} className="w-full text-left text-sm text-gray-400 hover:text-white py-1 truncate cursor-pointer transition block">
                  {displayName(name)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Projects */}
        <button onClick={() => setActiveFeature('projects')} className={`w-full flex items-center p-3 rounded-xl transition ${activeFeature === 'projects' ? 'bg-emerald-500/20 text-emerald-400' : 'hover:bg-gray-800'}`}>
          <Folder className="w-5 h-5 min-w-[20px]" />
          {isOpen && <span className="ml-3 font-medium">Projects</span>}
        </button>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-700/50">
        <button onClick={onLogout} className="w-full flex items-center p-3 rounded-xl hover:bg-red-500/20 text-red-400 transition">
          <LogOut className="w-5 h-5 min-w-[20px]" />
          {isOpen && <span className="ml-3 font-medium">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
