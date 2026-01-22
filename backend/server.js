import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import Room from './models/Room.js';

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
    origin: `http://localhost:${process.env.REACT_APP_PORT}`, // React app URL
    methods: ["GET", "POST"]
  }
});

const rooms = new Map();
const activeRooms = new Map();

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Create room
  socket.on('createRoom', async ({ roomId }, callback) => {
    try {
      if (!roomId || roomId.trim() === '') {
        return callback?.({ ok: false, error: 'Invalid room ID' });
      }

      // Check DB first
      const existingRoom = await Room.findOne({ name: roomId });
      if (existingRoom) {
        return callback?.({ ok: false, error: 'Room already exists in database' });
      }

      // Save to DB
      const newRoom = new Room({ name: roomId });
      await newRoom.save();
      console.log(`✅ Room created in DB: ${roomId}`);

      // Notify clients
      io.emit('roomCreated', { roomId });
      callback?.({ ok: true, roomId });

    } catch (err) {
      console.error(err);
      callback?.({ ok: false, error: 'Failed to create room' });
    }
  });

  // Join room - requires the room to already exist
  socket.on('joinRoom', async ({ roomId, username }, callback) => {
    try {
      // Check DB to ensure room actually exists
      const roomInDb = await Room.findOne({ name: roomId });

      if (!roomInDb) {
        socket.emit('roomNotFound', { roomId });
        return callback?.({ ok: false, error: 'Room not found in database' });
      }

      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, { messages: [] });
      }

      socket.join(roomId);
      console.log(`${username} joined room: ${roomId}`);

      // Send temporary history from memory
      const history = activeRooms.get(roomId).messages || [];
      socket.emit('roomJoined', { roomId, history });

      socket.to(roomId).emit('message', {
        username: 'System',
        message: `${username} joined the room`,
        timestamp: new Date()
      });

      callback?.({ ok: true, roomId });

    } catch (err) {
      console.error(err);
      callback?.({ ok: false, error: 'Join error' });
    }
  });

  // Handle chat messages
  socket.on('chatMessage', ({ roomId, message, username }) => {
    if (!activeRooms.has(roomId)) {
        // Edge case: If server restarts while user is connected
        // For now, simple error:
        return; 
    }
    const messageData = { username, message, timestamp: new Date() };
    activeRooms.get(roomId).messages.push(messageData);
    io.to(roomId).emit('message', messageData);
  });

  // Leave room
  socket.on('leaveRoom', ({ roomId, username }) => {
    socket.leave(roomId);
    console.log(`Client left room: ${roomId}`);

    const systemMessage = {
      username: 'System',
      message: `${username || 'A user'} left the room`,
      timestamp: new Date()
    };

    if (activeRooms.has(roomId)) {
      activeRooms.get(roomId).messages.push(systemMessage);
    }
    socket.to(roomId).emit('message', systemMessage);

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