import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Keep track of connected users
const connectedUsers = new Map();

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected on:', socket.id);

  socket.on('register', (username) => {
    if (connectedUsers.size >= 4) {
      socket.emit('error', 'Room is full');
      return;
    }

    connectedUsers.set(socket.id, username);
    io.emit('userList', Array.from(connectedUsers.values()));
    console.log(`${username} registered`);
  });

  socket.on('disconnect', () => {
    const username = connectedUsers.get(socket.id);
    connectedUsers.delete(socket.id);
    io.emit('userList', Array.from(connectedUsers.values()));
    console.log(`${username} disconnected`);
  });
});

// Basic health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
