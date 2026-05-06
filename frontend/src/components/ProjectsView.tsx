import React, { useState } from 'react';
import { Folder, Plus, Shield, UserPlus, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Project, User } from '../types';
import * as api from '../api';

interface ProjectsViewProps {
  token: string;
  currentUser: User | null;
  projects: Project[];
  onRefreshProjects: () => void;
  onEnterProjectChat: (roomName: string) => void;
}

const pageVariants = { initial: { opacity: 0, y: 20 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -20 } };

const ProjectsView: React.FC<ProjectsViewProps> = ({ token, currentUser, projects, onRefreshProjects, onEnterProjectChat }) => {
  const [showModal, setShowModal] = useState(false);
  const [newProj, setNewProj] = useState({ title: '', description: '' });
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searchQ, setSearchQ] = useState('');

  const getRole = (p: Project) => p.members.find(m => m.user?.id === currentUser?.id)?.role || 'Member';

  const doCreate = async () => {
    if (await api.createProject(token, newProj.title, newProj.description)) {
      setShowModal(false); setNewProj({ title: '', description: '' }); onRefreshProjects();
    }
  };
  const doSearch = async (q: string) => { setSearchQ(q); if (q.length < 2) { setSearchResults([]); return; } setSearchResults(await api.searchUsers(token, q)); };
  const doAdd = async (pid: string, uid: string) => { if (await api.addMemberToProject(token, pid, uid)) { onRefreshProjects(); setSearchQ(''); setSearchResults([]); } };
  const doRole = async (pid: string, uid: string, r: string) => { if (await api.updateMemberRole(token, pid, uid, r)) onRefreshProjects(); };
  const doRemove = async (pid: string, uid: string) => { if (await api.removeMember(token, pid, uid)) onRefreshProjects(); };

  return (
    <motion.div key="projects" variants={pageVariants} initial="initial" animate="in" exit="out" className="space-y-6">
      <div className="flex justify-between items-center mb-8">
        <h3 className="text-2xl font-bold text-gray-800">Your Projects</h3>
        <button onClick={() => setShowModal(true)} className="flex items-center space-x-2 px-4 py-2 bg-emerald-500 text-white rounded-xl font-medium shadow-md hover:bg-emerald-600 transition">
          <Plus className="w-4 h-4" /> <span>New Project</span>
        </button>
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {projects.map(proj => {
          const role = getRole(proj);
          const isLeader = role === 'Leader';
          return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} key={proj.id} className="glass-panel p-6 rounded-3xl shadow-lg border border-white/40 flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center"><Folder className="w-6 h-6" /></div>
                <div className="flex flex-col items-end gap-1">
                  <span className="text-xs font-semibold px-2 py-1 bg-gray-100 text-gray-600 rounded-lg">{proj.members.length} Members</span>
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${isLeader ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>Role: {role}</span>
                </div>
              </div>
              <h4 className="text-lg font-bold text-gray-800 mb-2">{proj.title}</h4>
              <p className="text-sm text-gray-500 mb-6 flex-1">{proj.description || 'No description provided.'}</p>
              {isLeader && (
                <div className="mb-6 p-4 bg-white/50 rounded-xl border border-gray-100">
                  <h5 className="text-xs font-bold text-gray-700 mb-3 uppercase flex items-center gap-1"><Shield className="w-3 h-3" /> Admin Panel</h5>
                  <div className="relative mb-4">
                    <input type="text" value={searchQ} onChange={e => doSearch(e.target.value)} placeholder="Search users to add..." className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 outline-none" />
                    {searchResults.length > 0 && (
                      <div className="absolute top-full left-0 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-40 overflow-y-auto">
                        {searchResults.map(u => (
                          <div key={u.id} className="flex justify-between items-center p-2 hover:bg-gray-50 border-b last:border-0">
                            <span className="text-sm">{u.name} <span className="text-gray-400">@{u.username}</span></span>
                            <button onClick={() => doAdd(proj.id, u.id)} className="text-emerald-500 p-1 hover:bg-emerald-50 rounded"><UserPlus className="w-4 h-4" /></button>
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
                            <select value={m.role} onChange={e => doRole(proj.id, m.user.id, e.target.value)} className="bg-gray-50 border border-gray-200 text-xs rounded-md px-1 py-1 outline-none">
                              <option value="Member">Member</option><option value="Manager">Manager</option><option value="Leader">Leader</option>
                            </select>
                            <button onClick={() => doRemove(proj.id, m.user.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
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
                  <div className="flex flex-wrap gap-2">{proj.members.map(m => <span key={m.user?.id} className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-full">{m.user?.name} ({m.role})</span>)}</div>
                </div>
              )}
              <button onClick={() => onEnterProjectChat(`project-${proj.id}`)} className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 transition shadow-md">Enter Project Chat</button>
            </motion.div>
          );
        })}
        {projects.length === 0 && <div className="col-span-full text-center py-12 text-gray-500">You are not part of any projects yet. Create one to get started!</div>}
      </div>
      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
              <h3 className="text-2xl font-bold text-gray-800 mb-6">New Project</h3>
              <div className="space-y-4 mb-8">
                <div><label className="text-sm font-semibold text-gray-700 mb-1 block">Project Title</label><input type="text" value={newProj.title} onChange={e => setNewProj({ ...newProj, title: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none" placeholder="e.g. Science Fair" /></div>
                <div><label className="text-sm font-semibold text-gray-700 mb-1 block">Description</label><textarea value={newProj.description} onChange={e => setNewProj({ ...newProj, description: e.target.value })} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none resize-none" placeholder="What is this project about?" rows={3} /></div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowModal(false)} className="flex-1 py-3 text-gray-600 font-medium hover:bg-gray-100 rounded-xl transition">Cancel</button>
                <button onClick={doCreate} className="flex-1 py-3 bg-emerald-500 text-white font-medium rounded-xl shadow-md hover:bg-emerald-600 transition">Create Project</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ProjectsView;
