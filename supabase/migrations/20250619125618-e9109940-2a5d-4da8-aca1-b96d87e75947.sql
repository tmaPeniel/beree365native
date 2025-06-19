
-- Fonction RPC optimisée pour calculer le nombre de jours complétés à 100%
CREATE OR REPLACE FUNCTION get_completed_days_count(p_user_id UUID)
RETURNS INTEGER AS $$
DECLARE
  completed_days_count INTEGER;
BEGIN
  -- Compter les jours où tous les chapitres sont marqués comme 'completed'
  SELECT COUNT(DISTINCT rpc.day_number)
  INTO completed_days_count
  FROM reading_plan_chapters rpc
  WHERE NOT EXISTS (
    -- Vérifier qu'il n'y a aucun chapitre non complété pour ce jour
    SELECT 1 
    FROM reading_plan_chapters rpc2 
    LEFT JOIN user_progress up ON (rpc2.id = up.chapter_id AND up.user_id = p_user_id)
    WHERE rpc2.day_number = rpc.day_number 
    AND (up.status IS NULL OR up.status != 'completed')
  );
  
  RETURN COALESCE(completed_days_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Accorder les permissions d'exécution
GRANT EXECUTE ON FUNCTION get_completed_days_count(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_completed_days_count(UUID) TO anon;
