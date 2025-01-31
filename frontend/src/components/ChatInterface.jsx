import React from 'react';

export const ChatInterface = ({
    gameState,
    gameText,
    userResponse,
    setUserResponse,
    timeRemaining,
    handleUserResponse,
    conversationHistory
}) => {
    return (
        <>
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

            {conversationHistory.length > 0 && (
                <div className="bg-white shadow-lg rounded-lg p-6 mb-8">
                    <h2 className="text-2xl font-bold mb-6 text-purple-800">Conversation History</h2>

                    {[...Array(gameState.maxRounds)].map((_, roundIndex) => {
                        const roundNumber = roundIndex + 1;
                        const roundConversations = conversationHistory.filter(
                            conv => conv.round === roundNumber
                        );

                        if (roundConversations.length === 0) return null;
                        const question = roundConversations[0]?.question;

                        return (
                            <div key={roundNumber} className="mb-8 last:mb-0">
                                <h3 className="text-xl font-semibold mb-4 text-purple-700">
                                    Round {roundNumber}
                                </h3>

                                <div className="p-4 border rounded-lg mb-4">
                                    <span className="text-gray-600 font-medium">Question:</span>
                                    <p className="ml-4 text-gray-800">{question}</p>
                                </div>

                                <div className="space-y-4">
                                    {roundConversations.map((conv, index) => (
                                        <div
                                            key={`${roundNumber}-${index}`}
                                            className="p-4 border rounded-lg hover:shadow-md transition-shadow ml-4"
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
        </>
    );
};