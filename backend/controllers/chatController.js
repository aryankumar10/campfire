import logger from '../utils/logger.js';

// In-memory runtime store for chat room IDs and messages (testing only)
export const rooms = [];
export const messages = {};

export function generateRoomId() {
    return Math.random().toString(36).substring(2, 9);
}

export function generateMessageId() {
    return Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
}

// Register socket handlers on an existing Socket.IO Server instance
export function registerSocketHandlers(io) {
    io.on('connection', (socket) => {
        logger.info('User Connected:', socket.id);

        // user joining a specific chat room (expects room id string)
        socket.on('join_room', (roomId, callback) => {
            if (!rooms.includes(roomId)) {
                if (typeof callback === 'function') callback({ ok: false, error: 'Room not found' });
                return;
            }
            socket.join(roomId);
            logger.room(`User ${socket.id} joined`, roomId);
            // send chat history to the joining socket
            const history = messages[roomId] || [];
            socket.emit('chat_history', history);
            if (typeof callback === 'function') callback({ ok: true });
        });

        // send msg
        // expects data: { room, text, meta? }
        socket.on('send_message', (data, callback) => {
            const room = data && (data.room || data.roomId);
            if (!room || !rooms.includes(room)) {
                if (typeof callback === 'function') callback({ ok: false, error: 'Room not found' });
                return;
            }
            const message = {
                id: generateMessageId(),
                room,
                sender: socket.id,
                text: data.text || data.message || '',
                meta: data.meta || {},
                createdAt: new Date().toISOString(),
            };
            messages[room] = messages[room] || [];
            messages[room].push(message);
            // broadcast to everyone in the room (including sender)
            io.in(room).emit('receive_message', message);
            logger.info('Message saved:', message.id, 'room:', room);
            if (typeof callback === 'function') callback({ ok: true, message });
        });

        socket.on('disconnect', () => {
            logger.info('User Disconnected', socket.id);
        });
    });
}

// Express route handlers (runtime-only testing)
export function listRoomsHandler(req, res) {
    res.json({ rooms });
}

export function createRoomHandler(io) {
    return (req, res) => {
        let { id } = req.body || {};
        if (!id) {
            id = generateRoomId();
        }
        if (rooms.includes(id)) {
            return res.status(400).json({ error: 'Room already exists' });
        }
        rooms.push(id);
        // initialize message history for this room
        messages[id] = [];
        // notify connected clients a room was created
        io.emit('room_created', { id });
        res.status(201).json({ id });
    };
}

export function joinRoomDebugHandler(req, res) {
    const { id } = req.params;
    if (!rooms.includes(id)) return res.status(404).json({ error: 'Room not found' });
    res.json({ ok: true, id });
}

export function getMessagesHandler(req, res) {
    const { id } = req.params;
    if (!rooms.includes(id)) return res.status(404).json({ error: 'Room not found' });
    res.json({ messages: messages[id] || [] });
}
