
/**
 * Composant pour afficher les utilisateurs inactifs
 */

import React from 'react';
import { UserStats } from '@/types/supabase';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserX } from 'lucide-react';
import UserStatsTable from './UserStatsTable';

interface InactiveUsersCardProps {
  users: UserStats[];
  isLoading?: boolean;
  title?: string;
}

const InactiveUsersCard: React.FC<InactiveUsersCardProps> = ({ 
  users, 
  isLoading = false,
  title = "Utilisateurs inactifs"
}) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserX className="h-5 w-5 text-orange-500" />
          {title} ({users.length})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <UserStatsTable users={users} isLoading={isLoading} />
      </CardContent>
    </Card>
  );
};

export default InactiveUsersCard;
