import express from 'express';
import {createServer} from 'http';
import {Server} from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';

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
dotenv.config();

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
            isGameStarted: false,
            questions: [],
            aiIntroduction: ''
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

            // Generate questions and AI introduction for the room
            fetch(`${process.env.GAME_SERVER_URL}/get-question`)
                .then(res => res.json())
                .then(async data => {
                    const questions = [data.question];
                    for (let i = 1; i < targetRoom.gameState.maxRounds; i++) {
                        const res = await fetch(`${process.env.GAME_SERVER_URL}/get-question`);
                        const data = await res.json();
                        questions.push(data.question);
                    }
                    targetRoom.gameState.questions = questions;

                    // Get AI introduction
                    const introRes = await fetch(`${process.env.GAME_SERVER_URL}/ai-introduction`);
                    const introData = await introRes.json();
                    targetRoom.gameState.aiIntroduction = introData.text;

                    io.to(targetRoom.id).emit('gameStart', {
                        gameState: targetRoom.gameState
                    });
                });
        }
    });

    socket.on('submitAnswer', async ({roomId, answer}) => {
        const room = rooms.get(roomId);
        if (!room) return;

        const player = room.getPlayerInfo(socket.id);
        if (!player) return;

        room.gameState.responses.set(socket.id, answer);

        // Check if all players have submitted
        if (room.gameState.responses.size === MAX_PLAYERS) {
            const currentQuestion = room.gameState.questions[room.gameState.round - 1];

            // Get ratings for all answers
            const ratedAnswers = await Promise.all(
                Array.from(room.gameState.responses.entries()).map(async ([playerId, answer]) => {
                    const response = await fetch(`${process.env.GAME_SERVER_URL}/rate-answer`, {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify({
                            conversation: `Question: ${currentQuestion}\nAnswer: ${answer}`,
                            round_number: room.gameState.round
                        })
                    });
                    const data = await response.json();
                    return {
                        player: room.getPlayerInfo(playerId),
                        answer,
                        rating: data.rating
                    };
                })
            );

            io.to(roomId).emit('allAnswersSubmitted', {answers: ratedAnswers});
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
