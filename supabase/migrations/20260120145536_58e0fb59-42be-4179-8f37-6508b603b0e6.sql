-- Ajouter la colonne image_url à la table reading_plans
ALTER TABLE reading_plans 
ADD COLUMN image_url TEXT DEFAULT NULL;

-- Créer un bucket pour les images des plans
INSERT INTO storage.buckets (id, name, public)
VALUES ('plan-images', 'plan-images', true);

-- Politique RLS : lecture publique des images
CREATE POLICY "Public read access for plan images"
ON storage.objects FOR SELECT
USING (bucket_id = 'plan-images');

-- Politique RLS : seuls les admins peuvent uploader
CREATE POLICY "Admin upload access for plan images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'plan-images' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Politique RLS : seuls les admins peuvent supprimer
CREATE POLICY "Admin delete access for plan images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'plan-images' 
  AND EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);