-- Ajouter la colonne sort_order pour ordonner les passages
ALTER TABLE reading_plan_chapters 
ADD COLUMN IF NOT EXISTS sort_order INTEGER DEFAULT 0;

-- Mettre à jour les valeurs existantes en extrayant le numéro de chapitre de la référence
UPDATE reading_plan_chapters
SET sort_order = (
  CASE 
    WHEN reference ~ '([0-9]+)$' 
    THEN CAST(SUBSTRING(reference FROM '([0-9]+)$') AS INTEGER)
    ELSE 0
  END
);

-- Créer un index pour optimiser les requêtes de tri
CREATE INDEX IF NOT EXISTS idx_reading_plan_chapters_sort 
ON reading_plan_chapters(plan_id, day_number, sort_order);