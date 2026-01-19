import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';

dotenv.config();
const app = express();
const server = createServer(app);

app.use(cors());
app.use(express.json())
app.use('/api/auth', authRoutes);

// DB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));


// frontend route
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // React app URL
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Create room
  socket.on('createRoom', ({ roomId }, callback) => {
    if (!roomId || typeof roomId !== 'string' || roomId.trim() === '') {
      if (typeof callback === 'function') callback({ ok: false, error: 'Invalid room id' });
      return;
    }
    roomId = roomId.trim();
    if (rooms.has(roomId)) {
      if (typeof callback === 'function') callback({ ok: false, error: 'Room already exists' });
      return;
    }
    rooms.set(roomId, { messages: [] });
    console.log(`Room created: ${roomId}`);
    // notify all clients a room was created
    io.emit('roomCreated', { roomId });
    if (typeof callback === 'function') callback({ ok: true, roomId });
  });

  // Join room - requires the room to already exist
  socket.on('joinRoom', ({ roomId, username }, callback) => {
    if (!roomId || !rooms.has(roomId)) {
      if (typeof callback === 'function') callback({ ok: false, error: 'Room not found' });
      socket.emit('roomNotFound', { roomId });
      return;
    }
    socket.join(roomId);
    console.log(`${username} joined room: ${roomId}`);

    // Send existing message history to the joining socket
    const history = rooms.get(roomId).messages || [];
    socket.emit('roomJoined', { roomId, history });

    // Notify others in room
    socket.to(roomId).emit('message', {
      username: 'System',
      message: `${username} joined the room`,
      timestamp: new Date()
    });

    if (typeof callback === 'function') callback({ ok: true, roomId });
  });

  // Handle chat messages
  socket.on('chatMessage', ({ roomId, message, username }) => {
    if (!roomId || !rooms.has(roomId)) {
      socket.emit('error', { error: 'Room not found' });
      return;
    }

    const messageData = {
      username,
      message,
      timestamp: new Date()
    };

    // store in room history
    const room = rooms.get(roomId);
    room.messages = room.messages || [];
    room.messages.push(messageData);

    // Broadcast to all users in the room (including sender)
    io.to(roomId).emit('message', messageData);

    console.log(`Message in ${roomId} from ${username}: ${message}`);
  });

  // Leave room
  socket.on('leaveRoom', ({ roomId, username }) => {
    socket.leave(roomId);
    console.log(`Client left room: ${roomId}`);
    socket.to(roomId).emit('message', {
      username: 'System',
      message: `${username || 'A user'} left the room`,
      timestamp: new Date()
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});