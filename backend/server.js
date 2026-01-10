// Libraries
import 'dotenv/config';
import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

import logger from './utils/logger.js';
import {
    registerSocketHandlers,
    listRoomsHandler,
    createRoomHandler,
    joinRoomDebugHandler,
    getMessagesHandler,
} from './controllers/chatController.js';

// App initialization
const app = express();
const server = http.createServer(app);




// Middleware
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST'],
}));
app.use(express.json());

// Socket.io setup for chat
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

// Register socket handlers from controller
registerSocketHandlers(io);


// Room endpoints (handlers live in controllers/chatController.js)
app.get('/rooms', listRoomsHandler);
app.post('/rooms', createRoomHandler(io));
app.post('/rooms/:id/join', joinRoomDebugHandler);
app.get('/rooms/:id/messages', getMessagesHandler);

app.get('/', (req, res) => {
    res.send("Welcome to campfire");
});


const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    logger.success(`SERVER RUNNING ON PORT ${PORT}`);
});