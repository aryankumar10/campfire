import React, { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { loginUser } from '../api';

interface LoginPageProps {
  onLogin: (token: string, user: any) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const data = await loginUser(username, password);
      if ('token' in data) {
        onLogin(data.token, data.user);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect to server.');
    }
  };

  return (
    <div className="min-h-screen soft-gradient-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="w-full max-w-md glass-panel rounded-2xl p-8"
      >
        <div className="text-center mb-8">
          <motion.div
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center justify-center w-16 h-16 animated-gradient-bg rounded-full mb-4 shadow-lg"
          >
            <MessageSquare className="w-8 h-8 text-white" />
          </motion.div>
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Campfire</h1>
          <p className="text-gray-600 font-medium">A mindful collaboration space.</p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none transition"
            placeholder="Username"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-white/50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-400 outline-none transition"
            placeholder="Password"
          />
          {error && <div className="text-red-500 text-sm font-medium">{error}</div>}
          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="w-full animated-gradient-bg text-white py-3 rounded-xl font-semibold shadow-md"
          >
            Sign In
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
};

export default LoginPage;
