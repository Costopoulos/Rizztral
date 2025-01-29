import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

const REACT_APP_ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const GAME_SERVER_URL = 'http://localhost:8000';

const VOICE_IDS = {
    host: 'Ybqj6CIlqb6M85s9Bl4n',
    contestant: 'TC0Zp7WVFzhA8zpTlRqV'
};

const HOST_INTRODUCTION = "Welcome";// to Rizztral, the hottest dating show where an AI bachelorette will choose between three amazing contestants!";

const WINNER_ANNOUNCEMENTS = {
    contestant1: "And the winner is our adventurous bachelor - Contestant 1! What a thrilling journey it has been!",
    contestant2: "Our poetic soul, Contestant 2, has won the heart of our bachelorette!",
    contestant3: "Congratulations to our charming contestant - YOU have won the game!"
};

function App() {
    const [gameState, setGameState] = useState({
        round: 1,
        currentContestant: 1,
        isPlaying: false,
        isGameStarted: false,
        isGameEnded: false,
        waitingForUserResponse: false,
        maxRounds: 3,
        stage: 'initial',
        winner: null,
        questions: [],
        contestantRatings: {
            contestant1: [],
            contestant2: [],
            contestant3: []
        }
    });

    const [gameText, setGameText] = useState('');
    const [error, setError] = useState('');
    const [userResponse, setUserResponse] = useState('');
    const [timeRemaining, setTimeRemaining] = useState(20);
    const [conversationHistory, setConversationHistory] = useState([]);
    const timerRef = useRef(null);
    const userResponsePromiseRef = useRef(null);
    const questionsRef = useRef([]);

    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    const handleFetchWithRetry = async (url, options = {}, retries = 3) => {
        let lastError;
        for (let i = 0; i < retries; i++) {
            try {
                const response = await fetch(url, options);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                return data;
            } catch (error) {
                lastError = error;
                if (i === retries - 1) break;
                await delay(1000 * (i + 1));
            }
        }
        throw lastError;
    };

    const advanceStage = () => {
        const stages = [
            'initial',
            'host_intro',
            'ai_intro',
            'question_submission',
            'round_start',
            'answer_submission',
            'rating',
            'next_round',
            'winner_announcement',
            'game_complete'
        ];

        setGameState(prev => {
            const currentIndex = stages.indexOf(prev.stage);
            if (currentIndex < stages.length - 1) {
                return { ...prev, stage: stages[currentIndex + 1] };
            }
            return prev;
        });
    };

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

            setGameState(prev => ({ ...prev, isPlaying: true }));

            return new Promise((resolve) => {
                audio.onended = () => {
                    setGameState(prev => ({ ...prev, isPlaying: false }));
                    URL.revokeObjectURL(audioUrl);
                    resolve();
                };
                audio.play();
            });
        } catch (error) {
            console.error('Error in text-to-speech:', error);
            setError('Audio playback failed - continuing with text only');
            setGameState(prev => ({ ...prev, isPlaying: false }));
        }
    };

    const generateQuestions = async () => {
        const questions = [];
        for (let i = 0; i < gameState.maxRounds; i++) {
            const response = await handleFetchWithRetry(`${GAME_SERVER_URL}/get-question`);
            questions.push(response.question);
        }
        return questions;
    };

    const calculateWinner = () => {
        const avgRatings = {};
        Object.entries(gameState.contestantRatings).forEach(([contestant, ratings]) => {
            avgRatings[contestant] = ratings.reduce((a, b) => a + b, 0) / ratings.length;
        });
        return Object.entries(avgRatings).reduce((a, b) => a[1] > b[1] ? a : b)[0];
    };

    const startResponseTimer = () => {
        setTimeRemaining(20);
        if (timerRef.current) clearInterval(timerRef.current);

        timerRef.current = setInterval(() => {
            setTimeRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(timerRef.current);
                    handleTimeUp();
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    const handleTimeUp = async () => {
        if (userResponse.trim() === '') {
            setError("Time's up! Submitting default response.");
            setUserResponse("I don't know");
        }
        if (userResponsePromiseRef.current) {
            await handleUserResponse(true);
        }
    };

    const handleUserResponse = async (isTimeout = false) => {
        try {
            const responseToSubmit = isTimeout ? "I don't know" : userResponse.trim() || "I don't know";

            clearInterval(timerRef.current);
            setGameState(prev => ({
                ...prev,
                waitingForUserResponse: false,
                stage: 'rating'
            }));

            await processRoundResponses(responseToSubmit);

            setUserResponse('');

            if (userResponsePromiseRef.current) {
                userResponsePromiseRef.current.resolve();
                userResponsePromiseRef.current = null;
            }
        } catch (error) {
            console.error('Error submitting response:', error);
            setError('Failed to submit response - please try again');
            if (userResponsePromiseRef.current) {
                userResponsePromiseRef.current.reject(error);
                userResponsePromiseRef.current = null;
            }
        }
    };

    const processRoundResponses = async (userResponseText) => {
        try {
            const currentQuestion = questionsRef.current[gameState.round - 1];
            const aiAnswers = await handleFetchWithRetry(`${GAME_SERVER_URL}/get-ai-answers?question=${encodeURIComponent(currentQuestion)}`);

            const ratings = {};
            for (const [contestant, answer] of Object.entries(aiAnswers)) {
                const response = await handleFetchWithRetry(
                    `${GAME_SERVER_URL}/rate-answer`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            conversation: `Question: ${currentQuestion}\nAnswer: ${answer}`,
                            round_number: gameState.round
                        })
                    }
                );
                ratings[contestant] = response.rating;
            }

            // Rate user response
            const userRating = await handleFetchWithRetry(
                `${GAME_SERVER_URL}/rate-answer`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        conversation: `Question: ${currentQuestion}\nAnswer: ${userResponseText}`,
                        round_number: gameState.round
                    })
                }
            );
            ratings.contestant3 = userRating.rating;

            setGameState(prev => ({
                ...prev,
                contestantRatings: {
                    contestant1: [...prev.contestantRatings.contestant1, ratings.contestant1],
                    contestant2: [...prev.contestantRatings.contestant2, ratings.contestant2],
                    contestant3: [...prev.contestantRatings.contestant3, ratings.contestant3]
                }
            }));

            setConversationHistory(prev => {
                const currentRound = gameState.round;
                const newHistory = [...prev];

                newHistory.push({
                    round: currentRound,
                    contestant: 3,
                    question: currentQuestion,
                    response: userResponseText,
                    rating: ratings.contestant3
                });

                Object.entries(aiAnswers).forEach(([contestant, answer]) => {
                    newHistory.push({
                        round: currentRound,
                        contestant: parseInt(contestant.slice(-1)),
                        question: currentQuestion,
                        response: answer,
                        rating: ratings[contestant]
                    });
                });

                return newHistory;
            });
        } catch (error) {
            console.error('Error processing round responses:', error);
            setError('Failed to process round responses');
            throw error;
        }
    };

    const waitForUserResponse = () => {
        return new Promise((resolve, reject) => {
            userResponsePromiseRef.current = { resolve, reject };
        });
    };

    const runGameLoop = async () => {
        try {
            const questions = await generateQuestions();
            questionsRef.current = questions;

            setGameState(prev => ({
                ...prev,
                round: 1,
                currentContestant: 1,
                isGameStarted: true,
                isGameEnded: false,
                stage: 'host_intro',
                winner: null,
                questions,
                contestantRatings: {
                    contestant1: [],
                    contestant2: [],
                    contestant3: []
                }
            }));

            setGameText(HOST_INTRODUCTION);
            await textToSpeech(HOST_INTRODUCTION, 'host');
            advanceStage();

            const aiIntroResponse = await handleFetchWithRetry(`${GAME_SERVER_URL}/ai-introduction`);
            // trim the text to contain only the first word
            aiIntroResponse.text = aiIntroResponse.text.split(' ')[0];
            setGameText(aiIntroResponse.text);
            await textToSpeech(aiIntroResponse.text);
            advanceStage();

            for (let round = 1; round <= gameState.maxRounds; round++) {
                setGameState(prev => ({
                    ...prev,
                    round,
                    stage: 'round_start'
                }));

                const currentQuestion = questionsRef.current[round - 1];
                setGameText(currentQuestion);
                await textToSpeech(currentQuestion, 'contestant');

                setGameState(prev => ({
                    ...prev,
                    waitingForUserResponse: true,
                    stage: 'answer_submission'
                }));

                startResponseTimer();
                await waitForUserResponse();

                if (round === gameState.maxRounds) {
                    const winner = calculateWinner();
                    const winnerAnnouncement = WINNER_ANNOUNCEMENTS[winner];

                    setGameState(prev => ({
                        ...prev,
                        stage: 'winner_announcement',
                        winner,
                        isGameEnded: true
                    }));

                    setGameText(winnerAnnouncement);
                    await textToSpeech(winnerAnnouncement, 'host');
                    break;
                }

                setGameState(prev => ({
                    ...prev,
                    stage: 'round_start'
                }));
            }
        } catch (error) {
            console.error('Error in game loop:', error);
            setError(`Game error: ${error.message}`);
            setGameState(prev => ({
                ...prev,
                isGameStarted: false,
                isGameEnded: false
            }));
        }
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-purple-800">AI Dating Game Show</h1>

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 flex justify-between items-center">
                    <span>{error}</span>
                    <button
                        onClick={() => setError('')}
                        className="text-red-700 hover:text-red-900"
                    >
                        ×
                    </button>
                </div>
            )}

            <div className="mb-6 bg-gray-50 p-4 rounded-lg shadow">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <div className="text-lg mb-2">Round: {gameState.round} / {gameState.maxRounds}</div>
                        <div className="text-lg mb-2">Stage: {gameState.stage}</div>
                    </div>
                    <div>
                        <div className="text-lg">
                            Status: {
                                gameState.isPlaying ? 'Speaking' :
                                gameState.waitingForUserResponse ? 'Waiting for your response' :
                                gameState.isGameEnded ? 'Game Complete' : 'Waiting'
                            }
                        </div>
                    </div>
                </div>
            </div>

            <div className="mb-6 space-x-4">
                <button
                    onClick={runGameLoop}
                    disabled={gameState.isPlaying || gameState.isGameStarted}
                    className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg text-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    Start Game
                </button>

                <button
                    onClick={() => {
                        setGameState({
                            round: 1,
                            currentContestant: 1,
                            isPlaying: false,
                            isGameStarted: false,
                            isGameEnded: false,
                            waitingForUserResponse: false,
                            maxRounds: 3,
                            stage: 'initial',
                            winner: null,
                            questions: [],
                            contestantRatings: {
                                contestant1: [],
                                contestant2: [],
                                contestant3: []
                            }
                        });
                        setConversationHistory([]);
                        setError('');
                    }}
                    disabled={gameState.isPlaying || !gameState.isGameStarted}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg text-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    Reset Game
                </button>
            </div>

            {gameState.waitingForUserResponse && (
                <div className="mb-6 bg-white shadow-lg rounded-lg p-6">
                    <div className="text-xl font-semibold mb-2 text-purple-700">
                        Your Turn! Time remaining: {timeRemaining}s
                    </div>
                    <form
                        onSubmit={async (e) => {
                            e.preventDefault();
                            await handleUserResponse(false);
                        }}
                        className="space-y-4"
                    >
                        <textarea
                            value={userResponse}
                            onChange={(e) => setUserResponse(e.target.value)}
                            className="w-full p-4 border rounded-lg mb-4 h-32 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            placeholder="Type your response here..."
                        />
                        <button
                            type="submit"
                            disabled={userResponse.trim() === ''}
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
                        {gameState.winner === 'contestant3' ? 'Congratulations! You won!' :
                            `AI Contestant ${gameState.winner.slice(-1)} won!`}
                    </p>
                    {gameState.stage === 'game_complete' && (
                        <button
                            onClick={() => window.location.reload()}
                            className="mt-4 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                        >
                            Play Again
                        </button>
                    )}
                </div>
            )}

            {conversationHistory.length > 0 && (
                <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
                    <h2 className="text-2xl font-bold mb-6 text-purple-800">Conversation History</h2>

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

                                <div className="space-y-4">
                                    {roundConversations.map((conv, index) => (
                                        <div
                                            key={`${roundNumber}-${index}`}
                                            className="p-4 border rounded-lg hover:shadow-md transition-shadow"
                                        >
                                            <div className="flex justify-between items-center mb-2">
                                                <span className="font-semibold text-purple-600">
                                                    {conv.contestant === 3 ? 'You' : `AI Contestant ${conv.contestant}`}
                                                </span>
                                                {conv.rating !== undefined && (
                                                    <span className="text-green-600 font-medium">
                                                        Rating: {conv.rating.toFixed(1)}/10
                                                    </span>
                                                )}
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
