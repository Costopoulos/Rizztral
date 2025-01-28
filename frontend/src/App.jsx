import React, {useState, useEffect} from 'react';
import {io} from 'socket.io-client';
import Participants from './component/Participants.tsx';
import YourRank from './component/YourRank.tsx';
import { participantData } from './component/participantData';
import './component/SpeechBubble.css';

const DEBUG_MODE = true;
const socket = io('http://localhost:3000');

const REACT_APP_ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const GAME_SERVER_URL = 'http://localhost:8000';

const DEBUG_DATA = {
  gameText: "This is a test speech bubble! Click the toggle button to change speakers.",
  currentContestant: -1, // -1 for host, 0 for target, 1-3 for participants
};

// Voice IDs for different roles
const VOICE_IDS = {
  host: 'Ybqj6CIlqb6M85s9Bl4n', // Josh - deep male voice
  contestant: 'TC0Zp7WVFzhA8zpTlRqV' // Rachel - default voice
};

function App() {
  const [gameState, setGameState] = useState(DEBUG_MODE ? {
    round: 1,
    currentContestant: DEBUG_DATA.currentContestant,
    isPlaying: true,
    isGameStarted: true,
    isGameEnded: false
  } : {
    round: 1,
    currentContestant: 1, 
    isPlaying: false,
    isGameStarted: false,
    isGameEnded: false
  });
  const [gameText, setGameText] = useState('');
  const [error, setError] = useState('');
  const [userList, setUserList] = useState([]);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [inputText, setInputText] = useState('');

  // Add a function to handle sending messages
  const handleSendMessage = () => {
    if (inputText.trim()) {
      // In debug mode, just update the game text
      if (DEBUG_MODE) {
        setGameText(inputText);
        setInputText('');
      }
      // In normal mode, you'd integrate this with your backend
    }
  };

  useEffect(() => {
    if (DEBUG_MODE) {
      setGameText(DEBUG_DATA.gameText);
    }
  }, []);

  const toggleSpeaker = (speaker) => {
    setGameState(prev => ({
      ...prev,
      currentContestant: speaker
    }));
  };

return (
  <div className="app">
    <div className="top-container" style={{ display: 'flex', justifyContent: 'center' }}>
    {/* Title Section */}
    <div className="title-section">
      <img src="/img/rizztral.png" alt="Rizztral 2.0" style={{ width: '300px', height: 'auto' }} />
    </div>
  </div>

    <div className="bottom-container">
      {/* Main Content Area */}
      <div className="main-content">
        {/* Left Column - Game Area */}
        <div className="game-area">
          <Participants currentSpeaker={gameState.currentContestant} />
        </div>

        {/* Right Column - Chat */}
        <div className="chat-area">
          <div className="chat-messages">
            {gameText && (
              <div className="speech-bubble">
                <p>{gameText}</p>
              </div>
            )}
          </div>
          <div className="chat-input-container">
            <input
              type="text"
              className="chat-input"
              placeholder="Type your message..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSendMessage();
                }
              }}
            />
            <button 
              className="chat-send-button"
              onClick={handleSendMessage}
            >
              Send
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="bottom-controls">
        <div className="game-info">
          <div>Round: {gameState.round} / 3</div>
          <div>
            Current Speaker: {
              gameState.currentContestant === -1 ? participantData.host.name : 
              gameState.currentContestant === 0 ? participantData.target.name : 
              participantData.participants[gameState.currentContestant - 1].name
            }
          </div>
          <div>Status: {gameState.isPlaying ? 'Speaking' : 'Waiting'}</div>
        </div>

        <div className="game-controls">
          {DEBUG_MODE && (
          <div className="debug-controls">
            <button
              onClick={() => toggleSpeaker(-1)}
              className="toggle-speaker-button"
            >
              Host
            </button>
            <button
              onClick={() => toggleSpeaker(0)}
              className="toggle-speaker-button"
            >
              Target
            </button>
            {participantData.participants.map((_, index) => (
              <button
                key={index}
                onClick={() => toggleSpeaker(index + 1)}
                className="toggle-speaker-button"
              >
                Participant {index + 1}
              </button>
            ))}
          </div>
        )}
        </div>
      </div>

      {/* Conversation History */}
      {conversationHistory.length > 0 && (
        <div className="conversation-history">
          <h2>Conversation History</h2>
          {conversationHistory.map((conv, index) => (
            <div key={index} className="conversation-item">
              <div>Round {conv.round} - Contestant {conv.contestant}</div>
              <div>
                <span>AI Question:</span>
                <p>{conv.question}</p>
              </div>
              <div>
                <span>Contestant Response:</span>
                <p>{conv.response}</p>
              </div>
              {conv.rating !== undefined && (
                <div>
                  Rating: {conv.rating}/10
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
);
  
}

export default App;