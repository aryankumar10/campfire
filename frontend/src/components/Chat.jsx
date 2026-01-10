import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import axios from 'axios';

const socket = io('http://localhost:8000');

function Chat() {
  const [roomId, setRoomId] = useState('');
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    socket.on('receive_message', (data) => {
      setMessages((prev) => [...prev, data]);
    });

    socket.on('chat_history', (history) => {
      setMessages(history);
    });

    return () => {
      socket.off('receive_message');
      socket.off('chat_history');
    };
  }, []);

  const joinRoom = async () => {
    if (!roomId) return;
    try {
      // First try to create the room if it doesn't exist
      await axios.post('http://localhost:8000/rooms', { id: roomId });
    } catch (err) {
      // If room already exists, that's fine, we just join it
      console.log('Room might already exist or other error', err.response?.data?.error);
    }

    socket.emit('join_room', roomId, (response) => {
      if (response.ok) {
        setJoined(true);
        setError('');
      } else {
        setError(response.error || 'Failed to join room');
      }
    });
  };

  const sendMessage = () => {
    if (!message || !roomId) return;
    socket.emit('send_message', { room: roomId, text: message }, (response) => {
      if (response.ok) {
        setMessage('');
      } else {
        setError(response.error || 'Failed to send message');
      }
    });
  };

  if (!joined) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Join a Chat Room</h2>
        <input
          type="text"
          placeholder="Enter Room ID"
          value={roomId}
          onChange={(e) => setRoomId(e.target.value)}
        />
        <button onClick={joinRoom}>Join / Create Room</button>
        {error && <p style={{ color: 'red' }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Room: {roomId}</h2>
      <div style={{ border: '1px solid #ccc', height: '300px', overflowY: 'scroll', marginBottom: '10px', padding: '10px' }}>
        {messages.map((msg) => (
          <div key={msg.id} style={{ marginBottom: '5px' }}>
            <strong>{msg.sender === socket.id ? 'You' : msg.sender}:</strong> {msg.text}
            <div style={{ fontSize: '0.8em', color: '#888' }}>{new Date(msg.createdAt).toLocaleTimeString()}</div>
          </div>
        ))}
      </div>
      <input
        type="text"
        placeholder="Type a message..."
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
      />
      <button onClick={sendMessage}>Send</button>
      <button onClick={() => setJoined(false)} style={{ marginLeft: '10px' }}>Leave Room</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
}

export default Chat;
