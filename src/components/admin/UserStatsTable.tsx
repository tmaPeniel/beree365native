/**
 * Tableau des statistiques utilisateurs pour l'administration
 */

import React, { useState } from 'react';
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
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { formatDistanceToNow, format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { useSortableTable } from '@/hooks/useSortableTable';
import { ChevronUp, ChevronDown, ChevronsUpDown, Crown } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { grantPremium, revokePremium } from '@/services/admin/premium';
import { toast } from 'sonner';

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

const SortableHeader: React.FC<SortableHeaderProps> = ({ children, sortKey, currentSort, onSort }) => {
  const getSortIcon = () => {
    if (currentSort.key !== sortKey || !currentSort.direction) return <ChevronsUpDown className="h-4 w-4 ml-1" />;
    return currentSort.direction === 'asc'
      ? <ChevronUp className="h-4 w-4 ml-1" />
      : <ChevronDown className="h-4 w-4 ml-1" />;
  };
  return (
    <button
      className="flex items-center hover:bg-muted px-2 py-1 rounded -mx-2 -my-1 transition-colors"
      onClick={() => onSort(sortKey)}
    >
      {children}
      {getSortIcon()}
    </button>
  );
};

const PremiumActions: React.FC<{ user: UserStats }> = ({ user }) => {
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();

  const refetch = () => queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });

  const handleGrant = async () => {
    setBusy(true);
    try {
      await grantPremium(user.user_id, 12, 'manuel_beree');
      toast.success(`Premium activé pour ${user.full_name || user.email}`);
      refetch();
    } catch (e: any) {
      toast.error(e?.message || 'Échec activation Premium');
    } finally { setBusy(false); }
  };

  const handleRevoke = async () => {
    setBusy(true);
    try {
      await revokePremium(user.user_id);
      toast.success(`Premium retiré pour ${user.full_name || user.email}`);
      refetch();
    } catch (e: any) {
      toast.error(e?.message || 'Échec retrait Premium');
    } finally { setBusy(false); }
  };

  if (user.is_premium) {
    return (
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button size="sm" variant="outline" disabled={busy}>Retirer</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Retirer le Premium ?</AlertDialogTitle>
            <AlertDialogDescription>
              L'utilisateur perdra immédiatement l'accès aux notifications, badges et plans supplémentaires.
              Son plan sera remis sur le canonique 12 mois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={handleRevoke} className="bg-destructive text-destructive-foreground">
              Retirer Premium
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    );
  }
  return (
    <Button size="sm" onClick={handleGrant} disabled={busy}>
      <Crown className="h-3 w-3 mr-1" />
      Activer 12 mois
    </Button>
  );
};

const UserStatsTable: React.FC<UserStatsTableProps> = ({ users, isLoading }) => {
  const { sortedData, sortConfig, requestSort } = useSortableTable(users, 'full_name');

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return 'Jamais connecté';
    try { return formatDistanceToNow(new Date(lastLogin), { addSuffix: true, locale: fr }); }
    catch { return 'Date invalide'; }
  };

  const getProgressBadgeColor = (completed: number) => {
    if (completed === 0) return 'secondary';
    if (completed < 50) return 'destructive';
    return 'default';
  };

  const calculateReadingPlanPercentage = (completedChapters: number) => {
    const totalChaptersInPlan = 1133;
    return Math.min(Math.round((completedChapters / totalChaptersInPlan) * 100), 100);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="rounded-md border overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>
              <SortableHeader sortKey="full_name" currentSort={sortConfig} onSort={requestSort}>Utilisateur</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader sortKey="is_premium" currentSort={sortConfig} onSort={requestSort}>Premium</SortableHeader>
            </TableHead>
            <TableHead>Période Premium</TableHead>
            <TableHead>Actions</TableHead>
            <TableHead>
              <SortableHeader sortKey="last_login_at" currentSort={sortConfig} onSort={requestSort}>Dernière connexion</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader sortKey="is_active" currentSort={sortConfig} onSort={requestSort}>Statut</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader sortKey="completed_chapters_count" currentSort={sortConfig} onSort={requestSort}>Chapitres</SortableHeader>
            </TableHead>
            <TableHead>Progression</TableHead>
            <TableHead>
              <SortableHeader sortKey="total_days_completed" currentSort={sortConfig} onSort={requestSort}>Jours</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader sortKey="email" currentSort={sortConfig} onSort={requestSort}>Email</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader sortKey="start_date" currentSort={sortConfig} onSort={requestSort}>Date début</SortableHeader>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedData.length === 0 ? (
            <TableRow>
              <TableCell colSpan={11} className="text-center py-8 text-muted-foreground">
                Aucun utilisateur trouvé
              </TableCell>
            </TableRow>
          ) : (
            sortedData.map((user) => {
              const progressPercentage = calculateReadingPlanPercentage(user.completed_chapters_count);
              return (
                <TableRow key={user.user_id}>
                  <TableCell className="font-medium">{user.full_name || 'Nom non défini'}</TableCell>
                  <TableCell>
                    {user.is_premium ? (
                      <Badge className="bg-gradient-to-r from-primary to-accent text-primary-foreground">
                        <Crown className="h-3 w-3 mr-1" />
                        Premium
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Gratuit</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {user.is_premium && user.premium_start_date && user.premium_end_date ? (
                      <>
                        {format(new Date(user.premium_start_date), 'dd/MM/yy', { locale: fr })}
                        {' → '}
                        {format(new Date(user.premium_end_date), 'dd/MM/yy', { locale: fr })}
                      </>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <PremiumActions user={user} />
                  </TableCell>
                  <TableCell>{formatLastLogin(user.last_login_at)}</TableCell>
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
                  <TableCell><Badge variant="default">{progressPercentage}%</Badge></TableCell>
                  <TableCell>
                    <Badge variant={getProgressBadgeColor(user.total_days_completed)}>
                      {user.total_days_completed}/365
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs">{user.email}</TableCell>
                  <TableCell>
                    {user.start_date ? new Date(user.start_date).toLocaleDateString('fr-FR') : '—'}
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default UserStatsTable;
