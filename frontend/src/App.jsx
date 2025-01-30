import React, {useState, useEffect, useRef} from 'react';
import {io} from 'socket.io-client';

const GAME_SERVER_URL = 'http://localhost:8000'; //'http://51.159.182.101:80';
const SOCKET_SERVER_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';
const REACT_APP_ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;

const socket = io(SOCKET_SERVER_URL);

const VOICE_IDS = {
    host: 'Ybqj6CIlqb6M85s9Bl4n',
    contestant: 'TC0Zp7WVFzhA8zpTlRqV'
};

const HOST_INTRODUCTION = "Welcome";// to Rizztral Multiplayer, where three contestants compete for the AI bachelorette's heart!";

function App() {
    const [username, setUsername] = useState('');
    const [gameState, setGameState] = useState({
        roomId: null,
        playerInfo: null,
        round: 1,
        maxRounds: 3,
        stage: 'login',
        isGameStarted: false,
        isGameEnded: false,
        waitingForResponses: false,
        players: [],
        winner: null,
        isPlaying: false,
        questions: [],
        aiIntroduction: ''
    });

    const [gameText, setGameText] = useState('');
    const [error, setError] = useState('');
    const [userResponse, setUserResponse] = useState('');
    const [timeRemaining, setTimeRemaining] = useState(30);
    const [conversationHistory, setConversationHistory] = useState([]);

    const timerRef = useRef(null);
    const questionsRef = useRef([]);
    const responseHandledRef = useRef(false);

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const textToSpeech = async (text, role = 'contestant') => {
        try {
            const voiceId = VOICE_IDS[role];
            const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
                method: 'POST',
                headers: {
                    'Accept': 'audio/mpeg',
                    'xi-api-key': REACT_APP_ELEVENLABS_API_KEY,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    model_id: 'eleven_monolingual_v1',
                    voice_settings: {
                        stability: 0.5,
                        similarity_boost: 0.5
                    }
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to convert text to speech');
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            const audio = new Audio(audioUrl);

            setGameState(prev => ({...prev, isPlaying: true}));

            return new Promise((resolve) => {
                audio.onended = () => {
                    setGameState(prev => ({...prev, isPlaying: false}));
                    URL.revokeObjectURL(audioUrl);
                    resolve();
                };
                audio.play();
            });
        } catch (error) {
            console.error('Error in text-to-speech:', error);
            setError('Audio playback failed - continuing with text only');
            setGameState(prev => ({...prev, isPlaying: false}));
        }
    };

    useEffect(() => {
        if (gameState.stage === 'host_intro' && gameState.aiIntroduction) {
            startGame();
        }
    }, [gameState.stage, gameState.aiIntroduction]);

    useEffect(() => {
        socket.on('gameJoined', ({roomId, playerInfo}) => {
            setGameState(prev => ({
                ...prev,
                roomId,
                playerInfo,
                stage: 'waiting'
            }));
            setGameText('Waiting for other players to join...');
        });

        socket.on('playersUpdate', ({players, isReady}) => {
            setGameState(prev => ({
                ...prev,
                players,
                stage: isReady ? 'ready' : 'waiting'
            }));
        });

        socket.on('gameStart', async ({gameState: newGameState}) => {
            setGameState(prev => {
                const updatedState = {
                    ...prev,
                    ...newGameState,
                    stage: 'host_intro'
                };
                return updatedState;
            });
            startGame();
        });

        socket.on('allAnswersSubmitted', ({answers}) => {
            setGameState(prev => ({
                ...prev,
                waitingForResponses: false,
                stage: 'rating'
            }));
            processAnswers(answers);
        });

        socket.on('error', (message) => {
            setError(message);
        });

        return () => {
            socket.off('gameJoined');
            socket.off('playersUpdate');
            socket.off('gameStart');
            socket.off('allAnswersSubmitted');
            socket.off('error');
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    const handleJoinGame = (e) => {
        e.preventDefault();
        if (username.trim()) {
            socket.emit('joinGame', username.trim());
            setGameState(prev => ({
                ...prev,
                stage: 'waiting'
            }));
        }
    };

    const startGame = async () => {
        try {
            setGameText(HOST_INTRODUCTION);
            await textToSpeech(HOST_INTRODUCTION, 'host');

            // Ensure we have the AI introduction
            if (gameState.aiIntroduction) {
                setGameText(gameState.aiIntroduction);
                await textToSpeech(gameState.aiIntroduction, 'contestant');
                runGameLoop();
            }
        } catch (error) {
            setError('Failed to start game: ' + error.message);
        }
    };

    const generateQuestions = async () => {
        const questions = [];
        for (let i = 0; i < gameState.maxRounds; i++) {
            const response = await fetch(`${GAME_SERVER_URL}/get-question`);
            const data = await response.json();
            questions.push(data.question);
        }
        return questions;
    };

    const processAnswers = async (answers) => {
        try {
            const currentQuestion = gameState.questions[gameState.round - 1];

            // Update conversation history
            setConversationHistory(prev => [
                ...prev,
                ...answers.map(({player, answer, rating}) => ({
                    round: gameState.round,
                    contestant: player.contestantNumber,
                    username: player.username,
                    question: currentQuestion,
                    response: answer,
                    rating
                }))
            ]);

            // Move to next round or end game
            if (gameState.round >= gameState.maxRounds) {
                const winner = determineWinner(conversationHistory);
                const winnerAnnouncement = `And the winner is ${gameState.players.find(p =>
                    p.contestantNumber.toString() === winner)?.username}! Congratulations!`;

                setGameState(prev => ({
                    ...prev,
                    winner,
                    isGameEnded: true,
                    stage: 'winner_announcement'
                }));

                setGameText(winnerAnnouncement);
                await textToSpeech(winnerAnnouncement, 'host');
            } else {
                setGameState(prev => ({
                    ...prev,
                    round: prev.round + 1,
                    stage: 'round_start'
                }));
                await delay(1000);
                runGameLoop();
            }
        } catch (error) {
            setError('Error processing answers: ' + error.message);
        }
    };

    const determineWinner = (history) => {
        const playerScores = {};
        history.forEach(entry => {
            if (!playerScores[entry.contestant]) {
                playerScores[entry.contestant] = [];
            }
            playerScores[entry.contestant].push(entry.rating);
        });

        let highestAvg = -1;
        let winner = null;

        Object.entries(playerScores).forEach(([contestant, scores]) => {
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            if (avg > highestAvg) {
                highestAvg = avg;
                winner = contestant;
            }
        });

        return winner;
    };

    const runGameLoop = async () => {
        if (gameState.round <= gameState.maxRounds) {
            const currentQuestion = gameState.questions[gameState.round - 1];
            setGameText(currentQuestion);
            await textToSpeech(currentQuestion, 'contestant');

            setGameState(prev => ({
                ...prev,
                waitingForResponses: true,
                stage: 'answer_submission'
            }));
            startResponseTimer();
        }
    };

    const startResponseTimer = () => {
        responseHandledRef.current = false;
        setTimeRemaining(30);
        if (timerRef.current) {
            clearInterval(timerRef.current);
        }

        timerRef.current = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    handleTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleTimeUp = () => {
        if (responseHandledRef.current) return;

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        responseHandledRef.current = true;
        submitResponse("I don't know");
    };

    const submitResponse = (response) => {
        if (responseHandledRef.current) return;
        responseHandledRef.current = true;

        socket.emit('submitAnswer', {
            roomId: gameState.roomId,
            answer: response
        });
        setUserResponse('');

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-purple-800">Rizztral Multiplayer</h1>

            {error && (
                <div
                    className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
                    <span>{error}</span>
                    <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">×</button>
                </div>
            )}

            {gameState.stage === 'login' && (
                <form onSubmit={handleJoinGame} className="mb-6 bg-white shadow-lg rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4 text-purple-700">Join the Dating Game Show</h2>
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        className="w-full p-4 border rounded-lg mb-4 focus:ring-2 focus:ring-purple-500"
                        required
                    />
                    <button
                        type="submit"
                        className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg text-lg font-semibold transition-colors"
                    >
                        Join Game
                    </button>
                </form>
            )}

            {gameState.stage === 'waiting' && (
                <div className="mb-6 bg-white shadow-lg rounded-lg p-6">
                    <h2 className="text-xl font-bold mb-4 text-purple-700">Waiting for Players</h2>
                    <p className="mb-4">Players joined: {gameState.players.length} / 3</p>
                    <div className="space-y-2">
                        {gameState.players.map(player => (
                            <div key={player.socketId} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                                <span className="font-medium">{player.username}</span>
                                {player.socketId === socket.id && (
                                    <span className="text-sm text-gray-500">(You)</span>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {gameState.stage !== 'login' && gameState.stage !== 'waiting' && (
                <div className="mb-6 bg-gray-50 p-4 rounded-lg shadow">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <div className="text-lg mb-2">Round: {gameState.round} / {gameState.maxRounds}</div>
                            <div className="text-lg mb-2">Stage: {gameState.stage}</div>
                            <div className="text-lg">
                                Status: {
                                gameState.isPlaying ? 'Speaking' :
                                    gameState.waitingForResponses ? 'Waiting for responses' :
                                        gameState.isGameEnded ? 'Game Complete' : 'Waiting'
                            }
                            </div>
                        </div>
                        <div>
                            <div className="text-lg mb-2">Players:</div>
                            {gameState.players.map(player => (
                                <div key={player.socketId} className="flex items-center gap-2">
                                    <span className={`w-3 h-3 rounded-full ${
                                        player.socketId === socket.id ? 'bg-green-500' : 'bg-gray-500'
                                    }`}></span>
                                    {player.username}
                                    {player.socketId === socket.id && ' (You)'}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {gameState.waitingForResponses && !responseHandledRef.current && (
                <div className="mb-6 bg-white shadow-lg rounded-lg p-6">
                    <div className="text-xl font-semibold mb-2 text-purple-700">
                        Your Turn! Time remaining: {timeRemaining}s
                    </div>
                    <form onSubmit={(e) => {
                        e.preventDefault();
                        submitResponse(userResponse);
                    }}>
                        <textarea
                            value={userResponse}
                            onChange={(e) => setUserResponse(e.target.value)}
                            className="w-full p-4 border rounded-lg mb-4 h-32 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="Type your response here..."
                        />
                        <button
                            type="submit"
                            disabled={!userResponse.trim() || responseHandledRef.current}
                            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg text-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                        >
                            Submit Response
                        </button>
                    </form>
                </div>
            )}

            {gameText && (
                <div className="bg-gray-100 p-6 rounded-lg mb-6 shadow">
                    <h2 className="font-bold mb-2 text-purple-800">Current Text:</h2>
                    <p className="text-lg">{gameText}</p>
                </div>
            )}

            {gameState.winner && (
                <div className="mb-6 bg-green-100 p-6 rounded-lg shadow-lg">
                    <h2 className="text-2xl font-bold text-green-800 mb-2">
                        Winner Announcement!
                    </h2>
                    <p className="text-lg text-green-700">
                        {gameState.winner === gameState.playerInfo?.contestantNumber.toString()
                            ? 'Congratulations! You won!'
                            : `${gameState.players.find(p => p.contestantNumber.toString() === gameState.winner)?.username} won!`}
                    </p>
                </div>
            )}

            {conversationHistory.length > 0 && (
                <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
                    <h2 className="text-2xl font-bold mb-6 text-purple-800">Game History</h2>
                    {[...Array(gameState.maxRounds)].map((_, roundIndex) => {
                        const roundNumber = roundIndex + 1;
                        const roundConversations = conversationHistory.filter(
                            conv => conv.round === roundNumber
                        );

                        if (roundConversations.length === 0) return null;

                        return (
                            <div key={roundNumber} className="mb-8 last:mb-0">
                                <h3 className="text-xl font-semibold mb-4 text-purple-700">
                                    Round {roundNumber}
                                </h3>
                                <div className="grid gap-4">
                                    {roundConversations.map((conv, index) => (
                                        <div
                                            key={`${roundNumber}-${index}`}
                                            className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-semibold text-purple-600">
                                                    {conv.username}
                                                    {conv.contestant === gameState.playerInfo?.contestantNumber && ' (You)'}
                                                </span>
                                                <span className="text-green-600 font-medium">
                                                    Rating: {conv.rating?.toFixed(1)}/10
                                                </span>
                                            </div>

                                            <div className="mb-2">
                                                <span className="text-gray-600 font-medium">Question:</span>
                                                <p className="ml-4 text-gray-800">{conv.question}</p>
                                            </div>

                                            <div>
                                                <span className="text-gray-600 font-medium">Response:</span>
                                                <p className="ml-4 text-gray-800">{conv.response}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

export default App;
