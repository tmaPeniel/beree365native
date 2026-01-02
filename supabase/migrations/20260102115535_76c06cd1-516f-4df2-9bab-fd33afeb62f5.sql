-- Permettre aux utilisateurs de supprimer leurs propres badges
CREATE POLICY "Users can delete their own badges"
  ON public.user_badges
  FOR DELETE
  USING (auth.uid() = user_id);