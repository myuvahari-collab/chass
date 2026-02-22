import { useState, useEffect, useCallback } from 'react';
import ChessBoard from './ChessBoard';
import { supabase } from '@/integrations/supabase/client';
import {
  GameState, PieceColor, createInitialState, createInitialBoard,
} from '@/lib/chess';

interface OnlineGameProps {
  gameCode?: string; // If provided, join this game; otherwise create one
  onBack: () => void;
}

function serializeState(state: GameState) {
  return {
    board_state: JSON.stringify(state.board),
    turn: state.turn,
    castling: state.castling,
    en_passant: state.enPassant,
    last_move: state.lastMove,
    captured: state.captured,
  };
}

function deserializeState(row: any): GameState {
  return {
    board: typeof row.board_state === 'string' ? JSON.parse(row.board_state) : row.board_state,
    turn: row.turn as PieceColor,
    castling: row.castling as any,
    enPassant: row.en_passant as any,
    lastMove: row.last_move as any,
    captured: row.captured as any,
  };
}

const OnlineGame = ({ gameCode: joinCode, onBack }: OnlineGameProps) => {
  const [gameId, setGameId] = useState<string | null>(null);
  const [gameCode, setGameCode] = useState<string>('');
  const [playerColor, setPlayerColor] = useState<PieceColor>('w');
  const [playerId] = useState(() => crypto.randomUUID());
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<'creating' | 'waiting' | 'playing' | 'error'>('creating');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  // Create or join game
  useEffect(() => {
    if (joinCode) {
      joinGame(joinCode);
    } else {
      createGame();
    }
  }, []);

  const createGame = async () => {
    const initialState = createInitialState();
    const { data, error } = await supabase
      .from('games')
      .insert({
        white_player_id: playerId,
        board_state: JSON.stringify(initialState.board),
        turn: 'w',
        castling: initialState.castling as any,
        en_passant: null,
        last_move: null,
        captured: initialState.captured as any,
        status: 'waiting',
      })
      .select()
      .single();

    if (error || !data) {
      setStatus('error');
      setError('Failed to create game');
      return;
    }

    setGameId(data.id);
    setGameCode(data.game_code);
    setPlayerColor('w');
    setGameState(initialState);
    setStatus('waiting');
  };

  const joinGame = async (code: string) => {
    const { data, error: fetchError } = await supabase
      .from('games')
      .select()
      .eq('game_code', code)
      .single();

    if (fetchError || !data) {
      setStatus('error');
      setError('Game not found. Check the code and try again.');
      return;
    }

    if (data.black_player_id && data.status !== 'waiting') {
      setStatus('error');
      setError('Game is already full.');
      return;
    }

    const { error: updateError } = await supabase
      .from('games')
      .update({ black_player_id: playerId, status: 'playing' })
      .eq('id', data.id);

    if (updateError) {
      setStatus('error');
      setError('Failed to join game');
      return;
    }

    setGameId(data.id);
    setGameCode(data.game_code);
    setPlayerColor('b');
    setGameState(deserializeState(data));
    setStatus('playing');
  };

  // Subscribe to realtime changes
  useEffect(() => {
    if (!gameId) return;

    const channel = supabase
      .channel(`game-${gameId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'games',
          filter: `id=eq.${gameId}`,
        },
        (payload) => {
          const row = payload.new as any;
          if (row.status === 'playing' && status === 'waiting') {
            setStatus('playing');
          }
          setGameState(deserializeState(row));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [gameId, status]);

  const handleMove = useCallback(async (newState: GameState) => {
    if (!gameId) return;
    setGameState(newState);

    const gameStatus = newState.board ? 'playing' : 'playing';
    
    await supabase
      .from('games')
      .update({
        ...serializeState(newState),
        status: gameStatus,
      })
      .eq('id', gameId);
  }, [gameId]);

  const copyCode = () => {
    navigator.clipboard.writeText(gameCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="text-2xl">❌</div>
        <p className="text-destructive text-lg">{error}</p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          ← Back to Menu
        </button>
      </div>
    );
  }

  if (status === 'creating') {
    return (
      <div className="flex flex-col items-center gap-4">
        <div className="text-2xl animate-pulse">⏳</div>
        <p className="text-muted-foreground">Setting up game...</p>
      </div>
    );
  }

  if (status === 'waiting') {
    return (
      <div className="flex flex-col items-center gap-6 text-center">
        <div className="text-2xl">⏳</div>
        <h2 className="text-2xl font-bold text-foreground">Waiting for opponent...</h2>
        <p className="text-muted-foreground">Share this code with your friend:</p>
        <div className="flex items-center gap-3">
          <div className="px-6 py-3 bg-card border-2 border-primary rounded-xl text-2xl font-mono font-bold text-foreground tracking-widest">
            {gameCode}
          </div>
          <button
            onClick={copyCode}
            className="px-4 py-3 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            {copied ? '✓ Copied!' : '📋 Copy'}
          </button>
        </div>
        <p className="text-sm text-muted-foreground max-w-xs">
          Your friend can click "Join Game" on the menu and enter this code
        </p>
        <button
          onClick={onBack}
          className="px-6 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium hover:opacity-90 transition-opacity"
        >
          ← Cancel
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm text-muted-foreground">
        Game: <span className="font-mono font-bold">{gameCode}</span> • You are {playerColor === 'w' ? 'White ♔' : 'Black ♚'}
      </div>
      {gameState && (
        <ChessBoard
          mode="online"
          playerColor={playerColor}
          gameState={gameState}
          onMove={handleMove}
          onBack={onBack}
        />
      )}
    </div>
  );
};

export default OnlineGame;
