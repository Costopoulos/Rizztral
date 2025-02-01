import React from 'react';
import './ChatInterface.css';

export const ChatInterface = ({
                                  gameState,
                                  gameText,
                                  userResponse,
                                  setUserResponse,
                                  timeRemaining,
                                  handleUserResponse,
                                  conversationHistory
                              }) => {
    const rounds = [...new Set(conversationHistory.map(conv => conv.round))]
        .sort((a, b) => b - a);

    return (
        <>
            {(gameState.waitingForUserResponse || gameText || conversationHistory.length > 0) && (
                <div className="chat-container">
                    <div className="chat-box">
                        {gameState.waitingForUserResponse && (
                            <div>
                                <div className="timer-text">
                                    Your Turn! Time remaining: {timeRemaining}s
                                </div>
                                <form
                                    onSubmit={async (e) => {
                                        e.preventDefault();
                                        await handleUserResponse(false);
                                    }}
                                    className="response-form"
                                >
                                    <textarea
                                        value={userResponse}
                                        onChange={(e) => setUserResponse(e.target.value)}
                                        className="response-textarea"
                                        placeholder="Type your response here..."
                                    />
                                    <button
                                        type="submit"
                                        disabled={userResponse.trim() === ''}
                                        className="submit-button"
                                    >
                                        Submit Response
                                    </button>
                                </form>
                            </div>
                        )}

                        {gameText && (
                            <div className="game-text-container">
                                <p className="game-text">{gameText}</p>
                                {gameState.winner && gameState.stage === 'winner_announcement' && (
                                    <div className="winner-announcement bg-green-100 p-6 rounded-lg shadow-lg mt-4">
                                        <h2 className="text-2xl font-bold text-green-800 mb-2 game-text-title">
                                            Winner Announcement!
                                        </h2>
                                        <p className="text-lg text-green-700">
                                            {gameState.winner === 'contestant3' ? 'Congratulations! You won!' :
                                                `AI Contestant ${gameState.winner.slice(-1)} won!`}
                                        </p>
                                        <button
                                            onClick={() => window.location.reload()}
                                            className="mt-4 bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg transition-colors"
                                        >
                                            Play Again
                                        </button>
                                        <a
                                            href="https://rizztral-leaderboard.onrender.com/"
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="mt-4 bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors inline-flex items-center"
                                        >
                                            View Leaderboard
                                        </a>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>

                    {conversationHistory.length > 0 && (
                        <div className="history-container">
                            <h2 className="history-title">Conversation History</h2>
                            {rounds.map(roundNumber => {
                                const roundConversations = conversationHistory.filter(
                                    conv => conv.round === roundNumber
                                );
                                if (roundConversations.length === 0) return null;
                                const question = roundConversations[0]?.question;

                                return (
                                    <div key={roundNumber} className="round-container">
                                        <h3 className="round-title">
                                            Round {roundNumber}
                                        </h3>
                                        <div>
                                            <div className="message-bubble bot-message">
                                                <div className="chat-avatar-container">
                                                    <img
                                                        src="/img/target.jpg"
                                                        className="user-img"
                                                        alt="Host"
                                                    />
                                                </div>
                                                <div className="text-content">
                                                    <p>
                                                        <strong>Question:</strong> {question}
                                                    </p>
                                                </div>
                                            </div>

                                            {roundConversations.map((conv, index) => {
                                                const isUser = conv.contestant === 3;
                                                const avatarMap = {
                                                    1: '/img/jacques.jpg',
                                                    2: '/img/brad.jpg',
                                                    3: '/img/chad.jpg'
                                                };

                                                return (
                                                    <div
                                                        key={`${roundNumber}-${index}`}
                                                        className={isUser ? 'message-container-user' : 'message-container-bot'}
                                                    >
                                                        <div
                                                            className={`message-bubble ${isUser ? 'user-message' : 'bot-message'}`}>
                                                            {!isUser && (
                                                                <div className="chat-avatar-container">
                                                                    <img
                                                                        src={avatarMap[conv.contestant]}
                                                                        className="user-img"
                                                                        alt={`Contestant ${conv.contestant}`}
                                                                    />
                                                                </div>
                                                            )}
                                                            <div className="text-content">
                                                                <p>
                                                                    {conv.response}
                                                                    <span className="rating-text">
                                                                        Rating: {conv.rating.toFixed(1)}/10
                                                                    </span>
                                                                </p>
                                                            </div>
                                                            {isUser && (
                                                                <div className="chat-avatar-container">
                                                                    <img
                                                                        src={avatarMap[3]}
                                                                        className="user-img"
                                                                        alt="You"
                                                                    />
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </>
    );
};