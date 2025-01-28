import React, {useState, useEffect, useRef} from 'react';
import {io} from 'socket.io-client';

const socket = io('http://localhost:3000');

const REACT_APP_ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const GAME_SERVER_URL = 'http://localhost:8000';

// Voice IDs for different roles
const VOICE_IDS = {
  host: 'Ybqj6CIlqb6M85s9Bl4n', // Josh - deep male voice
  contestant: 'TC0Zp7WVFzhA8zpTlRqV' // Rachel - default voice
};

function App() {
  const [gameState, setGameState] = useState({
    round: 1,
    currentContestant: 1,
    isPlaying: false,
    isGameStarted: false,
    isGameEnded: false,
    waitingForUserResponse: false
  });
  const [gameText, setGameText] = useState('');
  const [error, setError] = useState('');
  const [userList, setUserList] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [userResponse, setUserResponse] = useState('');
  const [timeRemaining, setTimeRemaining] = useState(20);
  const timerRef = useRef(null);

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

      if (!response.ok) throw new Error('Failed to convert text to speech');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      setGameState(prev => ({ ...prev, isPlaying: true }));
      audio.play();

      return new Promise((resolve) => {
        audio.onended = () => {
          setGameState(prev => ({ ...prev, isPlaying: false }));
          URL.revokeObjectURL(audioUrl);
          resolve();
        };
      });
    } catch (error) {
      console.error('Error converting text to speech:', error);
      setError('Failed to play audio');
      setGameState(prev => ({ ...prev, isPlaying: false }));
    }
  };

  const fetchAndSpeak = async (endpoint) => {
    try {
      const response = await fetch(`${GAME_SERVER_URL}${endpoint}`);
      const data = await response.json();
      setGameText(data.text);

      // Use host voice for host-related endpoints
      const isHostVoice = endpoint.includes('host-') || endpoint.includes('announce-winner');
      await textToSpeech(data.text, isHostVoice ? 'host' : 'contestant');

      return data;
    } catch (error) {
      console.error(`Error fetching from ${endpoint}:`, error);
      setError(`Failed to fetch from ${endpoint}`);
    }
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
      setError("Time's up! No response submitted.");
    }
    await submitUserResponse();
  };

  const submitUserResponse = async () => {
    try {
      const response = await fetch(`${GAME_SERVER_URL}/submit-answer/contestant${gameState.currentContestant}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          response: userResponse
        })
      });

      if (!response.ok) throw new Error('Failed to submit response');

      clearInterval(timerRef.current);
      setGameState(prev => ({ ...prev, waitingForUserResponse: false }));
      setUserResponse('');

      // Continue with rating
      const ratingResponse = await fetch(`${GAME_SERVER_URL}/rate-contestant/contestant${gameState.currentContestant}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversation: userResponse
        })
      });
      const ratingData = await ratingResponse.json();

      setConversationHistory(prev => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1].response = userResponse;
        newHistory[newHistory.length - 1].rating = ratingData.rating;
        return newHistory;
      });

    } catch (error) {
      console.error('Error submitting response:', error);
      setError('Failed to submit response');
    }
  };

  const getAIContestantResponse = async () => {
    try {
      const response = await fetch(`${GAME_SERVER_URL}/get-ai-response`);
      const data = await response.json();

      setConversationHistory(prev => [...prev, {
        round: gameState.round,
        contestant: gameState.currentContestant,
        question: gameText,
        response: data.response
      }]);

      // Rate the AI response
      const ratingResponse = await fetch(`${GAME_SERVER_URL}/rate-contestant/contestant${gameState.currentContestant}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          conversation: data.response
        })
      });
      const ratingData = await ratingResponse.json();

      setConversationHistory(prev => {
        const newHistory = [...prev];
        newHistory[newHistory.length - 1].rating = ratingData.rating;
        return newHistory;
      });

    } catch (error) {
      console.error('Error getting AI response:', error);
      setError('Failed to get AI contestant response');
    }
  };

  const runGameLoop = async () => {
    try {
      // Reset game state
      await fetch(`${GAME_SERVER_URL}/reset-game`);
      setGameState(prev => ({
        ...prev,
        round: 1,
        currentContestant: 1,
        isGameStarted: true,
        isGameEnded: false
      }));

      // Initial introductions
      await fetchAndSpeak('/host-introduction');

      // Main game loop
      for (let round = 1; round <= 3; round++) {
        setGameState(prev => ({ ...prev, round }));

        // AI asks question
        await fetchAndSpeak('/ai-question');

        // Loop through contestants
        for (let contestant = 1; contestant <= 2; contestant++) {
          setGameState(prev => ({
            ...prev,
            currentContestant: contestant,
            waitingForUserResponse: contestant === 1
          }));

          if (contestant === 1) {
            // Real user's turn
            startResponseTimer();
            // Wait for submitUserResponse to be called
            await new Promise(resolve => {
              const checkInterval = setInterval(() => {
                if (!gameState.waitingForUserResponse) {
                  clearInterval(checkInterval);
                  resolve();
                }
              }, 100);
            });
          } else {
            // AI contestant's turn
            await getAIContestantResponse();
          }

          await delay(2000); // 2-second pause

          // Host interrupt if not last contestant
          if (contestant < 2) {
            await fetchAndSpeak('/host-interrupt/next_contestant');
          }
        }

        // Move to next round if not last round
        if (round < 3) {
          await fetch(`${GAME_SERVER_URL}/next-round`);
        }
      }

      // Announce winner
      await fetchAndSpeak('/announce-winner');
      setGameState(prev => ({ ...prev, isGameEnded: true }));

    } catch (error) {
      console.error('Error in game loop:', error);
      setError('Game loop failed');
    }
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">AI Dating Game Show</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-6">
        <div className="text-lg mb-2">Round: {gameState.round} / 3</div>
        <div className="text-lg mb-2">Current Contestant: {gameState.currentContestant} / 2</div>
        <div className="text-lg mb-4">Status: {gameState.isPlaying ? 'Speaking' : 'Waiting'}</div>
      </div>

      <div className="mb-6">
        <button
          onClick={runGameLoop}
          disabled={gameState.isPlaying || gameState.isGameStarted}
          className="bg-green-500 text-white px-6 py-3 rounded-lg text-lg font-semibold mr-4 disabled:bg-gray-400"
        >
          Start Game
        </button>

        <button
          onClick={() => fetch(`${GAME_SERVER_URL}/reset-game`)}
          disabled={gameState.isPlaying || !gameState.isGameStarted}
          className="bg-red-500 text-white px-6 py-3 rounded-lg text-lg font-semibold disabled:bg-gray-400"
        >
          Reset Game
        </button>
      </div>

      {gameState.waitingForUserResponse && (
        <div className="mb-6">
          <div className="text-xl font-semibold mb-2">Your Turn! Time remaining: {timeRemaining}s</div>
          <form onSubmit={(e) => {
            e.preventDefault();
            submitUserResponse();
          }}>
            <textarea
              value={userResponse}
              onChange={(e) => setUserResponse(e.target.value)}
              className="w-full p-4 border rounded-lg mb-4 h-32"
              placeholder="Type your response here..."
            />
            <button
              type="submit"
              className="bg-blue-500 text-white px-6 py-3 rounded-lg text-lg font-semibold"
              disabled={userResponse.trim() === ''}
            >
              Submit Response
            </button>
          </form>
        </div>
      )}

      {gameText && (
        <div className="bg-gray-100 p-6 rounded-lg mb-6">
          <h2 className="font-bold mb-2">Current Text:</h2>
          <p className="text-lg">{gameText}</p>
        </div>
      )}

      {conversationHistory.length > 0 && (
        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Conversation History</h2>
          {conversationHistory.map((conv, index) => (
            <div key={index} className="mb-6 p-4 border rounded-lg">
              <div className="font-semibold mb-2">Round {conv.round} - Contestant {conv.contestant}</div>
              <div className="mb-2">
                <span className="font-medium text-purple-600">AI Question:</span>
                <p className="ml-4">{conv.question}</p>
              </div>
              <div className="mb-2">
                <span className="font-medium text-blue-600">Contestant Response:</span>
                <p className="ml-4">{conv.response}</p>
              </div>
              {conv.rating !== undefined && (
                <div className="text-green-600 font-medium">
                  Rating: {conv.rating}/10
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default App;
