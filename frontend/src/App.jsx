import React, { useState, useEffect, useRef } from 'react';
import { ChatInterface } from './components/ChatInterface';
import { Participants } from './components/Participants';
import { GameStatus } from './components/GameStatus';

const REACT_APP_ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const GAME_SERVER_URL = 'http://51.159.182.101:80';

const VOICE_IDS = {
    host: 'Ybqj6CIlqb6M85s9Bl4n',
    contestant: 'TC0Zp7WVFzhA8zpTlRqV'
};

const HOST_INTRODUCTION = "Welcome to Rizztral, the hottest dating show where an AI bachelorette will choose between three amazing contestants!";

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
    const [userResponse, setUserResponse] = useState('');
    const [timeRemaining, setTimeRemaining] = useState(30);
    const [conversationHistory, setConversationHistory] = useState([]);
    const responseHandledRef = useRef(false);
    const timerRef = useRef(null);
    const userResponsePromiseRef = useRef(null);
    const questionsRef = useRef([]);
    const ratingsRef = useRef({
        contestant1: [],
        contestant2: [],
        contestant3: []
    });

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
        const ratings = ratingsRef.current;

        const avgRatings = {};
        Object.entries(ratings).forEach(([contestant, contestantRatings]) => {
            const validRatings = contestantRatings.filter(rating => !isNaN(rating) && rating !== null);
            if (validRatings.length > 0) {
                avgRatings[contestant] = validRatings.reduce((a, b) => a + b, 0) / validRatings.length;
            } else {
                avgRatings[contestant] = 0;
            }
        });

        return Object.entries(avgRatings)
            .reduce((a, b) => a[1] > b[1] ? a : b)[0];
    };

    const startResponseTimer = () => {
        responseHandledRef.current = false;

        setTimeRemaining(30);
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
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

    const handleTimeUp = async () => {
        if (responseHandledRef.current) return;

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        responseHandledRef.current = true;

        const defaultResponse = "I don't know";
        setUserResponse(defaultResponse);

        if (userResponsePromiseRef.current) {
            setGameState(prev => ({
                ...prev,
                waitingForUserResponse: false,
                stage: 'rating'
            }));

            await processRoundResponses(defaultResponse);
            userResponsePromiseRef.current.resolve();
            userResponsePromiseRef.current = null;
        }
    };

    const handleUserResponse = async (isTimeout = false) => {
        if (responseHandledRef.current) return;

        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }

        responseHandledRef.current = true;

        try {
            const responseToSubmit = isTimeout ? "I don't know" : userResponse.trim() || "I don't know";

            setGameState(prev => ({
                ...prev,
                waitingForUserResponse: false,
                stage: 'rating'
            }));

            await processRoundResponses(responseToSubmit);

            if (userResponsePromiseRef.current) {
                userResponsePromiseRef.current.resolve();
                userResponsePromiseRef.current = null;
            }

            setUserResponse('');
        } catch (error) {
            if (userResponsePromiseRef.current) {
                userResponsePromiseRef.current.reject(error);
                userResponsePromiseRef.current = null;
            }
        }
    };

    const processRoundResponses = async (userResponseText) => {
        try {
            const currentQuestion = questionsRef.current[gameState.round - 1];

            const aiAnswers = {};
            for (let contestant = 1; contestant <= 2; contestant++) {
                const response = await handleFetchWithRetry(
                    `${GAME_SERVER_URL}/get-ai-answers?question=${encodeURIComponent(currentQuestion)}&contestant=${contestant}`
                );
                aiAnswers[`contestant${contestant}`] = response.answer;
            }

            const roundRatings = {
                contestant1: 0,
                contestant2: 0,
                contestant3: 0
            };

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
                roundRatings[contestant] = response.rating;
            }

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
            roundRatings.contestant3 = userRating.rating;

            Object.keys(roundRatings).forEach(contestant => {
                ratingsRef.current[contestant].push(roundRatings[contestant]);
            });

            setGameState(prev => ({
                ...prev,
                contestantRatings: {
                    contestant1: [...ratingsRef.current.contestant1],
                    contestant2: [...ratingsRef.current.contestant2],
                    contestant3: [...ratingsRef.current.contestant3]
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
                    rating: roundRatings.contestant3
                });

                Object.entries(aiAnswers).forEach(([contestant, answer]) => {
                    newHistory.push({
                        round: currentRound,
                        contestant: parseInt(contestant.slice(-1)),
                        question: currentQuestion,
                        response: answer,
                        rating: roundRatings[contestant]
                    });
                });

                return newHistory;
            });
        } catch (error) {
            throw error;
        }
    };

    const waitForUserResponse = () => {
        return new Promise((resolve, reject) => {
            responseHandledRef.current = false;
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
        <div className="app-container">
            <div className="top-container">
                <Participants gameState={gameState} />
                <GameStatus gameState={gameState} />
            </div>

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
                        ratingsRef.current = {
                            contestant1: [],
                            contestant2: [],
                            contestant3: []
                        };
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
                    }}
                    disabled={gameState.isPlaying || !gameState.isGameStarted}
                    className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-lg text-lg font-semibold disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    Reset Game
                </button>
            </div>

            <ChatInterface
                gameState={gameState}
                gameText={gameText}
                userResponse={userResponse}
                setUserResponse={setUserResponse}
                timeRemaining={timeRemaining}
                handleUserResponse={handleUserResponse}
                conversationHistory={conversationHistory}
            />
        </div>
    );
}

export default App;
