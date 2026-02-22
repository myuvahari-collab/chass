import { useState } from 'react';
import GameMenu from '@/components/GameMenu';
import ChessBoard, { GameMode } from '@/components/ChessBoard';
import OnlineGame from '@/components/OnlineGame';
import JoinGame from '@/components/JoinGame';

type Screen = 'menu' | 'computer' | 'local' | 'online-create' | 'online-join' | 'joining';

const Index = () => {
  const [screen, setScreen] = useState<Screen>('menu');
  const [joinCode, setJoinCode] = useState('');

  const handleSelectMode = (mode: GameMode) => {
    if (mode === 'online') {
      setScreen('online-create');
    } else {
      setScreen(mode as Screen);
    }
  };

  const handleJoinGame = () => {
    setScreen('online-join');
  };

  const handleJoinWithCode = (code: string) => {
    setJoinCode(code);
    setScreen('joining');
  };

  const goBack = () => {
    setScreen('menu');
    setJoinCode('');
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center py-8 px-4">
      {screen === 'menu' && (
        <GameMenu onSelectMode={handleSelectMode} onJoinGame={handleJoinGame} />
      )}

      {screen === 'computer' && (
        <ChessBoard mode="computer" onBack={goBack} />
      )}

      {screen === 'local' && (
        <ChessBoard mode="local" onBack={goBack} />
      )}

      {screen === 'online-create' && (
        <OnlineGame onBack={goBack} />
      )}

      {screen === 'online-join' && (
        <JoinGame onJoin={handleJoinWithCode} onBack={goBack} />
      )}

      {screen === 'joining' && (
        <OnlineGame gameCode={joinCode} onBack={goBack} />
      )}
    </div>
  );
};

export default Index;
