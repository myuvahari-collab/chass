
-- Create games table for online multiplayer chess
CREATE TABLE public.games (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_code TEXT NOT NULL UNIQUE DEFAULT substring(gen_random_uuid()::text, 1, 8),
  white_player_id TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  black_player_id TEXT,
  board_state JSONB NOT NULL,
  turn TEXT NOT NULL DEFAULT 'w',
  castling JSONB NOT NULL DEFAULT '{"wK":true,"wQ":true,"bK":true,"bQ":true}'::jsonb,
  en_passant JSONB,
  last_move JSONB,
  captured JSONB NOT NULL DEFAULT '{"w":[],"b":[]}'::jsonb,
  status TEXT NOT NULL DEFAULT 'waiting',
  winner TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS but allow public access (no auth required for casual games)
ALTER TABLE public.games ENABLE ROW LEVEL SECURITY;

-- Anyone can read games
CREATE POLICY "Anyone can read games" ON public.games FOR SELECT USING (true);

-- Anyone can create games
CREATE POLICY "Anyone can create games" ON public.games FOR INSERT WITH CHECK (true);

-- Anyone can update games (moves)
CREATE POLICY "Anyone can update games" ON public.games FOR UPDATE USING (true);

-- Enable realtime for games table
ALTER PUBLICATION supabase_realtime ADD TABLE public.games;

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION public.update_games_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_games_updated_at
  BEFORE UPDATE ON public.games
  FOR EACH ROW
  EXECUTE FUNCTION public.update_games_updated_at();
