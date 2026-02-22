import { memo } from 'react';
import { Piece, getPieceUnicode } from '@/lib/chess';
import { cn } from '@/lib/utils';

interface ChessSquareProps {
  row: number;
  col: number;
  piece: Piece | null;
  isSelected: boolean;
  isValidMove: boolean;
  isCapture: boolean;
  isLastMove: boolean;
  onClick: () => void;
}

const ChessSquare = memo(({ row, col, piece, isSelected, isValidMove, isCapture, isLastMove, onClick }: ChessSquareProps) => {
  const isLight = (row + col) % 2 === 0;

  return (
    <button
      className={cn(
        'relative flex items-center justify-center aspect-square text-3xl sm:text-4xl md:text-5xl transition-colors duration-150',
        isLight ? 'chess-square-light' : 'chess-square-dark',
        isSelected && 'chess-square-selected',
        isValidMove && !isCapture && 'chess-square-valid',
        isCapture && 'chess-square-capture',
        isLastMove && !isSelected && 'chess-square-last-move',
      )}
      onClick={onClick}
    >
      {piece && (
        <span className={cn('chess-piece', piece.color === 'w' ? 'chess-piece-light' : 'chess-piece-dark')}>
          {getPieceUnicode(piece)}
        </span>
      )}
    </button>
  );
});

ChessSquare.displayName = 'ChessSquare';
export default ChessSquare;
