import { create } from 'zustand';

interface GameState {
  playerScore: number;
  opponentScore: number;
  speedPercent: number;
  gameRunning: boolean;
  gameOverMsg: string | null;
  isWin: boolean | null;

  setScore: (playerScore: number, opponentScore: number) => void;
  setSpeed: (speedPercent: number) => void;
  setGameOver: (msg: string | null, isWin: boolean | null) => void;
  startGame: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  playerScore: 0,
  opponentScore: 0,
  speedPercent: 0,
  gameRunning: false,
  gameOverMsg: null,
  isWin: null,

  setScore: (playerScore, opponentScore) => set({ playerScore, opponentScore }),
  setSpeed: (speedPercent) => set({ speedPercent }),
  setGameOver: (gameOverMsg, isWin) => set({ gameOverMsg, isWin, gameRunning: false }),
  startGame: () => set({
    gameRunning: true,
    playerScore: 0,
    opponentScore: 0,
    gameOverMsg: null,
    isWin: null,
  }),
}));
