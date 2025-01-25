import React, { useState, useEffect } from 'react';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3000');

function App() {
  const [username, setUsername] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [userList, setUserList] = useState([]);
  const [error, setError] = useState('');

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
