
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
import { useSortableTable } from '@/hooks/useSortableTable';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface UserStatsTableProps {
  users: UserStats[];
  isLoading?: boolean;
}

interface SortableHeaderProps {
  children: React.ReactNode;
  sortKey: string;
  currentSort: { key: string; direction: 'asc' | 'desc' | null };
  onSort: (key: string) => void;
}

const SortableHeader: React.FC<SortableHeaderProps> = ({ 
  children, 
  sortKey, 
  currentSort, 
  onSort 
}) => {
  const getSortIcon = () => {
    if (currentSort.key !== sortKey || !currentSort.direction) {
      return <ChevronsUpDown className="h-4 w-4 ml-1" />;
    }
    return currentSort.direction === 'asc' 
      ? <ChevronUp className="h-4 w-4 ml-1" />
      : <ChevronDown className="h-4 w-4 ml-1" />;
  };

  return (
    <button
      className="flex items-center hover:bg-gray-50 px-2 py-1 rounded -mx-2 -my-1 transition-colors"
      onClick={() => onSort(sortKey)}
    >
      {children}
      {getSortIcon()}
    </button>
  );
};

const UserStatsTable: React.FC<UserStatsTableProps> = ({ users, isLoading }) => {
  const { sortedData, sortConfig, requestSort } = useSortableTable(users, 'full_name');

  // Calculer le nombre total de chapitres dans le plan de lecture (365 jours × ~3 chapitres par jour)
  // On utilise une estimation de 1095 chapitres au total (365 × 3)
  const TOTAL_CHAPTERS = 1095;

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

  const calculateChaptersPercentage = (completedChapters: number) => {
    return Math.round((completedChapters / TOTAL_CHAPTERS) * 100);
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
            <TableHead>
              <SortableHeader 
                sortKey="full_name" 
                currentSort={sortConfig} 
                onSort={requestSort}
              >
                Utilisateur
              </SortableHeader>
            </TableHead>
            
            <TableHead>
              <SortableHeader 
                sortKey="last_login_at" 
                currentSort={sortConfig} 
                onSort={requestSort}
              >
                Dernière connexion
              </SortableHeader>
            </TableHead>
            
            <TableHead>
              <SortableHeader 
                sortKey="is_active" 
                currentSort={sortConfig} 
                onSort={requestSort}
              >
                Statut
              </SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader 
                sortKey="completed_chapters_count" 
                currentSort={sortConfig} 
                onSort={requestSort}
              >
                Chapitres complétés
              </SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader 
                sortKey="total_days_completed" 
                currentSort={sortConfig} 
                onSort={requestSort}
              >
                Jours complétés
              </SortableHeader>
            </TableHead>

            <TableHead>
              <SortableHeader 
                sortKey="email" 
                currentSort={sortConfig} 
                onSort={requestSort}
              >
                Email
              </SortableHeader>
            </TableHead>
            
            <TableHead>
              <SortableHeader 
                sortKey="start_date" 
                currentSort={sortConfig} 
                onSort={requestSort}
              >
                Date de début
              </SortableHeader>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                Aucun utilisateur trouvé
              </TableCell>
            </TableRow>
          ) : (
            sortedData.map((user) => (
              <TableRow key={user.user_id}>
                <TableCell className="font-medium">
                  {user.full_name || 'Nom non défini'}
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
                  <div className="flex flex-col gap-1">
                    <Badge variant={getProgressBadgeColor(user.completed_chapters_count)}>
                      {user.completed_chapters_count}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {calculateChaptersPercentage(user.completed_chapters_count)}% du plan
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Badge variant={getProgressBadgeColor(user.total_days_completed)}>
                      {user.total_days_completed}/365
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {Math.round((user.total_days_completed / 365) * 100)}%
                    </span>
                  </div>
                </TableCell>
                <TableCell>{user.email}</TableCell>
                <TableCell>
                  {user.start_date ? new Date(user.start_date).toLocaleDateString('fr-FR') : 'Non définie'}
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
