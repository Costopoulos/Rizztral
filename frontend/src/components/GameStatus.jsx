import React from 'react';
import './GameStatus.css';

export const GameStatus = ({ gameState }) => {
    return (
        <div className="game-status-container">
            <div className="game-status-box">
                <div className="status-item">
                    <div className="status-text">Round: {gameState.round} / {gameState.maxRounds}</div>
                </div>
                <div className="status-item">
                    <div className="status-text">
                        {gameState.isGameEnded && 'Game Complete'}
                    </div>
                </div>
            </div>
        </div>
    );
};
