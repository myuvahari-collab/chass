import { GameMode } from './ChessBoard';

interface GameMenuProps {
  onSelectMode: (mode: GameMode) => void;
  onJoinGame: () => void;
}

const GameMenu = ({ onSelectMode, onJoinGame }: GameMenuProps) => {
  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center">
        <h1 className="text-5xl sm:text-6xl font-bold text-foreground mb-2 tracking-tight">
          ♛ Chess
        </h1>
        <p className="text-muted-foreground text-lg">Choose your game mode</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-xs">
        <button
          onClick={() => onSelectMode('computer')}
          className="group relative px-8 py-5 rounded-xl bg-card border border-border text-card-foreground font-semibold text-lg hover:border-primary transition-all duration-200 hover:shadow-lg"
        >
          <span className="text-2xl mr-3">🤖</span>
          vs Computer
          <span className="block text-sm font-normal text-muted-foreground mt-1">
            Challenge the AI opponent
          </span>
        </button>

        <button
          onClick={() => onSelectMode('local')}
          className="group relative px-8 py-5 rounded-xl bg-card border border-border text-card-foreground font-semibold text-lg hover:border-primary transition-all duration-200 hover:shadow-lg"
        >
          <span className="text-2xl mr-3">👥</span>
          Local Multiplayer
          <span className="block text-sm font-normal text-muted-foreground mt-1">
            Play with a friend on same device
          </span>
        </button>

        <button
          onClick={() => onSelectMode('online')}
          className="group relative px-8 py-5 rounded-xl bg-card border border-border text-card-foreground font-semibold text-lg hover:border-primary transition-all duration-200 hover:shadow-lg"
        >
          <span className="text-2xl mr-3">🌐</span>
          Play Online
          <span className="block text-sm font-normal text-muted-foreground mt-1">
            Create a game & share the link
          </span>
        </button>

        <button
          onClick={onJoinGame}
          className="group relative px-8 py-5 rounded-xl bg-secondary border border-border text-secondary-foreground font-semibold text-lg hover:border-primary transition-all duration-200 hover:shadow-lg"
        >
          <span className="text-2xl mr-3">🔗</span>
          Join Game
          <span className="block text-sm font-normal text-muted-foreground mt-1">
            Enter a game code to join
          </span>
        </button>
      </div>
    </div>
  );
};

export default GameMenu;
