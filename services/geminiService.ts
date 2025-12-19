
import { GoogleGenAI, Type } from "@google/genai";
import type { BoardState, Player } from '../types.ts';
import { winningGameSequences } from '../data/trainingData.ts';
import { WINNING_COMBINATIONS } from '../constants.ts';

// Safely access API_KEY from environment
const API_KEY = typeof process !== 'undefined' ? process.env.API_KEY : undefined;

const getBoardString = (board: BoardState): string => {
  let boardStr = '';
  for (let i = 0; i < 9; i += 3) {
    boardStr += board.slice(i, i + 3).map(cell => cell || ' ').join(' | ');
    if (i < 6) boardStr += '\n---------\n';
  }
  return boardStr;
};

const getAIInstance = () => {
  if (!API_KEY) {
    throw new Error("API_KEY environment variable not set. Please ensure it is configured in your hosting environment.");
  }
  return new GoogleGenAI({ apiKey: API_KEY });
};

export const getHardAIMove = async (board: BoardState, moveHistory: number[]): Promise<number> => {
  try {
    const ai = getAIInstance();
    const prompt = `
      You are an unbeatable Tic-Tac-Toe AI expert playing as 'O' against a human 'X'.
      Your goal is to win if possible, otherwise, force a draw. You must never lose.
      The current board state is (0-8 indices):
      ${getBoardString(board)}

      The move history (indices played) is: ${moveHistory.join(', ')}.
      It's your turn. Analyze the board and determine the absolute best move.
      Return your move as a JSON object with the cell index.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            move: {
              type: Type.INTEGER,
              description: 'The index of the cell to play (0-8).',
            },
            reasoning: {
              type: Type.STRING,
              description: 'A brief explanation for the chosen move.',
            },
          },
          required: ['move'],
        },
        temperature: 0.1,
      },
    });

    const jsonResponse = JSON.parse(response.text);
    const move = jsonResponse.move;

    if (typeof move === 'number' && move >= 0 && move <= 8 && board[move] === null) {
      return move;
    } else {
      console.warn("Gemini (Hard) suggested an invalid move, falling back to medium AI.", move);
      return getMediumAIMove(board);
    }
  } catch (error) {
    console.error("Error fetching move from Gemini API (Hard):", error);
    return getMediumAIMove(board);
  }
};


export const getTrainedAIMove = async (board: BoardState, moveHistory: number[]): Promise<number> => {
  try {
    const ai = getAIInstance();
    // Find relevant game examples from training data
    const relevantExamples = winningGameSequences
      .filter(seq => {
        // Find sequences where the current move history is a subset of the example
        return moveHistory.every((move, index) => move === seq.moves[index]);
      })
      .slice(0, 3) // Limit to a few examples to keep the prompt concise
      .map(seq => `Example of a winning sequence: ${seq.moves.join(' -> ')} resulted in a win for '${seq.winner}'.`)
      .join('\n');

    const prompt = `
      You are a world-class Tic-Tac-Toe AI ('O') playing a human ('X'). You have been trained on thousands of games.
      Your goal is to make the optimal move to secure a win or force a draw.

      Current board state (0-8 indices):
      ${getBoardString(board)}

      Move history: ${moveHistory.join(', ')}.

      Based on your training, here are some relevant winning patterns from similar game states:
      ${relevantExamples || "No direct examples, rely on your core strategy."}

      Analyze the current board, consider the winning patterns, and determine the single best move to make next.
      The move must be on an empty cell.
      
      Return your move as a JSON object.
    `;
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            move: {
              type: Type.INTEGER,
              description: 'The index of the optimal cell to play (0-8).',
            },
          },
          required: ['move'],
        },
        temperature: 0.0,
      },
    });
    
    const jsonResponse = JSON.parse(response.text);
    const move = jsonResponse.move;

    if (typeof move === 'number' && move >= 0 && move <= 8 && board[move] === null) {
      return move;
    } else {
      console.warn("Gemini (Trained) suggested an invalid move, falling back to Medium AI.", move);
      return getMediumAIMove(board);
    }
  } catch (error) {
    console.error("Error fetching move from Gemini API (Trained):", error);
    return getMediumAIMove(board);
  }
};


export const getAICommentary = async (board: BoardState, aiMove: number): Promise<string> => {
    try {
        const ai = getAIInstance();
        const prompt = `
        You are a witty and slightly taunting AI opponent in a game of Tic-Tac-Toe.
        The board is:
        ${getBoardString(board)}
        I (AI, 'O') just played at index ${aiMove}. The human is 'X'.
        Provide a short, fun, cheeky comment (max 10 words) about the game state from my perspective.
        Examples: "Nice try, human!", "My victory is inevitable.", "Are you even trying?", "A clever move... for a human."
        `;
        
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
            config: {
                temperature: 0.9,
                maxOutputTokens: 20,
            }
        });

        return response.text.replace(/"/g, ''); // Clean up quotes
    } catch (error) {
        console.error("Error fetching commentary from Gemini API:", error);
        return "Thinking...";
    }
};


const findWinningMove = (board: BoardState, player: Player): number | null => {
    for (let i = 0; i < 9; i++) {
        if (board[i] === null) {
            const tempBoard = [...board];
            tempBoard[i] = player;
            const winnerInfo = checkWinner(tempBoard);
            if (winnerInfo && winnerInfo.winner === player) {
                return i;
            }
        }
    }
    return null;
};

const checkWinner = (board: BoardState) => {
    for (const combination of WINNING_COMBINATIONS) {
      const [a, b, c] = combination;
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return { winner: board[a] as Player, line: combination };
      }
    }
    return null;
};

export const getMediumAIMove = (board: BoardState): number => {
    const winningMove = findWinningMove(board, 'O');
    if (winningMove !== null) return winningMove;

    const blockingMove = findWinningMove(board, 'X');
    if (blockingMove !== null) return blockingMove;

    const center = 4;
    if (board[center] === null) return center;

    const corners = [0, 2, 6, 8];
    const availableCorners = corners.filter(i => board[i] === null);
    if (availableCorners.length > 0) {
        return availableCorners[Math.floor(Math.random() * availableCorners.length)];
    }

    const sides = [1, 3, 5, 7];
    const availableSides = sides.filter(i => board[i] === null);
    if (availableSides.length > 0) {
        return availableSides[Math.floor(Math.random() * availableSides.length)];
    }
    
    const availableCells = board.map((cell, index) => cell === null ? index : null).filter(i => i !== null) as number[];
    return availableCells[0];
};