/**
 * Page d'administration
 * Accessible uniquement aux utilisateurs avec le rôle admin
 * Optimisée pour mobile et desktop
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import AdminRoute from '@/components/admin/AdminRoute';
import UserStatsTable from '@/components/admin/UserStatsTable';
import AdminStats from '@/components/admin/AdminStats';
import InactiveUsersCard from '@/components/admin/InactiveUsersCard';
import { getUserStats, getRecentlyActiveUsers, getInactiveUsers, isCurrentUserAdmin } from '@/services/admin';
import { UserStats } from '@/types/supabase';
import NavBar from '@/components/NavBar';
import { useIsMobile } from '@/hooks/use-mobile';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const isMobile = useIsMobile();

  // Vérification du statut admin pour déboguer
  const { 
    data: isAdminStatus, 
    isLoading: adminCheckLoading 
  } = useQuery({
    queryKey: ['admin-status-check'],
    queryFn: isCurrentUserAdmin,
    staleTime: 60 * 1000, // 1 minute
  });

  // Requête pour tous les utilisateurs
  const { 
    data: allUsers = [], 
    isLoading: allUsersLoading, 
    refetch: refetchAllUsers,
    error: allUsersError,
    isError: allUsersIsError
  } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: getUserStats,
    staleTime: 30 * 1000, // 30 secondes
    enabled: isAdminStatus === true, // N'exécuter que si l'utilisateur est admin
    retry: (failureCount, error) => {
      console.error(`Tentative ${failureCount + 1} - Erreur getUserStats:`, error);
      return failureCount < 2; // Réessayer jusqu'à 2 fois
    }
  });

  // Requête pour les utilisateurs actifs cette semaine
  const { 
    data: recentUsers = [], 
    isLoading: recentUsersLoading, 
    refetch: refetchRecentUsers,
    error: recentUsersError,
    isError: recentUsersIsError
  } = useQuery({
    queryKey: ['admin-recent-users'],
    queryFn: () => getRecentlyActiveUsers(7),
    staleTime: 30 * 1000, // 30 secondes
    enabled: isAdminStatus === true && allUsers.length > 0, // Dépend des données des utilisateurs
  });

  // Requête pour les utilisateurs inactifs
  const { 
    data: inactiveUsers = [], 
    isLoading: inactiveUsersLoading, 
    refetch: refetchInactiveUsers,
    error: inactiveUsersError,
    isError: inactiveUsersIsError
  } = useQuery({
    queryKey: ['admin-inactive-users'],
    queryFn: () => getInactiveUsers(7),
    staleTime: 30 * 1000, // 30 secondes
    enabled: isAdminStatus === true && allUsers.length > 0, // Dépend des données des utilisateurs
  });

  // Gestion des erreurs avec plus de détails
  React.useEffect(() => {
    if (allUsersError) {
      console.error('Erreur détaillée lors du chargement des utilisateurs:', {
        error: allUsersError,
        message: allUsersError.message,
        stack: allUsersError.stack
      });
      toast.error(`Erreur lors du chargement des données utilisateur: ${allUsersError.message}`);
    }
  }, [allUsersError]);

  React.useEffect(() => {
    if (recentUsersError) {
      console.error('Erreur détaillée lors du chargement des utilisateurs récents:', {
        error: recentUsersError,
        message: recentUsersError.message,
        stack: recentUsersError.stack
      });
      toast.error(`Erreur lors du chargement des utilisateurs actifs: ${recentUsersError.message}`);
    }
  }, [recentUsersError]);

  // Log des données pour débogage
  React.useEffect(() => {
    console.log('État admin debug:', {
      isAdminStatus,
      adminCheckLoading,
      allUsersCount: allUsers.length,
      recentUsersCount: recentUsers.length,
      inactiveUsersCount: inactiveUsers.length,
      allUsersLoading,
      recentUsersLoading,
      inactiveUsersLoading,
      allUsersIsError,
      recentUsersIsError,
      inactiveUsersIsError
    });
  }, [isAdminStatus, adminCheckLoading, allUsers, recentUsers, inactiveUsers, allUsersLoading, recentUsersLoading, inactiveUsersLoading, allUsersIsError, recentUsersIsError, inactiveUsersIsError]);

  const handleRefresh = async () => {
    try {
      console.log('Actualisation des données admin...');
      await Promise.all([refetchAllUsers(), refetchRecentUsers(), refetchInactiveUsers()]);
      toast.success('Données mises à jour');
      console.log('Actualisation terminée avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'actualisation:', error);
      toast.error('Erreur lors de la mise à jour');
    }
  };

  // Fonction pour trier les utilisateurs par ordre alphabétique
  const sortUsersByName = (users: UserStats[]) => {
    return [...users].sort((a, b) => {
      const nameA = (a.full_name || 'Nom non défini').toLowerCase();
      const nameB = (b.full_name || 'Nom non défini').toLowerCase();
      return nameA.localeCompare(nameB);
    });
  };

  // Affichage d'erreur si problème de chargement critique
  if (allUsersIsError && !allUsersLoading) {
    return (
      <AdminRoute>
        <div className="min-h-screen bg-gray-50 p-3 md:p-6">
          <div className="max-w-7xl mx-auto">
            <Card className="border-red-200 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <AlertCircle className="h-5 w-5" />
                  Erreur de chargement des données
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-red-600 mb-4">
                  Impossible de charger les données utilisateur. Cela peut être dû à :
                </p>
                <ul className="list-disc list-inside text-red-600 mb-4 space-y-1">
                  <li>Un problème de permissions administrateur</li>
                  <li>Une erreur de base de données</li>
                  <li>Un problème de connexion</li>
                </ul>
                <div className="flex gap-2">
                  <Button onClick={handleRefresh} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Réessayer
                  </Button>
                </div>
                {allUsersError && (
                  <details className="mt-4">
                    <summary className="cursor-pointer text-sm font-medium">Détails de l'erreur</summary>
                    <pre className="mt-2 text-xs bg-red-100 p-2 rounded overflow-auto">
                      {JSON.stringify(allUsersError, null, 2)}
                    </pre>
                  </details>
                )}
              </CardContent>
            </Card>
          </div>
          <NavBar />
        </div>
      </AdminRoute>
    );
  }

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className={`max-w-7xl mx-auto ${isMobile ? 'p-3' : 'p-6'}`}>
          {/* En-tête */}
          <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'justify-between items-center'} mb-6`}>
            <div>
              <h1 className={`font-bold ${isMobile ? 'text-xl' : 'text-3xl'}`}>Administration</h1>
              <p className={`text-gray-600 ${isMobile ? 'text-sm' : ''}`}>
                Gestion des utilisateurs et statistiques
              </p>
            </div>
            <Button onClick={handleRefresh} variant="outline" size={isMobile ? "sm" : "sm"}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>

          {/* Statistiques générales */}
          <AdminStats users={allUsers} inactiveUsers={inactiveUsers} />

          {/* Onglets */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
              <TabsTrigger value="overview" className={isMobile ? 'text-xs' : ''}>
                {isMobile ? 'Vue' : 'Vue d\'ensemble'}
              </TabsTrigger>
              <TabsTrigger value="all-users" className={isMobile ? 'text-xs' : ''}>
                {isMobile ? 'Tous' : 'Tous les utilisateurs'}
              </TabsTrigger>
              <TabsTrigger value="recent-users" className={isMobile ? 'text-xs' : ''}>
                {isMobile ? 'Activités' : 'Activités d\'utilisateurs'}
              </TabsTrigger>
              <TabsTrigger value="inactive-users" className={isMobile ? 'text-xs' : ''}>
                {isMobile ? 'Inactifs' : 'Utilisateurs inactifs'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 lg:grid-cols-2 gap-6'}`}>
                <Card>
                  <CardHeader>
                    <CardTitle className={isMobile ? 'text-lg' : ''}>Utilisateurs les plus actifs</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <UserStatsTable 
                      users={allUsers
                        .filter(user => user.completed_chapters_count > 0)
                        .sort((a, b) => b.completed_chapters_count - a.completed_chapters_count)
                        .slice(0, 5)
                      } 
                      isLoading={allUsersLoading}
                    />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className={isMobile ? 'text-lg' : ''}>Dernières connexions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <UserStatsTable 
                      users={allUsers
                        .filter(user => user.last_login_at)
                        .sort((a, b) => {
                          const dateA = new Date(a.last_login_at || 0);
                          const dateB = new Date(b.last_login_at || 0);
                          return dateB.getTime() - dateA.getTime();
                        })
                        .slice(0, 5)
                      } 
                      isLoading={allUsersLoading}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="all-users" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle className={isMobile ? 'text-lg' : ''}>
                    Tous les utilisateurs ({allUsers.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <UserStatsTable users={sortUsersByName(allUsers)} isLoading={allUsersLoading} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recent-users" className="mt-6">
              <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'grid-cols-1 lg:grid-cols-2 gap-6'}`}>
                <Card>
                  <CardHeader>
                    <CardTitle className={isMobile ? 'text-lg' : ''}>
                      Utilisateurs connectés cette semaine ({recentUsers.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <UserStatsTable users={recentUsers} isLoading={recentUsersLoading} />
                  </CardContent>
                </Card>

                <InactiveUsersCard 
                  users={sortUsersByName(inactiveUsers)} 
                  isLoading={inactiveUsersLoading}
                  title="Utilisateurs inactifs depuis 1 semaine"
                />
              </div>
            </TabsContent>

            <TabsContent value="inactive-users" className="mt-6">
              <InactiveUsersCard 
                users={sortUsersByName(inactiveUsers)} 
                isLoading={inactiveUsersLoading}
                title={`Utilisateurs inactifs depuis 1 semaine (${inactiveUsers.length})`}
                showFullList={true}
              />
            </TabsContent>
          </Tabs>
        </div>
        <NavBar />
      </div>
    </AdminRoute>
  );
};

export default Admin;
