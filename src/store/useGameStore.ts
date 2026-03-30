import { create } from 'zustand';

interface GameState {
  playerScore: number;
  opponentScore: number;
  speedPercent: number;
  gameRunning: boolean;
  gameOverMsg: string | null;
  isWin: boolean | null;
  mousePosition: { x: number; y: number };
  
  setScore: (playerScore: number, opponentScore: number) => void;
  setSpeed: (speedPercent: number) => void;
  setGameOver: (msg: string | null, isWin: boolean | null) => void;
  startGame: () => void;
  setMousePos: (x: number, y: number) => void;
}

export const useGameStore = create<GameState>((set) => ({
  playerScore: 0,
  opponentScore: 0,
  speedPercent: 0,
  gameRunning: false,
  gameOverMsg: null,
  isWin: null,
  mousePosition: { x: window.innerWidth / 2, y: window.innerHeight / 2 },

  setScore: (playerScore, opponentScore) => set({ playerScore, opponentScore }),
  setSpeed: (speedPercent) => set({ speedPercent }),
  setGameOver: (gameOverMsg, isWin) => set({ gameOverMsg, isWin, gameRunning: false }),
  startGame: () => set({ 
    gameRunning: true, 
    playerScore: 0, 
    opponentScore: 0, 
    gameOverMsg: null, 
    isWin: null 
  }),
  setMousePos: (x, y) => set({ mousePosition: { x, y } }),
}));
