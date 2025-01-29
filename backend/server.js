import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",  // Be more permissive for Hugging Face deployment
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Game room management
const MAX_PLAYERS = 3;
const rooms = new Map();

class GameRoom {
  constructor(id) {
    this.id = id;
    this.players = new Map();
    this.gameState = {
      round: 1,
      currentPlayer: null,
      maxRounds: 3,
      stage: 'waiting',
      responses: new Map(),
      ratings: new Map(),
      isGameStarted: false
    };
  }

  addPlayer(socketId, username) {
    if (this.players.size >= MAX_PLAYERS) {
      return false;
    }
    this.players.set(socketId, {
      username,
      contestantNumber: this.players.size + 1
    });
    return true;
  }

  removePlayer(socketId) {
    this.players.delete(socketId);
    if (this.players.size === 0) {
      return true; // Room should be deleted
    }
    return false;
  }

  isReady() {
    return this.players.size === MAX_PLAYERS;
  }

  getPlayerInfo(socketId) {
    return this.players.get(socketId);
  }

  getAllPlayers() {
    return Array.from(this.players.entries()).map(([socketId, player]) => ({
      socketId,
      ...player
    }));
  }
}

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('joinGame', (username) => {
    // Find an available room or create a new one
    let targetRoom = null;
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.size < MAX_PLAYERS) {
        targetRoom = room;
        break;
      }
    }

    if (!targetRoom) {
      targetRoom = new GameRoom(`room-${Date.now()}`);
      rooms.set(targetRoom.id, targetRoom);
    }

    const joined = targetRoom.addPlayer(socket.id, username);
    if (!joined) {
      socket.emit('error', 'Failed to join game');
      return;
    }

    socket.join(targetRoom.id);
    socket.emit('gameJoined', {
      roomId: targetRoom.id,
      playerInfo: targetRoom.getPlayerInfo(socket.id)
    });

    // Update all players in the room
    io.to(targetRoom.id).emit('playersUpdate', {
      players: targetRoom.getAllPlayers(),
      isReady: targetRoom.isReady()
    });

    // Start game if room is full
    if (targetRoom.isReady()) {
      targetRoom.gameState.isGameStarted = true;
      io.to(targetRoom.id).emit('gameStart', {
        gameState: targetRoom.gameState
      });
    }
  });

  socket.on('submitAnswer', ({ roomId, answer }) => {
    const room = rooms.get(roomId);
    if (!room) return;

    const player = room.getPlayerInfo(socket.id);
    if (!player) return;

    room.gameState.responses.set(socket.id, answer);

    // Check if all players have submitted
    if (room.gameState.responses.size === MAX_PLAYERS) {
      io.to(roomId).emit('allAnswersSubmitted', {
        answers: Array.from(room.gameState.responses.entries()).map(([playerId, answer]) => ({
          player: room.getPlayerInfo(playerId),
          answer
        }))
      });
      room.gameState.responses.clear();
    }
  });

  socket.on('disconnect', () => {
    // Find and clean up the room this socket was in
    for (const [roomId, room] of rooms.entries()) {
      if (room.players.has(socket.id)) {
        const shouldDelete = room.removePlayer(socket.id);
        if (shouldDelete) {
          rooms.delete(roomId);
        } else {
          io.to(roomId).emit('playerLeft', {
            players: room.getAllPlayers(),
            isReady: room.isReady()
          });
        }
        break;
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
