import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../game/GameEngine';
import { HUD } from './HUD';
import { Overlay } from './Overlay';
import { useGameStore } from '../store/useGameStore';

export const GameContainer: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const crosshairRef = useRef<HTMLDivElement>(null);

  const gameRunning = useGameStore(state => state.gameRunning);
  const startGame = useGameStore(state => state.startGame);

  useEffect(() => {
    if (!containerRef.current) return;

    const engine = new GameEngine(containerRef.current);
    engineRef.current = engine;

    const handleMouseMove = (e: MouseEvent) => {
      if (crosshairRef.current) {
        crosshairRef.current.style.left = `${e.clientX}px`;
        crosshairRef.current.style.top = `${e.clientY}px`;
      }
    };

    document.addEventListener('mousemove', handleMouseMove);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      engine.destroy();
      engineRef.current = null;
    };
  }, []);

  const handleStartClick = () => {
    if (!gameRunning && engineRef.current) {
      startGame();
      engineRef.current.startGame();
    }
  };

  return (
    <>
      <div
        ref={containerRef}
        style={{ width: '100vw', height: '100vh', position: 'absolute', top: 0, left: 0, zIndex: 0 }}
      />
      <HUD />
      <Overlay onStartClick={handleStartClick} />
      <div
        ref={crosshairRef}
        id="crosshair"
        className={gameRunning ? 'visible' : ''}
      />
    </>
  );
};
