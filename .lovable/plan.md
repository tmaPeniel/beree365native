

## Plan : Supprimer les cron jobs en double pour corriger les notifications triples

### Probleme identifie

La base de donnees contient **des cron jobs en double** qui declenchent l'envoi de notifications multiples. Le job `send-reading-reminders` (ID 5) est un doublon exact de `send-daily-reading-reminders` (ID 4) : les deux appellent la meme edge function `send-daily-reminders` toutes les heures.

Resultat : chaque utilisateur recoit **3 notifications** (2 rappels de lecture + 1 verset) au lieu de **2** (1 rappel + 1 verset).

### Preuve dans les logs

Pour l'utilisateur `5fdb4ee9` le 6 fevrier 2026 :

```text
08:00:04 - reading_reminder (via job 4: send-daily-reading-reminders)
08:00:07 - reading_reminder (via job 5: send-reading-reminders) <- DOUBLON
10:00:04 - daily_verse     (via job 6: send-daily-verses)
```

### Solution

Executer une requete SQL pour supprimer les cron jobs inutiles :

1. **Job 5** (`send-reading-reminders`) : doublon du job 4, appelle la meme fonction
2. **Job 1** (`daily-reading-reminder-20h`) : appelle une fonction `daily-reading-reminder` qui n'existe pas (retourne 404)
3. **Job 2** (`daily-verse-sender-7h`) : appelle une fonction `daily-verse-sender` qui n'existe pas (retourne 404)
4. **Job 3** (`check-scheduled-notifications-every-15min`) : appelle une fonction `check-scheduled-notifications` qui n'existe pas (retourne 404)

### Cron jobs a conserver

| Job ID | Nom | Schedule | Fonction |
|--------|-----|----------|----------|
| 4 | `send-daily-reading-reminders` | `0 * * * *` | `send-daily-reminders` |
| 6 | `send-daily-verses` | `0 * * * *` | `send-daily-verse` |
| 7 | `sync-user-day-numbers` | `5 0 * * *` | SQL: `sync_current_day_numbers()` |
| 8 | `sync-onesignal-daily` | `0 3 * * *` | `sync-onesignal-subscriptions` |
| 10 | `cleanup-notification-logs` | `0 2 * * *` | SQL: `cleanup_old_notification_logs()` |

### Requete SQL a executer

```sql
-- Supprimer le doublon de rappels de lecture
SELECT cron.unschedule('send-reading-reminders');

-- Supprimer les jobs appelant des fonctions inexistantes
SELECT cron.unschedule('daily-reading-reminder-20h');
SELECT cron.unschedule('daily-verse-sender-7h');
SELECT cron.unschedule('check-scheduled-notifications-every-15min');
```

### Resultat attendu

Apres la suppression :
- Chaque utilisateur recevra exactement **2 notifications par jour** : 1 rappel de lecture + 1 verset du jour
- Les 4 jobs inutiles (dont 3 en erreur 404) seront supprimes
- Les 5 jobs fonctionnels resteront actifs

### Aucun fichier a modifier

Cette correction concerne uniquement la base de donnees (table `cron.job`). Aucune modification de code n'est necessaire.

