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
    // Get unique rounds and sort them in descending order (newest first)
    const rounds = [...new Set(conversationHistory.map(conv => conv.round))]
        .sort((a, b) => b - a);

    return (
        <div className="flex flex-col gap-4 w-3/5 mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6">
                {gameState.waitingForUserResponse && (
                    <div className="mb-4">
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
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                        <h2 className="font-bold mb-2 text-purple-800">Current Text:</h2>
                        <p className="text-lg overflow-wrap-anywhere">{gameText}</p>
                    </div>
                )}
            </div>

            {conversationHistory.length > 0 && (
                <div className="bg-white rounded-lg shadow-lg p-6 h-96 overflow-y-auto">
                    <h2 className="text-2xl font-bold mb-6 text-purple-800">Conversation History</h2>
                    {rounds.map(roundNumber => {
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
                                    <p className="ml-4 text-gray-800 overflow-wrap-anywhere">{question}</p>
                                </div>
                                <div className="space-y-4">
                                    {roundConversations.map((conv, index) => (
                                        <div
                                            key={`${roundNumber}-${index}`}
                                            className="p-4 border rounded-lg hover:shadow-md transition-shadow ml-4"
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="font-semibold text-purple-600 max-w-[80%] overflow-wrap-anywhere">
                                                    {conv.contestant === 3 ? 'You' : `AI Contestant ${conv.contestant}`}
                                                </span>
                                                {conv.rating !== undefined && (
                                                    <span className="text-green-600 font-medium shrink-0">
                                                        Rating: {conv.rating.toFixed(1)}/10
                                                    </span>
                                                )}
                                            </div>
                                            <div>
                                                <span className="text-gray-600 font-medium">Response:</span>
                                                <p className="ml-4 text-gray-800 overflow-wrap-anywhere">
                                                    {conv.response}
                                                </p>
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
};
