import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/GameEngine';
import { HUD } from './HUD';
import { Overlay } from './Overlay';
import { useGameStore } from '../store/useGameStore';

export const GameContainer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const gameRunning = useGameStore(state => state.gameRunning);
  const setMousePos = useGameStore(state => state.setMousePos);
  const startGame = useGameStore(state => state.startGame);

  useEffect(() => {
    if (!containerRef.current) return;

    // We instantiate the engine here
    const engine = new GameEngine(containerRef.current);
    engineRef.current = engine;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos(e.clientX, e.clientY);
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      engine.destroy();
      engineRef.current = null;
    };
  }, [setMousePos]);

  const handleStartClick = () => {
    if (!gameRunning && engineRef.current) {
      startGame();
      engineRef.current.startGame();
    }
  };

  return (
    <>
      {/* Game view container */}
      <div 
        ref={containerRef} 
        style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 0 }} 
      />

      {/* React UI Overlays */}
      <HUD />
      <Overlay onStartClick={handleStartClick} />
    </>
  );
};
