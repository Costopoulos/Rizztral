import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

const REACT_APP_ELEVENLABS_API_KEY=import.meta.env.VITE_ELEVENLABS_API_KEY;
const GAME_SERVER_URL = 'http://localhost:8000';

function App() {
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [userList, setUserList] = useState([]);
  const [error, setError] = useState('');
  const [gameText, setGameText] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    socket.on('connect', () => {
      setIsConnected(true);
      setError('');
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('userList', (users) => {
      setUserList(users);
    });

    socket.on('error', (message) => {
      setError(message);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('userList');
      socket.off('error');
    };
  }, []);

  const textToSpeech = async (text) => {
    try {
      const response = await fetch('https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM', {
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

      setIsPlaying(true);
      audio.play();

      audio.onended = () => {
        setIsPlaying(false);
        URL.revokeObjectURL(audioUrl);
      };
    } catch (error) {
      console.error('Error converting text to speech:', error);
      setError('Failed to play audio');
    }
  };

  const handleHostIntroduction = async () => {
    try {
      const response = await fetch(`${GAME_SERVER_URL}/host-introduction`);
      const data = await response.json();
      setGameText(data.text);
      await textToSpeech(data.text);
    } catch (error) {
      console.error('Error fetching host introduction:', error);
      setError('Failed to fetch host introduction');
    }
  };

  const handleAIIntroduction = async () => {
    try {
      const response = await fetch(`${GAME_SERVER_URL}/ai-introduction`);
      const data = await response.json();
      setGameText(data.text);
      await textToSpeech(data.text);
    } catch (error) {
      console.error('Error fetching AI introduction:', error);
      setError('Failed to fetch AI introduction');
    }
  };

  const handleJoin = (e) => {
    e.preventDefault();
    if (username.trim()) {
      socket.emit('register', username);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">AI Voice Game</h1>
      
      <div className="mb-4">
        Connection status: {isConnected ? 'Connected' : 'Disconnected'}
      </div>

      {error && (
        <div className="text-red-500 mb-4">
          Error: {error}
        </div>
      )}

      <form onSubmit={handleJoin} className="mb-4">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Enter your username"
          className="border p-2 mr-2"
        />
        <button 
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded"
        >
          Join Game
        </button>
      </form>

      <div className="mb-4">
        <button
          onClick={handleHostIntroduction}
          disabled={isPlaying}
          className="bg-green-500 text-white px-4 py-2 rounded mr-2"
        >
          Play Host Introduction
        </button>
        <button
          onClick={handleAIIntroduction}
          disabled={isPlaying}
          className="bg-purple-500 text-white px-4 py-2 rounded"
        >
          Play AI Introduction
        </button>
      </div>

      {gameText && (
        <div className="mb-4 p-4 bg-gray-100 rounded">
          <h2 className="font-bold mb-2">Current Text:</h2>
          <p>{gameText}</p>
        </div>
      )}

      <div>
        <h2 className="text-xl font-bold mb-2">Connected Users:</h2>
        <ul>
          {userList.map((user, index) => (
            <li key={index} className="mb-1">{user}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
