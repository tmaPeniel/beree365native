
## Plan : Nettoyage automatique des logs de notifications

### Contexte
- La table `notification_logs` contient actuellement **320 logs** dont **92 datent de plus d'un mois**
- Colonne utilisée pour le tri : `sent_at` (timestamp with time zone)
- Aucun cron job de nettoyage n'existe actuellement

---

## Solution proposée

### 1. Créer une fonction SQL de nettoyage

```sql
CREATE OR REPLACE FUNCTION public.cleanup_old_notification_logs()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.notification_logs
  WHERE sent_at < NOW() - INTERVAL '1 month';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE 'Cleanup completed: % notification logs deleted', deleted_count;
END;
$$;
```

### 2. Programmer un cron job quotidien

Exécution chaque jour à **02:00 UTC** (4h du matin heure française) pour minimiser l'impact sur les utilisateurs :

```sql
SELECT cron.schedule(
  'cleanup-notification-logs',
  '0 2 * * *',
  $$SELECT public.cleanup_old_notification_logs()$$
);
```

---

## Détails techniques

| Élément | Valeur |
|---------|--------|
| Fonction | `cleanup_old_notification_logs()` |
| Fréquence | Quotidien à 02:00 UTC |
| Cron expression | `0 2 * * *` |
| Rétention | 1 mois (30 jours) |
| Logs supprimés immédiatement | ~92 |

### Sécurité
- `SECURITY DEFINER` : permet l'exécution avec les privilèges du créateur
- `SET search_path TO 'public'` : évite les attaques par injection de schéma

---

## Fichiers / Modifications

| Type | Action |
|------|--------|
| Migration SQL | Créer la fonction `cleanup_old_notification_logs()` |
| Cron job | Ajouter le job `cleanup-notification-logs` via SQL Editor |

### Avantages
- Exécution 100% côté base de données (pas d'edge function nécessaire)
- Pas de consommation de quota d'edge functions
- Logging intégré via `RAISE NOTICE`
- Maintenance automatique sans intervention manuelle
