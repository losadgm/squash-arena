import React from 'react';
import { useGameStore } from '../store/useGameStore';

interface OverlayProps {
  onStartClick: () => void;
}

export const Overlay: React.FC<OverlayProps> = ({ onStartClick }) => {
  const gameRunning = useGameStore(state => state.gameRunning);
  const gameOverMsg = useGameStore(state => state.gameOverMsg);
  const isWin = useGameStore(state => state.isWin);

  return (
    <div id="overlay" className={gameRunning ? 'hidden' : ''}>
      <h1>3D PONG</h1>
      <div className="subtitle">SQUASH ARENA</div>

      {gameOverMsg && (
        <div
          id="game-over-msg"
          style={{ display: 'block', color: isWin ? '#00e5ff' : '#ff3d71' }}
        >
          {gameOverMsg}
        </div>
      )}

      <div className="prompt" onClick={onStartClick}>CLICK TO START</div>
    </div>
  );
};
