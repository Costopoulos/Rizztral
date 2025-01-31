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
                        <h2 className="game-text-title">Current Text:</h2>
                        <p className="game-text">{gameText}</p>
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
                                    <div className="question-bubble">
                                        <div className="chat-avatar-container">
                                            <img
                                                src="/img/target.jpg"
                                                className="user-img"
                                                alt="Host"
                                            />
                                        </div>
                                        <div className="text-content">
                                            <p><strong>Question:</strong> {question}</p>
                                        </div>
                                    </div>

                                    {roundConversations.map((conv, index) => {
                                        const isUser = conv.contestant === 3;
                                        const avatarMap = {
                                            1: '/img/chad.jpg',
                                            2: '/img/jacques.jpg',
                                            3: '/img/brad.jpg'
                                        };

                                        return (
                                            <div
                                                key={`${roundNumber}-${index}`}
                                                className={isUser ? 'message-container-user' : 'message-container-bot'}
                                            >
                                                <div className={`message-bubble ${isUser ? 'user-message' : 'bot-message'}`}>
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
    );
};