import { useState, useCallback, useEffect } from 'react';
import ChessSquare from './ChessSquare';
import {
  GameState, Position, PieceColor, createInitialState, getLegalMoves,
  applyMove, getGameStatus, getComputerMove, getPieceUnicode,
} from '@/lib/chess';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

export type GameMode = 'computer' | 'local' | 'online';

interface ChessBoardProps {
  mode: GameMode;
  playerColor?: PieceColor;
  gameState?: GameState;
  onMove?: (state: GameState) => void;
  onBack: () => void;
}

const ChessBoard = ({ mode, playerColor = 'w', gameState, onMove, onBack }: ChessBoardProps) => {
  const [state, setState] = useState<GameState>(gameState || createInitialState());
  const [selected, setSelected] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [thinking, setThinking] = useState(false);

  // Sync external state for online mode
  useEffect(() => {
    if (mode === 'online' && gameState) {
      setState(gameState);
      setSelected(null);
      setValidMoves([]);
    }
  }, [gameState, mode]);

  const status = getGameStatus(state);

  const canMove = useCallback(() => {
    if (status === 'checkmate' || status === 'stalemate') return false;
    if (mode === 'computer') return state.turn === 'w';
    if (mode === 'local') return true;
    if (mode === 'online') return state.turn === playerColor;
    return false;
  }, [state.turn, status, mode, playerColor]);

  const handleSquareClick = useCallback((row: number, col: number) => {
    if (!canMove()) return;

    const piece = state.board[row][col];
    const myColor = mode === 'local' ? state.turn : (mode === 'online' ? playerColor : 'w');

    if (selected) {
      const isValid = validMoves.some(([r, c]) => r === row && c === col);
      if (isValid) {
        const movingPiece = state.board[selected[0]][selected[1]]!;
        let promotion = undefined;
        if (movingPiece.type === 'P' && (row === 0 || row === 7)) {
          promotion = 'Q' as const;
        }
        const newState = applyMove(state, { from: selected, to: [row, col], promotion });
        setState(newState);
        setSelected(null);
        setValidMoves([]);
        onMove?.(newState);
        return;
      }
    }

    if (piece && piece.color === myColor) {
      setSelected([row, col]);
      setValidMoves(getLegalMoves(state, row, col));
    } else {
      setSelected(null);
      setValidMoves([]);
    }
  }, [state, selected, validMoves, canMove, mode, playerColor, onMove]);

  // Computer move
  useEffect(() => {
    if (mode === 'computer' && state.turn === 'b' && status === 'playing') {
      setThinking(true);
      const timer = setTimeout(() => {
        const move = getComputerMove(state);
        if (move) {
          const newState = applyMove(state, move);
          setState(newState);
          onMove?.(newState);
        }
        setThinking(false);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [state.turn, status, mode]);

  const resetGame = () => {
    const newState = createInitialState();
    setState(newState);
    setSelected(null);
    setValidMoves([]);
    onMove?.(newState);
  };

  const statusText = () => {
    if (status === 'checkmate') {
      const loser = state.turn;
      if (mode === 'computer') return loser === 'w' ? '🏆 Black wins!' : '🏆 You win!';
      if (mode === 'local') return loser === 'w' ? '🏆 Black wins!' : '🏆 White wins!';
      return loser === playerColor ? '🏆 Opponent wins!' : '🏆 You win!';
    }
    if (status === 'stalemate') return '🤝 Stalemate - Draw';
    if (status === 'check') {
      if (mode === 'computer') return state.turn === 'w' ? '⚠️ You are in check!' : '⚠️ Computer in check';
      if (mode === 'local') return `⚠️ ${state.turn === 'w' ? 'White' : 'Black'} is in check!`;
      return state.turn === playerColor ? '⚠️ You are in check!' : '⚠️ Opponent in check';
    }
    if (thinking) return '🤔 Computer thinking...';
    if (mode === 'computer') return state.turn === 'w' ? '♟️ Your turn (White)' : "Computer's turn";
    if (mode === 'local') return `♟️ ${state.turn === 'w' ? 'White' : 'Black'}'s turn`;
    if (mode === 'online') return state.turn === playerColor ? '♟️ Your turn' : "⏳ Opponent's turn";
    return '';
  };

  // Flip board for black in online mode
  const flipped = mode === 'online' && playerColor === 'b';

  const renderBoard = () => {
    const indices = Array.from({ length: 64 }, (_, i) => i);
    const ordered = flipped ? indices.reverse() : indices;

    return ordered.map((i) => {
      const row = Math.floor(i / 8);
      const col = i % 8;
      const piece = state.board[row][col];
      const isSelected = selected !== null && selected[0] === row && selected[1] === col;
      const isValid = validMoves.some(([r, c]) => r === row && c === col);
      const isCapture = isValid && piece !== null;
      const isLastMove = state.lastMove !== null && (
        (state.lastMove.from[0] === row && state.lastMove.from[1] === col) ||
        (state.lastMove.to[0] === row && state.lastMove.to[1] === col)
      );
      return (
        <ChessSquare
          key={`${row}-${col}`}
          row={row} col={col}
          piece={piece}
          isSelected={isSelected}
          isValidMove={isValid}
          isCapture={isCapture}
          isLastMove={isLastMove}
          onClick={() => handleSquareClick(row, col)}
        />
      );
    });
  };

  const fileLabels = flipped ? [...FILES].reverse() : FILES;
  const rankLabels = flipped ? [1,2,3,4,5,6,7,8] : [8,7,6,5,4,3,2,1];

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-xl font-semibold text-foreground tracking-wide">
        {statusText()}
      </div>

      {/* Top captured pieces */}
      <div className="flex gap-1 h-8 items-center">
        {state.captured[flipped ? 'w' : 'b'].sort((a, b) => a.type.localeCompare(b.type)).map((p, i) => (
          <span key={i} className="text-xl chess-piece-light opacity-70">{getPieceUnicode(p)}</span>
        ))}
      </div>

      <div className="relative">
        <div className="grid grid-cols-8 border-2 border-border rounded-lg overflow-hidden shadow-2xl"
          style={{ width: 'min(85vw, 480px)', height: 'min(85vw, 480px)' }}>
          {renderBoard()}
        </div>

        <div className="flex justify-around mt-1 px-1">
          {fileLabels.map(f => (
            <span key={f} className="text-xs text-muted-foreground font-medium w-[12.5%] text-center">{f}</span>
          ))}
        </div>

        <div className="absolute top-0 -left-5 h-full flex flex-col justify-around">
          {rankLabels.map(r => (
            <span key={r} className="text-xs text-muted-foreground font-medium">{r}</span>
          ))}
        </div>
      </div>

      {/* Bottom captured pieces */}
      <div className="flex gap-1 h-8 items-center">
        {state.captured[flipped ? 'b' : 'w'].sort((a, b) => a.type.localeCompare(b.type)).map((p, i) => (
          <span key={i} className="text-xl chess-piece-dark opacity-70">{getPieceUnicode(p)}</span>
        ))}
      </div>

      <div className="flex gap-3">
        <button
          onClick={onBack}
          className="px-5 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          ← Menu
        </button>
        {mode !== 'online' && (
          <button
            onClick={resetGame}
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            New Game
          </button>
        )}
      </div>
    </div>
  );
};

export default ChessBoard;
