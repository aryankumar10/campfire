import React, { useState } from 'react';
import { Check, Clock, AlertTriangle, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Project, Todo, User } from '../types';
import * as api from '../api';

interface TodoViewProps {
  token: string;
  currentUser: User | null;
  projects: Project[];
  activeProject: Project | null;
  setActiveProject: (p: Project) => void;
  todos: Todo[];
  onRefreshTodos: (projectId: string) => void;
}

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  urgent: { label: 'Urgent', color: 'text-red-600', bg: 'bg-red-100', icon: <AlertTriangle className="w-3 h-3" /> },
  high:   { label: 'High',   color: 'text-orange-600', bg: 'bg-orange-100', icon: <ArrowUp className="w-3 h-3" /> },
  medium: { label: 'Medium', color: 'text-blue-600', bg: 'bg-blue-100', icon: <Minus className="w-3 h-3" /> },
  low:    { label: 'Low',    color: 'text-gray-500', bg: 'bg-gray-100', icon: <ArrowDown className="w-3 h-3" /> },
};

const formatTime = (dt?: string) => {
  if (!dt) return null;
  try { return new Date(dt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return dt; }
};

const pageVariants = { initial: { opacity: 0, y: 20 }, in: { opacity: 1, y: 0 }, out: { opacity: 0, y: -20 } };

const TodoView: React.FC<TodoViewProps> = ({ token, currentUser, projects, activeProject, setActiveProject, todos, onRefreshTodos }) => {
  const [newTitle, setNewTitle] = useState('');
  const [newAssignee, setNewAssignee] = useState('');
  const [newPriority, setNewPriority] = useState('medium');

  const getRole = (p: Project) => p.members.find(m => m.user?.id === currentUser?.id)?.role || 'Member';

  const getAssignable = (p: Project) => {
    if (!p || !currentUser) return [];
    const role = getRole(p);
    if (role === 'Leader') return p.members;
    if (role === 'Manager') return p.members.filter(m => m.role === 'Member' || m.user?.id === currentUser.id);
    return p.members.filter(m => m.user?.id === currentUser.id);
  };

  const doCreate = async () => {
    if (!activeProject || !newTitle || !currentUser) return;
    try {
      await api.createTodo(token, activeProject.id, newTitle, newAssignee || currentUser.id, newPriority);
      setNewTitle(''); setNewAssignee(''); setNewPriority('medium');
      onRefreshTodos(activeProject.id);
    } catch (err: any) { alert(err.message); }
  };

  const doToggle = async (todo: Todo) => {
    const status = todo.status === 'done' ? 'todo' : 'done';
    if (await api.updateTodoStatus(token, todo.id, status) && activeProject) onRefreshTodos(activeProject.id);
  };

  return (
    <motion.div key="todo" variants={pageVariants} initial="initial" animate="in" exit="out" className="h-full flex flex-col">
      {/* Project selector tabs */}
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
            <span className="text-sm font-medium px-3 py-1 bg-gray-100 text-gray-600 rounded-lg">Your Role: {getRole(activeProject)}</span>
          </div>

          {/* Create task form */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} onKeyDown={e => e.key === 'Enter' && doCreate()} placeholder="What needs to be done?" className="flex-1 min-w-[200px] px-4 py-3 bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none" />
            <select value={newPriority} onChange={e => setNewPriority(e.target.value)} className="px-3 py-3 bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
            <select value={newAssignee} onChange={e => setNewAssignee(e.target.value)} className="px-3 py-3 bg-white/60 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-400 outline-none text-sm">
              <option value="">Assign to (Self)</option>
              {getAssignable(activeProject).map(m => <option key={m.user?.id} value={m.user?.id}>{m.user?.name} ({m.role})</option>)}
            </select>
            <button onClick={doCreate} className="px-6 py-3 bg-orange-500 text-white rounded-xl font-medium shadow-md hover:bg-orange-600 transition whitespace-nowrap">Add Task</button>
          </div>

          {/* Task list */}
          <div className="space-y-3 overflow-y-auto flex-1 pr-2">
            {todos.map(todo => {
              const pri = PRIORITY_CONFIG[todo.priority] || PRIORITY_CONFIG.medium;
              return (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} key={todo.id} className="p-4 bg-white/60 border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition">
                  <div className="flex items-start gap-4">
                    {/* Checkbox */}
                    <button onClick={() => doToggle(todo)} className={`w-6 h-6 mt-0.5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition ${todo.status === 'done' ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300'}`}>
                      {todo.status === 'done' && <Check className="w-4 h-4" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      {/* Title + priority badge */}
                      <div className="flex items-center gap-2 mb-1">
                        <p className={`font-medium ${todo.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{todo.title}</p>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${pri.bg} ${pri.color}`}>
                          {pri.icon} {pri.label}
                        </span>
                      </div>

                      {/* Meta info */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        <span className="bg-gray-100 px-2 py-0.5 rounded-md">
                          Assigned to: <strong className="text-gray-700">{todo.assigned_to?.name || 'Unassigned'}</strong>
                        </span>
                        {todo.assigned_by && (
                          <span className="bg-gray-100 px-2 py-0.5 rounded-md">
                            By: <strong className="text-gray-700">{todo.assigned_by.name}</strong>
                          </span>
                        )}
                        {todo.createdAt && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Created: {formatTime(todo.createdAt)}
                          </span>
                        )}
                        {todo.status === 'done' && todo.completedAt ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <Check className="w-3 h-3" /> Done: {formatTime(todo.completedAt)}
                          </span>
                        ) : todo.status !== 'done' && (
                          <span className="flex items-center text-orange-500">
                            <Clock className="w-3 h-3 mr-1" /> Pending
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
            {todos.length === 0 && <div className="text-center py-10 text-gray-500">No tasks here yet.</div>}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default TodoView;
