import React, { useState, useEffect, useRef } from 'react';

const ChatBox = ({ onSubmit, gameText, userResponse, setUserResponse, timeRemaining, disabled }) => {
  const [messages, setMessages] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (gameText) {
      setMessages(prev => [...prev, { text: gameText, type: 'ai' }]);
    }
  }, [gameText]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (userResponse.trim()) {
      setMessages(prev => [...prev, { text: userResponse, type: 'user' }]);
      await onSubmit(e);
    }
  };

  // Only show last 4 messages
  const visibleMessages = messages.slice(-4);

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="bg-gray-900 rounded-t-lg p-4">
        <div className="h-48 overflow-hidden relative">
          <div className="absolute bottom-0 left-0 right-0 space-y-2">
            {visibleMessages.map((message, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg max-w-[80%] ${
                  message.type === 'user'
                    ? 'bg-purple-600 text-white ml-auto'
                    : 'bg-gray-700 text-white'
                }`}
              >
                {message.text}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-b-lg p-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <textarea
              value={userResponse}
              onChange={(e) => setUserResponse(e.target.value)}
              className="w-full p-4 bg-gray-700 text-white rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
              placeholder="Type your response here..."
              rows="3"
              disabled={disabled}
            />
            {timeRemaining !== undefined && (
              <div className="absolute top-2 right-2 bg-gray-600 text-white px-2 py-1 rounded-full text-sm">
                {timeRemaining}s
              </div>
            )}
          </div>
          <button
            type="submit"
            disabled={disabled || userResponse.trim() === ''}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg text-lg font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
          >
            Send Response
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatBox;