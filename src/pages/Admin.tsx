
/**
 * Page d'administration
 * Accessible uniquement aux utilisateurs avec le rôle admin
 */

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import AdminRoute from '@/components/admin/AdminRoute';
import UserStatsTable from '@/components/admin/UserStatsTable';
import AdminStats from '@/components/admin/AdminStats';
import InactiveUsersCard from '@/components/admin/InactiveUsersCard';
import { getUserStats, isCurrentUserAdmin } from '@/services/admin';
import { UserStats } from '@/types/supabase';
import NavBar from '@/components/NavBar';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const queryClient = useQueryClient();

  // Vérification du statut admin
  const { 
    data: isAdminStatus, 
    isLoading: adminCheckLoading 
  } = useQuery({
    queryKey: ['admin-status-check'],
    queryFn: isCurrentUserAdmin,
    staleTime: 60 * 1000, // 1 minute
  });

  // Requête principale pour tous les utilisateurs
  const { 
    data: allUsers = [], 
    isLoading: allUsersLoading, 
    refetch: refetchAllUsers,
    error: allUsersError,
    isError: allUsersIsError
  } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: getUserStats,
    staleTime: 2 * 1000, // 10 secondes
    refetchOnWindowFocus: false,
    enabled: isAdminStatus === true,
    retry: (failureCount, error) => {
      console.error(`Tentative ${failureCount + 1} - Erreur getUserStats:`, error);
      return failureCount < 2;
    }
  });

  // Calcul des utilisateurs récents et inactifs avec useMemo
  const recentUsers = useMemo(() => {
    return allUsers.filter(user => user.is_active);
  }, [allUsers]);

  const inactiveUsers = useMemo(() => {
    return allUsers.filter(user => !user.is_active);
  }, [allUsers]);

  // Gestion des erreurs
  React.useEffect(() => {
    if (allUsersError) {
      console.error('Erreur lors du chargement des utilisateurs:', allUsersError);
      toast.error(`Erreur lors du chargement des données utilisateur: ${allUsersError.message}`);
    }
  }, [allUsersError]);

  // Log des données pour débogage
  React.useEffect(() => {
    console.log('État admin debug:', {
      isAdminStatus,
      adminCheckLoading,
      allUsersCount: allUsers.length,
      recentUsersCount: recentUsers.length,
      inactiveUsersCount: inactiveUsers.length,
      allUsersLoading,
      allUsersIsError
    });
  }, [isAdminStatus, adminCheckLoading, allUsers, recentUsers, inactiveUsers, allUsersLoading, allUsersIsError]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      console.log('Actualisation des données admin...');
      // Invalider le cache pour forcer une nouvelle requête
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
      // Refetch uniquement les données principales
      await refetchAllUsers();
      toast.success('Données mises à jour');
      console.log('Actualisation terminée avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'actualisation:', error);
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setIsRefreshing(false);
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
        <div className="min-h-screen bg-gray-50 p-6">
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
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* En-tête */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Administration</h1>
              <p className="text-gray-600">
                Gestion des utilisateurs et statistiques
              </p>
            </div>
            <Button 
              onClick={handleRefresh} 
              variant="outline" 
              size="sm"
              disabled={isRefreshing || allUsersLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Actualisation...' : 'Actualiser'}
            </Button>
          </div>

          {/* Statistiques générales */}
          <AdminStats users={allUsers} inactiveUsers={inactiveUsers} />

          {/* Onglets */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 sm:h-10 h-auto">
              <TabsTrigger 
                value="overview" 
                className="sm:inline-flex sm:items-center sm:justify-center sm:whitespace-nowrap sm:px-3 sm:py-1.5 flex flex-col items-center justify-center py-3 px-2 h-auto text-center leading-tight"
              >
                <span className="sm:hidden text-xs">Vue</span>
                <span className="sm:hidden text-xs">d'ensemble</span>
                <span className="hidden sm:inline">Vue d'ensemble</span>
              </TabsTrigger>
              <TabsTrigger 
                value="all-users" 
                className="sm:inline-flex sm:items-center sm:justify-center sm:whitespace-nowrap sm:px-3 sm:py-1.5 flex flex-col items-center justify-center py-3 px-2 h-auto text-center leading-tight"
              >
                <span className="sm:hidden text-xs">Tous les</span>
                <span className="sm:hidden text-xs">utilisateurs</span>
                <span className="hidden sm:inline">Tous les utilisateurs</span>
              </TabsTrigger>
              <TabsTrigger 
                value="recent-users" 
                className="sm:inline-flex sm:items-center sm:justify-center sm:whitespace-nowrap sm:px-3 sm:py-1.5 flex flex-col items-center justify-center py-3 px-2 h-auto text-center leading-tight"
              >
                <span className="sm:hidden text-xs">Activités</span>
                <span className="sm:hidden text-xs">d'utilisateurs</span>
                <span className="hidden sm:inline">Activités d'utilisateurs</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Utilisateurs les plus actifs</CardTitle>
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
                    <CardTitle>Dernières connexions</CardTitle>
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
                  <CardTitle>Tous les utilisateurs ({allUsers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <UserStatsTable users={sortUsersByName(allUsers)} isLoading={allUsersLoading} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recent-users" className="mt-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Utilisateurs connectés cette semaine ({recentUsers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <UserStatsTable users={recentUsers} isLoading={allUsersLoading} />
                </CardContent>
              </Card>

              <InactiveUsersCard 
                users={sortUsersByName(inactiveUsers)} 
                isLoading={allUsersLoading}
                title="Utilisateurs inactifs depuis 1 semaine"
              />
              </div>
            </TabsContent>
          </Tabs>
        </div>
        <NavBar />
      </div>
    </AdminRoute>
  );
};

export default Admin;
