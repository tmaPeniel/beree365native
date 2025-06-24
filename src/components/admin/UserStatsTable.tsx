
/**
 * Tableau des statistiques utilisateurs pour l'administration
 */

import React from 'react';
import { UserStats } from '@/types/supabase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface UserStatsTableProps {
  users: UserStats[];
  isLoading?: boolean;
}

const UserStatsTable: React.FC<UserStatsTableProps> = ({ users, isLoading }) => {
  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return 'Jamais connecté';
    
    try {
      return formatDistanceToNow(new Date(lastLogin), { 
        addSuffix: true, 
        locale: fr 
      });
    } catch {
      return 'Date invalide';
    }
  };

  const getProgressBadgeColor = (completed: number) => {
    if (completed === 0) return 'secondary';
    if (completed < 50) return 'destructive';
    if (completed < 150) return 'default';
    return 'default';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Utilisateur</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Date de début</TableHead>
            <TableHead>Dernière connexion</TableHead>
            <TableHead>Statut</TableHead>
            <TableHead>Chapitres complétés</TableHead>
            <TableHead>Jours complétés</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                Aucun utilisateur trouvé
              </TableCell>
            </TableRow>
          ) : (
            users.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell className="font-medium">
                  {user.full_name || 'Nom non défini'}
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.start_date ? new Date(user.start_date).toLocaleDateString('fr-FR') : 'Non définie'}
                </TableCell>
                <TableCell>
                  {formatLastLogin(user.last_login_at)}
                </TableCell>
                <TableCell>
                  <Badge variant={user.is_active ? 'default' : 'secondary'}>
                    {user.is_active ? 'Actif' : 'Inactif'}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getProgressBadgeColor(user.completed_chapters_count)}>
                    {user.completed_chapters_count}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={getProgressBadgeColor(user.total_days_completed)}>
                    {user.total_days_completed}/365
                  </Badge>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default UserStatsTable;
