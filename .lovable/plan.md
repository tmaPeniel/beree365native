
## Ajouter la suppression de compte dans /profile/edit

### Contexte

La logique de suppression de compte existe déjà dans `src/pages/ProfilePrivacy.tsx`. Elle :
- Appelle l'edge function `delete-user-account` via `supabase.functions.invoke`
- Demande à l'utilisateur de re-saisir son email pour confirmer
- Déconnecte et redirige vers `/` après suppression

L'objectif est d'intégrer cette même fonctionnalité directement dans `src/pages/ProfileEdit.tsx`, en bas de la page, dans une section "Zone de danger".

---

### Modification : `src/pages/ProfileEdit.tsx`

Un seul fichier est modifié.

#### 1. Nouveaux imports à ajouter

```typescript
import { Trash2, AlertTriangle } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
```

#### 2. Nouveaux états à ajouter

```typescript
const [isDeleting, setIsDeleting] = useState(false);
const [confirmEmail, setConfirmEmail] = useState('');
const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
```

#### 3. Nouvelle fonction `handleDeleteAccount`

Identique à celle de `ProfilePrivacy.tsx` :

```typescript
const handleDeleteAccount = async () => {
  if (!user || confirmEmail !== user.email) {
    toast.error("L'email saisi ne correspond pas à votre compte");
    return;
  }
  setIsDeleting(true);
  try {
    const response = await supabase.functions.invoke('delete-user-account', {
      body: { userId: user.id }
    });
    if (response.error) throw new Error(response.error.message);
    
    toast.success('Votre compte a été supprimé avec succès');
    setDeleteDialogOpen(false);
    await supabase.auth.signOut();
    navigate('/');
  } catch (error) {
    toast.error('Erreur lors de la suppression du compte. Veuillez réessayer.');
  } finally {
    setIsDeleting(false);
  }
};
```

#### 4. Nouvelle section UI insérée entre le bouton mobile et la fin du contenu

Une Card avec bordure rouge (identique à `ProfilePrivacy.tsx`) affichant :
- Un bandeau d'avertissement orange avec icône `AlertTriangle`
- La liste des données qui seront supprimées
- Un bouton "Supprimer définitivement mon compte" (destructive)
- Un `AlertDialog` demandant la re-saisie de l'email avant confirmation

```
┌─────────────────────────────────────────┐  ← border-destructive/50
│ 🗑️  Supprimer mon compte               │
│ Action irréversible...                  │
│                                         │
│ ⚠️  Attention                           │
│    • Votre progression de lecture       │
│    • Vos badges et récompenses          │
│    • Vos préférences et paramètres      │
│    • Votre historique de notifications  │
│                                         │
│ [Supprimer définitivement mon compte]   │
└─────────────────────────────────────────┘
```

---

### Résumé

| Fichier | Modification |
|---------|-------------|
| `src/pages/ProfileEdit.tsx` | Ajout de 3 états, 1 fonction, 1 section Card + AlertDialog |

Aucune modification de base de données ou d'edge function nécessaire : `delete-user-account` est déjà déployée et fonctionnelle.
