import { useState } from 'react';

interface JoinGameProps {
  onJoin: (code: string) => void;
  onBack: () => void;
}

const JoinGame = ({ onJoin, onBack }: JoinGameProps) => {
  const [code, setCode] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.trim()) {
      onJoin(code.trim());
    }
  };

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <h2 className="text-2xl font-bold text-foreground">Join a Game</h2>
      <p className="text-muted-foreground">Enter the game code your friend shared</p>
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="Enter game code"
          className="px-6 py-3 bg-card border-2 border-border rounded-xl text-xl font-mono text-foreground text-center tracking-widest placeholder:text-muted-foreground focus:border-primary focus:outline-none transition-colors w-64"
          autoFocus
        />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onBack}
            className="px-5 py-2.5 rounded-lg bg-secondary text-secondary-foreground font-medium hover:opacity-90 transition-opacity"
          >
            ← Back
          </button>
          <button
            type="submit"
            disabled={!code.trim()}
            className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            Join Game
          </button>
        </div>
      </form>
    </div>
  );
};

export default JoinGame;
