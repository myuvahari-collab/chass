// Chess piece types
export type PieceType = 'K' | 'Q' | 'R' | 'B' | 'N' | 'P';
export type PieceColor = 'w' | 'b';
export type Piece = { type: PieceType; color: PieceColor };
export type Square = Piece | null;
export type Board = Square[][];
export type Position = [number, number]; // [row, col]
export type Move = { from: Position; to: Position; promotion?: PieceType };
export type GameStatus = 'playing' | 'check' | 'checkmate' | 'stalemate';

const PIECE_UNICODE: Record<string, string> = {
  wK: '♔', wQ: '♕', wR: '♖', wB: '♗', wN: '♘', wP: '♙',
  bK: '♚', bQ: '♛', bR: '♜', bB: '♝', bN: '♞', bP: '♟',
};

export const getPieceUnicode = (piece: Piece): string =>
  PIECE_UNICODE[`${piece.color}${piece.type}`];

const PIECE_VALUES: Record<PieceType, number> = {
  P: 10, N: 30, B: 30, R: 50, Q: 90, K: 900,
};

// Position bonus tables (simplified)
const PAWN_TABLE = [
  [0,0,0,0,0,0,0,0],
  [5,5,5,5,5,5,5,5],
  [1,1,2,3,3,2,1,1],
  [0.5,0.5,1,2.5,2.5,1,0.5,0.5],
  [0,0,0,2,2,0,0,0],
  [0.5,-0.5,-1,0,0,-1,-0.5,0.5],
  [0.5,1,1,-2,-2,1,1,0.5],
  [0,0,0,0,0,0,0,0],
];

export function createInitialBoard(): Board {
  const board: Board = Array(8).fill(null).map(() => Array(8).fill(null));
  const backRow: PieceType[] = ['R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R'];
  for (let c = 0; c < 8; c++) {
    board[0][c] = { type: backRow[c], color: 'b' };
    board[1][c] = { type: 'P', color: 'b' };
    board[6][c] = { type: 'P', color: 'w' };
    board[7][c] = { type: backRow[c], color: 'w' };
  }
  return board;
}

export function cloneBoard(board: Board): Board {
  return board.map(row => row.map(sq => sq ? { ...sq } : null));
}

function inBounds(r: number, c: number): boolean {
  return r >= 0 && r < 8 && c >= 0 && c < 8;
}

export interface GameState {
  board: Board;
  turn: PieceColor;
  castling: { wK: boolean; wQ: boolean; bK: boolean; bQ: boolean };
  enPassant: Position | null;
  lastMove: Move | null;
  captured: { w: Piece[]; b: Piece[] };
}

export function createInitialState(): GameState {
  return {
    board: createInitialBoard(),
    turn: 'w',
    castling: { wK: true, wQ: true, bK: true, bQ: true },
    enPassant: null,
    lastMove: null,
    captured: { w: [], b: [] },
  };
}

// Get pseudo-legal moves for a piece (doesn't check if king is left in check)
function getPseudoMoves(state: GameState, row: number, col: number): Position[] {
  const piece = state.board[row][col];
  if (!piece) return [];
  const moves: Position[] = [];
  const { color, type } = piece;
  const enemy = color === 'w' ? 'b' : 'w';

  const addIfValid = (r: number, c: number) => {
    if (!inBounds(r, c)) return false;
    const target = state.board[r][c];
    if (target && target.color === color) return false;
    moves.push([r, c]);
    return !target; // continue sliding if empty
  };

  const slide = (dr: number, dc: number) => {
    for (let i = 1; i < 8; i++) {
      if (!addIfValid(row + dr * i, col + dc * i)) break;
    }
  };

  switch (type) {
    case 'P': {
      const dir = color === 'w' ? -1 : 1;
      const startRow = color === 'w' ? 6 : 1;
      // Forward
      if (inBounds(row + dir, col) && !state.board[row + dir][col]) {
        moves.push([row + dir, col]);
        if (row === startRow && !state.board[row + 2 * dir][col]) {
          moves.push([row + 2 * dir, col]);
        }
      }
      // Captures
      for (const dc of [-1, 1]) {
        const nr = row + dir, nc = col + dc;
        if (!inBounds(nr, nc)) continue;
        const target = state.board[nr][nc];
        if (target && target.color === enemy) moves.push([nr, nc]);
        // En passant
        if (state.enPassant && state.enPassant[0] === nr && state.enPassant[1] === nc) {
          moves.push([nr, nc]);
        }
      }
      break;
    }
    case 'N':
      for (const [dr, dc] of [[-2,-1],[-2,1],[-1,-2],[-1,2],[1,-2],[1,2],[2,-1],[2,1]]) {
        addIfValid(row + dr, col + dc);
      }
      break;
    case 'B':
      for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1]]) slide(dr, dc);
      break;
    case 'R':
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) slide(dr, dc);
      break;
    case 'Q':
      for (const [dr, dc] of [[-1,-1],[-1,1],[1,-1],[1,1],[-1,0],[1,0],[0,-1],[0,1]]) slide(dr, dc);
      break;
    case 'K':
      for (const [dr, dc] of [[-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]]) {
        addIfValid(row + dr, col + dc);
      }
      // Castling
      const kRow = color === 'w' ? 7 : 0;
      if (row === kRow && col === 4) {
        if (state.castling[`${color}K` as keyof typeof state.castling]) {
          if (!state.board[kRow][5] && !state.board[kRow][6] && state.board[kRow][7]?.type === 'R') {
            if (!isSquareAttacked(state.board, kRow, 4, enemy) &&
                !isSquareAttacked(state.board, kRow, 5, enemy)) {
              moves.push([kRow, 6]);
            }
          }
        }
        if (state.castling[`${color}Q` as keyof typeof state.castling]) {
          if (!state.board[kRow][3] && !state.board[kRow][2] && !state.board[kRow][1] && state.board[kRow][0]?.type === 'R') {
            if (!isSquareAttacked(state.board, kRow, 4, enemy) &&
                !isSquareAttacked(state.board, kRow, 3, enemy)) {
              moves.push([kRow, 2]);
            }
          }
        }
      }
      break;
  }
  return moves;
}

function isSquareAttacked(board: Board, row: number, col: number, byColor: PieceColor): boolean {
  // Check all pieces of byColor
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const p = board[r][c];
      if (!p || p.color !== byColor) continue;
      // Simplified attack check
      const dr = row - r, dc = col - c;
      const adr = Math.abs(dr), adc = Math.abs(dc);
      switch (p.type) {
        case 'P': {
          const dir = byColor === 'w' ? -1 : 1;
          if (dr === dir && adc === 1) return true;
          break;
        }
        case 'N':
          if ((adr === 2 && adc === 1) || (adr === 1 && adc === 2)) return true;
          break;
        case 'K':
          if (adr <= 1 && adc <= 1) return true;
          break;
        case 'B':
          if (adr === adc && adr > 0 && isClearDiag(board, r, c, row, col)) return true;
          break;
        case 'R':
          if ((dr === 0 || dc === 0) && (adr + adc > 0) && isClearStraight(board, r, c, row, col)) return true;
          break;
        case 'Q':
          if (adr === adc && adr > 0 && isClearDiag(board, r, c, row, col)) return true;
          if ((dr === 0 || dc === 0) && (adr + adc > 0) && isClearStraight(board, r, c, row, col)) return true;
          break;
      }
    }
  }
  return false;
}

function isClearStraight(board: Board, r1: number, c1: number, r2: number, c2: number): boolean {
  const dr = Math.sign(r2 - r1), dc = Math.sign(c2 - c1);
  let r = r1 + dr, c = c1 + dc;
  while (r !== r2 || c !== c2) {
    if (board[r][c]) return false;
    r += dr; c += dc;
  }
  return true;
}

function isClearDiag(board: Board, r1: number, c1: number, r2: number, c2: number): boolean {
  return isClearStraight(board, r1, c1, r2, c2);
}

function findKing(board: Board, color: PieceColor): Position {
  for (let r = 0; r < 8; r++)
    for (let c = 0; c < 8; c++)
      if (board[r][c]?.type === 'K' && board[r][c]?.color === color)
        return [r, c];
  return [0, 0];
}

export function isInCheck(board: Board, color: PieceColor): boolean {
  const [kr, kc] = findKing(board, color);
  const enemy = color === 'w' ? 'b' : 'w';
  return isSquareAttacked(board, kr, kc, enemy);
}

// Apply move and return new state
export function applyMove(state: GameState, move: Move): GameState {
  const newBoard = cloneBoard(state.board);
  const piece = newBoard[move.from[0]][move.from[1]]!;
  const captured = newBoard[move.to[0]][move.to[1]];
  const newCaptured = { w: [...state.captured.w], b: [...state.captured.b] };
  let newEnPassant: Position | null = null;
  const newCastling = { ...state.castling };

  // Handle en passant capture
  if (piece.type === 'P' && state.enPassant &&
      move.to[0] === state.enPassant[0] && move.to[1] === state.enPassant[1]) {
    const capturedPawnRow = piece.color === 'w' ? move.to[0] + 1 : move.to[0] - 1;
    const ep = newBoard[capturedPawnRow][move.to[1]]!;
    newCaptured[piece.color].push(ep);
    newBoard[capturedPawnRow][move.to[1]] = null;
  } else if (captured) {
    newCaptured[piece.color].push(captured);
  }

  // Move piece
  newBoard[move.to[0]][move.to[1]] = move.promotion
    ? { type: move.promotion, color: piece.color }
    : piece;
  newBoard[move.from[0]][move.from[1]] = null;

  // Pawn double push - set en passant
  if (piece.type === 'P' && Math.abs(move.to[0] - move.from[0]) === 2) {
    newEnPassant = [(move.from[0] + move.to[0]) / 2, move.from[1]];
  }

  // Castling move rook
  if (piece.type === 'K' && Math.abs(move.to[1] - move.from[1]) === 2) {
    const kRow = move.from[0];
    if (move.to[1] === 6) { // Kingside
      newBoard[kRow][5] = newBoard[kRow][7];
      newBoard[kRow][7] = null;
    } else { // Queenside
      newBoard[kRow][3] = newBoard[kRow][0];
      newBoard[kRow][0] = null;
    }
  }

  // Update castling rights
  if (piece.type === 'K') {
    newCastling[`${piece.color}K` as keyof typeof newCastling] = false;
    newCastling[`${piece.color}Q` as keyof typeof newCastling] = false;
  }
  if (piece.type === 'R') {
    if (move.from[1] === 0) newCastling[`${piece.color}Q` as keyof typeof newCastling] = false;
    if (move.from[1] === 7) newCastling[`${piece.color}K` as keyof typeof newCastling] = false;
  }

  return {
    board: newBoard,
    turn: state.turn === 'w' ? 'b' : 'w',
    castling: newCastling,
    enPassant: newEnPassant,
    lastMove: move,
    captured: newCaptured,
  };
}

// Get all legal moves for a piece
export function getLegalMoves(state: GameState, row: number, col: number): Position[] {
  const piece = state.board[row][col];
  if (!piece || piece.color !== state.turn) return [];

  const pseudoMoves = getPseudoMoves(state, row, col);
  return pseudoMoves.filter(([tr, tc]) => {
    const newState = applyMove(state, { from: [row, col], to: [tr, tc] });
    return !isInCheck(newState.board, piece.color);
  });
}

// Get all legal moves for current player
export function getAllLegalMoves(state: GameState): Move[] {
  const moves: Move[] = [];
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (!piece || piece.color !== state.turn) continue;
      const targets = getLegalMoves(state, r, c);
      for (const [tr, tc] of targets) {
        // Handle pawn promotion
        if (piece.type === 'P' && (tr === 0 || tr === 7)) {
          for (const promo of ['Q', 'R', 'B', 'N'] as PieceType[]) {
            moves.push({ from: [r, c], to: [tr, tc], promotion: promo });
          }
        } else {
          moves.push({ from: [r, c], to: [tr, tc] });
        }
      }
    }
  }
  return moves;
}

export function getGameStatus(state: GameState): GameStatus {
  const hasMoves = getAllLegalMoves(state).length > 0;
  const inCheck = isInCheck(state.board, state.turn);
  if (!hasMoves && inCheck) return 'checkmate';
  if (!hasMoves) return 'stalemate';
  if (inCheck) return 'check';
  return 'playing';
}

// Simple AI evaluation
function evaluate(state: GameState): number {
  let score = 0;
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = state.board[r][c];
      if (!piece) continue;
      const sign = piece.color === 'w' ? 1 : -1;
      let val = PIECE_VALUES[piece.type];
      // Position bonus for pawns
      if (piece.type === 'P') {
        const pr = piece.color === 'w' ? r : 7 - r;
        val += PAWN_TABLE[pr][c];
      }
      // Center control bonus for knights/bishops
      if (piece.type === 'N' || piece.type === 'B') {
        const centerDist = Math.abs(r - 3.5) + Math.abs(c - 3.5);
        val += (7 - centerDist) * 0.3;
      }
      score += sign * val;
    }
  }
  return score;
}

function minimax(state: GameState, depth: number, alpha: number, beta: number, maximizing: boolean): number {
  if (depth === 0) return evaluate(state);
  const status = getGameStatus(state);
  if (status === 'checkmate') return maximizing ? -9999 : 9999;
  if (status === 'stalemate') return 0;

  const moves = getAllLegalMoves(state);
  if (maximizing) {
    let maxEval = -Infinity;
    for (const move of moves) {
      const newState = applyMove(state, move);
      const ev = minimax(newState, depth - 1, alpha, beta, false);
      maxEval = Math.max(maxEval, ev);
      alpha = Math.max(alpha, ev);
      if (beta <= alpha) break;
    }
    return maxEval;
  } else {
    let minEval = Infinity;
    for (const move of moves) {
      const newState = applyMove(state, move);
      const ev = minimax(newState, depth - 1, alpha, beta, true);
      minEval = Math.min(minEval, ev);
      beta = Math.min(beta, ev);
      if (beta <= alpha) break;
    }
    return minEval;
  }
}

export function getComputerMove(state: GameState): Move | null {
  const moves = getAllLegalMoves(state);
  if (moves.length === 0) return null;

  let bestMove = moves[0];
  let bestScore = Infinity; // Computer is black, minimizing
  
  for (const move of moves) {
    const newState = applyMove(state, move);
    const score = minimax(newState, 2, -Infinity, Infinity, true);
    if (score < bestScore) {
      bestScore = score;
      bestMove = move;
    }
  }
  
  return bestMove;
}
