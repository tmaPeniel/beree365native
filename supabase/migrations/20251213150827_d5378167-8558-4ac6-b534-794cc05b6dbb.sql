-- 1. Ajouter la colonne likes_count à daily_verses
ALTER TABLE public.daily_verses 
ADD COLUMN likes_count INTEGER NOT NULL DEFAULT 0;

-- 2. Créer la fonction de mise à jour automatique
CREATE OR REPLACE FUNCTION public.update_verse_likes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.daily_verses 
    SET likes_count = likes_count + 1 
    WHERE day_number = NEW.verse_day_number;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.daily_verses 
    SET likes_count = GREATEST(0, likes_count - 1)
    WHERE day_number = OLD.verse_day_number;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Créer le trigger sur verse_likes
CREATE TRIGGER trigger_update_verse_likes_count
AFTER INSERT OR DELETE ON public.verse_likes
FOR EACH ROW EXECUTE FUNCTION public.update_verse_likes_count();

-- 4. Initialiser les compteurs existants
UPDATE public.daily_verses dv
SET likes_count = COALESCE(
  (SELECT COUNT(*) FROM public.verse_likes vl 
   WHERE vl.verse_day_number = dv.day_number), 0
);