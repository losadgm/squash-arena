import React from 'react';
import { useGameStore } from '../store/useGameStore';

export const HUD: React.FC = () => {
  const playerScore = useGameStore(state => state.playerScore);
  const opponentScore = useGameStore(state => state.opponentScore);
  const speedPercent = useGameStore(state => state.speedPercent);
  const gameRunning = useGameStore(state => state.gameRunning);
  const mousePosition = useGameStore(state => state.mousePosition);

  return (
    <>
      <div id="hud">
        <div className="scoreboard glass-panel">
          <div className="score-section">
            <span className="score-label">You</span>
            <span className="score-value score-player" id="player-score">{playerScore}</span>
          </div>
          <div className="score-divider"></div>
          <div className="score-section">
            <span className="score-label">Opponent</span>
            <span className="score-value score-opponent" id="opponent-score">{opponentScore}</span>
          </div>
        </div>
      </div>

      <div id="speed-indicator" className={`glass-panel ${gameRunning ? 'visible' : ''}`}>
        <span className="label">Ball Speed</span>
        <div id="speed-bar-bg">
          <div id="speed-bar" style={{ width: `${Math.max(5, speedPercent)}%` }}></div>
        </div>
      </div>

      <div 
        id="crosshair" 
        className={gameRunning ? 'visible' : ''}
        style={{ left: `${mousePosition.x}px`, top: `${mousePosition.y}px` }}
      ></div>
    </>
  );
};
