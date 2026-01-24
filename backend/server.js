import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import authRoutes from './routes/authRoutes.js';
import User from './models/User.js';
import Room from './models/Room.js';
import Message from './models/Message.js';

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

      socket.join(roomId);

      // Fetch message history
      const messages = await Message.find({room_id: roomInDb._id})
        .sort({createdAt: 1})
        .populate('sender', 'username name');
      
      // Format for Frontend
      const history = messages.map(msg => ({
        username: msg.sender ? msg.sender.username : 'Unknown',
        message: msg.content,
        timestamp: msg.createdAt
      }));

      socket.emit('roomJoined', { roomId, history });

      // Notify others
      socket.to(roomId).emit('message', {
        username: 'System',
        message: `${username} joined the room`,
        timestamp: new Date()
      });

      callback?.({ ok: true, roomId });
    } 
    catch (err) {
      console.error(err);
      callback?.({ ok: false, error: 'Join error' });
    }
  });

  // Handle chat messages
  socket.on('chatMessage', async ({ roomId, message, username }) => {
    try {
      const room = await Room.findOne({ name: roomId });
      const user = await User.findOne({ username });
      if (!room || !user) {
        return;   // return error msg
      }

      // Save msg to DB
      const newMsg = new Message({
        room_id: room._id,
        sender: user._id,
        content: message,
        project: room.project // null for non project rooms
      });
      await newMsg.save();

      // Send to room
      const messageData = {
        username: user.username,
        message: message,
        timestamp: newMsg.createdAt
      };
      io.to(roomId).emit('message', messageData);
    } 
    catch (err) {
      console.error("Message Error:", err);
    }
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