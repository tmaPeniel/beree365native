
/**
 * Composant pour afficher les statistiques générales d'administration
 */

import React from 'react';
import { UserStats } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, BookOpen, Calendar, UserX } from 'lucide-react';

interface AdminStatsProps {
  users: UserStats[];
  inactiveUsers?: UserStats[];
}

const AdminStats: React.FC<AdminStatsProps> = ({ users, inactiveUsers = [] }) => {
  const totalUsers = users.length;
  const activeUsers = users.filter(user => user.is_active).length;
  const recentlyActiveUsers = users.filter(user => {
    if (!user.last_login_at) return false;
    const lastLogin = new Date(user.last_login_at);
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    return lastLogin >= sevenDaysAgo;
  }).length;
  
  const totalChaptersCompleted = users.reduce((sum, user) => sum + user.completed_chapters_count, 0);
  const averageProgress = totalUsers > 0 ? Math.round(totalChaptersCompleted / totalUsers) : 0;

  const stats = [
    {
      title: "Total des utilisateurs",
      value: totalUsers,
      icon: Users,
      description: "Utilisateurs inscrits"
    },
    {
      title: "Utilisateurs actifs",
      value: activeUsers,
      icon: UserCheck,
      description: "Actuellement connectés"
    },
    {
      title: "Actifs cette semaine",
      value: recentlyActiveUsers,
      icon: Calendar,
      description: "Connectés dans les 7 derniers jours"
    },
    {
      title: "Utilisateurs inactifs",
      value: inactiveUsers.length,
      icon: UserX,
      description: "Inactifs depuis 1 semaine",
      color: "text-orange-500"
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color || 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
            <p className="text-xs text-muted-foreground">
              {stat.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AdminStats;
