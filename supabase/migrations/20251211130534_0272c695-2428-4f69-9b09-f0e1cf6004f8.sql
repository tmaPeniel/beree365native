-- Table pour les likes sur les versets
CREATE TABLE public.verse_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  verse_day_number INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, verse_day_number)
);

-- Index pour performance
CREATE INDEX idx_verse_likes_day ON public.verse_likes(verse_day_number);
CREATE INDEX idx_verse_likes_user ON public.verse_likes(user_id);

-- RLS Policies
ALTER TABLE public.verse_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all likes count" ON public.verse_likes
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own likes" ON public.verse_likes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes" ON public.verse_likes
  FOR DELETE USING (auth.uid() = user_id);