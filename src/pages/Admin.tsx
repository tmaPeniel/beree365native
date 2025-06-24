
/**
 * Page d'administration
 * Accessible uniquement aux utilisateurs avec le rôle admin
 */

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import AdminRoute from '@/components/admin/AdminRoute';
import UserStatsTable from '@/components/admin/UserStatsTable';
import AdminStats from '@/components/admin/AdminStats';
import { getUserStats, getRecentlyActiveUsers } from '@/services/admin';
import { UserStats } from '@/types/supabase';
import NavBar from '@/components/NavBar';

const Admin = () => {
  const [activeTab, setActiveTab] = useState('overview');

  // Requête pour tous les utilisateurs
  const { 
    data: allUsers = [], 
    isLoading: allUsersLoading, 
    refetch: refetchAllUsers,
    error: allUsersError
  } = useQuery({
    queryKey: ['admin-all-users'],
    queryFn: getUserStats,
    staleTime: 30 * 1000, // 30 secondes
  });

  // Requête pour les utilisateurs actifs cette semaine
  const { 
    data: recentUsers = [], 
    isLoading: recentUsersLoading, 
    refetch: refetchRecentUsers,
    error: recentUsersError
  } = useQuery({
    queryKey: ['admin-recent-users'],
    queryFn: () => getRecentlyActiveUsers(7),
    staleTime: 30 * 1000, // 30 secondes
  });

  // Gestion des erreurs
  React.useEffect(() => {
    if (allUsersError) {
      console.error('Erreur lors du chargement des utilisateurs:', allUsersError);
      toast.error('Erreur lors du chargement des données utilisateur');
    }
  }, [allUsersError]);

  React.useEffect(() => {
    if (recentUsersError) {
      console.error('Erreur lors du chargement des utilisateurs récents:', recentUsersError);
      toast.error('Erreur lors du chargement des utilisateurs actifs');
    }
  }, [recentUsersError]);

  const handleRefresh = async () => {
    try {
      await Promise.all([refetchAllUsers(), refetchRecentUsers()]);
      toast.success('Données mises à jour');
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    }
  };

  return (
    <AdminRoute>
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* En-tête */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold">Administration</h1>
              <p className="text-gray-600">Gestion des utilisateurs et statistiques</p>
            </div>
            <Button onClick={handleRefresh} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Actualiser
            </Button>
          </div>

          {/* Statistiques générales */}
          <AdminStats users={allUsers} />

          {/* Onglets */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="all-users">Tous les utilisateurs</TabsTrigger>
              <TabsTrigger value="recent-users">Utilisateurs récents</TabsTrigger>
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
                  <UserStatsTable users={allUsers} isLoading={allUsersLoading} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recent-users" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Utilisateurs connectés cette semaine ({recentUsers.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <UserStatsTable users={recentUsers} isLoading={recentUsersLoading} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
        <NavBar />
      </div>
    </AdminRoute>
  );
};

export default Admin;
