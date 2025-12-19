import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Difficulty, type BoardState, type Player, type Scores } from './types';
import { WINNING_COMBINATIONS } from './constants';
import { getHardAIMove, getMediumAIMove, getAICommentary, getTrainedAIMove } from './services/geminiService';
import { Icon } from './components/Icon';

const useLocalStorage = <T,>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] => {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.log(error);
      return initialValue;
    }
  });

  const setValue = (value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      window.localStorage.setItem(key, JSON.stringify(valueToStore));
    } catch (error) {
      console.log(error);
    }
  };
  return [storedValue, setValue];
};

const Cell: React.FC<{ value: Player | null; onClick: () => void; isWinning: boolean }> = ({ value, onClick, isWinning }) => {
    const iconColor = value === 'X' ? 'text-blue-500' : 'text-red-500';
    const highlightClass = isWinning ? 'bg-yellow-400/50 dark:bg-yellow-500/50 scale-110' : 'bg-slate-200 dark:bg-gray-800 hover:bg-slate-300 dark:hover:bg-gray-700';
  
    return (
      <button
        onClick={onClick}
        className={`w-24 h-24 sm:w-32 sm:h-32 rounded-lg flex items-center justify-center transition-all duration-300 ${highlightClass}`}
      >
        {value && <Icon name={value === 'X' ? 'x' : 'o'} className={`w-16 h-16 sm:w-20 sm:h-20 ${iconColor}`} />}
      </button>
    );
};

const App: React.FC = () => {
    const [board, setBoard] = useState<BoardState>(Array(9).fill(null));
    const [isPlayerTurn, setIsPlayerTurn] = useState(true);
    const [winnerInfo, setWinnerInfo] = useState<{ winner: Player; line: number[] } | null>(null);
    const [isDraw, setIsDraw] = useState(false);
    const [difficulty, setDifficulty] = useLocalStorage<Difficulty>('tictactoe-difficulty', Difficulty.Medium);
    const [scores, setScores] = useLocalStorage<Scores>('tictactoe-scores', { player: 0, ai: 0, draws: 0 });
    const [gamesPlayed, setGamesPlayed] = useLocalStorage('tictactoe-games-played', 0);
    const [isDifficultyModalOpen, setIsDifficultyModalOpen] = useState(false);
    const [aiCommentary, setAiCommentary] = useState('');
    const [isAiThinking, setIsAiThinking] = useState(false);
    const [moveHistory, setMoveHistory] = useState<number[]>([]);
    const [isDarkMode, setIsDarkMode] = useLocalStorage('tictactoe-dark-mode', false);
    
    useEffect(() => {
        if (isDarkMode) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [isDarkMode]);

    const checkGameStatus = useCallback((currentBoard: BoardState) => {
        for (const combination of WINNING_COMBINATIONS) {
          const [a, b, c] = combination;
          if (currentBoard[a] && currentBoard[a] === currentBoard[b] && currentBoard[a] === currentBoard[c]) {
            setWinnerInfo({ winner: currentBoard[a] as Player, line: combination });
            setScores(s => ({ ...s, [currentBoard[a] === 'X' ? 'player' : 'ai']: s[currentBoard[a] === 'X' ? 'player' : 'ai'] + 1 }));
            setAiCommentary(currentBoard[a] === 'X' ? 'You got lucky...' : 'Victory is mine!');
            return;
          }
        }
    
        if (currentBoard.every(cell => cell !== null)) {
          setIsDraw(true);
          setScores(s => ({...s, draws: s.draws + 1}));
          setAiCommentary("A worthy opponent. It's a draw!");
        }
    }, [setScores]);
    
    const restartGame = useCallback(() => {
        setBoard(Array(9).fill(null));
        setIsPlayerTurn(true);
        setWinnerInfo(null);
        setIsDraw(false);
        setGamesPlayed(g => g + 1);
        setAiCommentary('');
        setIsAiThinking(false);
        setMoveHistory([]);
    }, [setGamesPlayed]);

    const handleCellClick = (index: number) => {
        if (board[index] || winnerInfo || isDraw || !isPlayerTurn) {
            return;
        }

        const newBoard = [...board];
        newBoard[index] = 'X';
        setBoard(newBoard);
        setMoveHistory(hist => [...hist, index]);
        setIsPlayerTurn(false);
        checkGameStatus(newBoard);
    };

    const aiMove = useCallback(async (currentBoard: BoardState, currentMoveHistory: number[]) => {
      setIsAiThinking(true);
      setAiCommentary('Hmm, let me think...');
  
      let move: number;
      const availableCells = currentBoard.map((cell, index) => cell === null ? index : null).filter(i => i !== null) as number[];
      
      if (availableCells.length === 0) {
        setIsAiThinking(false);
        return;
      };
      
      await new Promise(resolve => setTimeout(resolve, 750)); // Simulate thinking

      switch (difficulty) {
          case Difficulty.Easy:
              move = availableCells[Math.floor(Math.random() * availableCells.length)];
              break;
          case Difficulty.Medium:
              move = getMediumAIMove(currentBoard);
              break;
          case Difficulty.Hard:
              move = await getHardAIMove(currentBoard, currentMoveHistory);
              break;
          case Difficulty.Trained:
              move = await getTrainedAIMove(currentBoard, currentMoveHistory);
              break;
      }

      if (currentBoard[move] === null) {
          const newBoard = [...currentBoard];
          newBoard[move] = 'O';
          
          if(difficulty === Difficulty.Hard || difficulty === Difficulty.Trained) {
            const commentary = await getAICommentary(newBoard, move);
            setAiCommentary(commentary);
          } else {
            setAiCommentary('');
          }
          
          setBoard(newBoard);
          setMoveHistory(hist => [...hist, move]);
          checkGameStatus(newBoard);
          setIsPlayerTurn(true);
      }
      setIsAiThinking(false);
    }, [difficulty, checkGameStatus]);

    useEffect(() => {
        if (!isPlayerTurn && !winnerInfo && !isDraw) {
            aiMove(board, moveHistory);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPlayerTurn, winnerInfo, isDraw, board]);

    const statusText = useMemo(() => {
        if (winnerInfo) return `${winnerInfo.winner === 'X' ? 'You Won!' : 'AI Won!'}`;
        if (isDraw) return "It's a Draw!";
        if (isAiThinking) return "AI is Thinking...";
        return isPlayerTurn ? 'Your Turn' : 'AI Turn';
    }, [winnerInfo, isDraw, isPlayerTurn, isAiThinking]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-4 font-sans text-slate-800 dark:text-slate-200">
            <header className="absolute top-4 right-4">
                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-full bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600 transition-colors">
                    <Icon name={isDarkMode ? 'sun' : 'moon'} className="w-6 h-6" />
                </button>
            </header>
            
            <main className="flex flex-col items-center animate-slide-in">
                <h1 className="text-4xl sm:text-5xl font-bold mb-2">AI Tic-Tac-Toe</h1>
                <p className="text-slate-600 dark:text-slate-400 mb-6">Difficulty: <span className={`font-semibold ${difficulty === Difficulty.Trained ? 'text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500' : 'text-indigo-500 dark:text-indigo-400'}`}>{difficulty}</span></p>

                <div className="flex space-x-4 mb-4 p-2 bg-slate-200 dark:bg-gray-800 rounded-lg shadow-md">
                    <div className="text-center">
                        <div className="text-sm text-slate-500 dark:text-slate-400">Wins</div>
                        <div className="text-2xl font-bold text-blue-500">{scores.player}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-sm text-slate-500 dark:text-slate-400">Draws</div>
                        <div className="text-2xl font-bold">{scores.draws}</div>
                    </div>
                    <div className="text-center">
                        <div className="text-sm text-slate-500 dark:text-slate-400">AI Wins</div>
                        <div className="text-2xl font-bold text-red-500">{scores.ai}</div>
                    </div>
                     <div className="text-center">
                        <div className="text-sm text-slate-500 dark:text-slate-400">Played</div>
                        <div className="text-2xl font-bold">{gamesPlayed}</div>
                    </div>
                </div>

                <div className="relative mb-4 h-10 flex items-center justify-center">
                    <p className="text-2xl font-semibold transition-opacity duration-300">{statusText}</p>
                </div>
                
                <div className="grid grid-cols-3 gap-3 shadow-lg p-3 bg-slate-100 dark:bg-gray-900 rounded-xl">
                    {board.map((cell, index) => (
                        <Cell
                            key={index}
                            value={cell}
                            onClick={() => handleCellClick(index)}
                            isWinning={winnerInfo?.line.includes(index) ?? false}
                        />
                    ))}
                </div>

                {aiCommentary && (
                    <div className="mt-6 p-3 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-lg shadow-sm animate-pop-in text-center italic">
                        "{aiCommentary}"
                    </div>
                )}
                
                <div className="mt-8 flex space-x-4">
                    <button onClick={restartGame} className="flex items-center gap-2 px-6 py-3 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-600 transition-transform transform hover:scale-105">
                        <Icon name="refresh" className="w-5 h-5" /> Restart Game
                    </button>
                    <button onClick={() => setIsDifficultyModalOpen(true)} className="flex items-center gap-2 px-6 py-3 bg-gray-500 text-white font-semibold rounded-lg shadow-md hover:bg-gray-600 transition-transform transform hover:scale-105">
                        <Icon name="settings" className="w-5 h-5" /> Change Difficulty
                    </button>
                </div>
            </main>

            {isDifficultyModalOpen && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 animate-pop-in" onClick={() => setIsDifficultyModalOpen(false)}>
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-8 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                        <h2 className="text-2xl font-bold mb-6 text-center">Select Difficulty</h2>
                        <div className="flex flex-col space-y-4">
                            {(Object.values(Difficulty)).map(level => {
                                const isSelected = difficulty === level;
                                const isTrained = level === Difficulty.Trained;
                                let buttonClass = 'px-4 py-3 rounded-lg font-semibold transition-all duration-200 text-left ';
                                if (isSelected) {
                                    buttonClass += isTrained 
                                        ? 'text-white scale-105 shadow-lg bg-gradient-to-r from-purple-500 to-indigo-600'
                                        : 'bg-indigo-500 text-white scale-105 shadow-lg';
                                } else {
                                    buttonClass += 'bg-slate-200 dark:bg-gray-700 hover:bg-slate-300 dark:hover:bg-gray-600';
                                }

                                return (
                                    <button
                                        key={level}
                                        onClick={() => {
                                            setDifficulty(level);
                                            setIsDifficultyModalOpen(false);
                                            restartGame();
                                        }}
                                        className={buttonClass}
                                    >
                                        {level} {isTrained && '✨'}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;
