// A sample of winning game sequences for the 'Trained' AI.
// In a real-world scenario, this would be a much larger dataset.
export const winningGameSequences = [
  // Wins for 'O' (AI)
  { winner: 'O', moves: [0, 4, 1, 2, 3, 6] },
  { winner: 'O', moves: [8, 4, 2, 6, 5] },
  { winner: 'O', moves: [0, 1, 4, 2, 8] },
  { winner: 'O', moves: [2, 4, 5, 3, 8] },
  { winner: 'O', moves: [6, 4, 7, 1, 8] },
  { winner: 'O', moves: [0, 3, 4, 5, 8] },
  { winner: 'O', moves: [2, 5, 4, 3, 6] },
  
  // Wins for 'X' (Player) - AI should learn to block these
  { winner: 'X', moves: [4, 0, 1, 2, 7] },
  { winner: 'X', moves: [4, 2, 7, 6, 1] },
  { winner: 'X', moves: [0, 1, 2, 5, 4, 3, 8] },
  { winner: 'X', moves: [0, 4, 3, 5, 6] },
  { winner: 'X', moves: [2, 4, 1, 7, 0] },
  { winner: 'X', moves: [8, 4, 0, 2, 1, 6] },
  { winner: 'X', moves: [4, 8, 6, 7, 2] },

  // More 'O' wins
  { winner: 'O', moves: [4, 0, 6, 3, 2] },
  { winner: 'O', moves: [4, 8, 2, 5, 6] },
  { winner: 'O', moves: [1, 4, 0, 8, 2] },
  { winner: 'O', moves: [3, 4, 0, 8, 6] },
  { winner: 'O', moves: [0, 2, 1, 3, 4, 5, 6, 7, 8] }, // A full game
  { winner: 'O', moves: [8, 7, 6, 5, 4, 3, 2, 1, 0] }, // Another full game
];
