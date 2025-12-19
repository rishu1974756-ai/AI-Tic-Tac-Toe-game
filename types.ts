export type Player = 'X' | 'O';
export type BoardState = (Player | null)[];

export enum Difficulty {
  Easy = 'Easy',
  Medium = 'Medium',
  Hard = 'Hard',
  Trained = 'Trained',
}

export interface Scores {
  player: number;
  ai: number;
  draws: number;
}
