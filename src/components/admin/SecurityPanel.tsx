
/**
 * Panneau de sécurité pour l'administration
 * Permet de gérer les aspects sécuritaires du système
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, UserCheck, AlertTriangle, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { assignMissingUserRoles, getUsersWithoutRoles } from '@/services/admin';

const SecurityPanel: React.FC = () => {
  const queryClient = useQueryClient();

  // Vérifier le nombre d'utilisateurs sans rôle
  const { 
    data: usersWithoutRoles = 0, 
    isLoading: checkingRoles,
    refetch: refetchUsersWithoutRoles
  } = useQuery({
    queryKey: ['users-without-roles'],
    queryFn: getUsersWithoutRoles,
    staleTime: 30 * 1000, // 30 secondes
  });

  // Mutation pour assigner les rôles manquants
  const assignRolesMutation = useMutation({
    mutationFn: assignMissingUserRoles,
    onSuccess: (assignedCount) => {
      toast.success(`${assignedCount} utilisateur(s) ont reçu leur rôle par défaut`);
      queryClient.invalidateQueries({ queryKey: ['users-without-roles'] });
      queryClient.invalidateQueries({ queryKey: ['admin-all-users'] });
    },
    onError: (error) => {
      console.error('Erreur lors de l\'assignation des rôles:', error);
      toast.error('Erreur lors de l\'assignation des rôles');
    }
  });

  const handleAssignMissingRoles = () => {
    assignRolesMutation.mutate();
  };

  const handleRefreshCheck = () => {
    refetchUsersWithoutRoles();
  };

  const getSecurityStatus = () => {
    if (checkingRoles) return { status: 'checking', color: 'secondary' as const };
    if (usersWithoutRoles > 0) return { status: 'warning', color: 'destructive' as const };
    return { status: 'secure', color: 'default' as const };
  };

  const securityStatus = getSecurityStatus();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Panneau de sécurité
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Statut de sécurité général */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-medium">Statut de sécurité :</span>
            <Badge variant={securityStatus.color}>
              {securityStatus.status === 'checking' && 'Vérification...'}
              {securityStatus.status === 'warning' && 'Attention requise'}
              {securityStatus.status === 'secure' && 'Sécurisé'}
            </Badge>
          </div>
          <Button 
            onClick={handleRefreshCheck} 
            variant="outline" 
            size="sm"
            disabled={checkingRoles}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${checkingRoles ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
        </div>

        {/* Alerte pour utilisateurs sans rôle */}
        {usersWithoutRoles > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>{usersWithoutRoles} utilisateur(s)</strong> n'ont pas de rôle assigné. 
              Cela peut causer des problèmes d'accès.
            </AlertDescription>
          </Alert>
        )}

        {/* Actions de sécurité */}
        <div className="space-y-3">
          <h4 className="font-medium">Actions de sécurité</h4>
          
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <UserCheck className="h-4 w-4 text-blue-500" />
              <div>
                <p className="font-medium text-sm">Assigner les rôles manquants</p>
                <p className="text-xs text-gray-500">
                  Attribue automatiquement le rôle 'user' aux utilisateurs sans rôle
                </p>
              </div>
            </div>
            <Button 
              onClick={handleAssignMissingRoles}
              disabled={assignRolesMutation.isPending || usersWithoutRoles === 0}
              variant={usersWithoutRoles > 0 ? "default" : "outline"}
              size="sm"
            >
              {assignRolesMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Assignation...
                </>
              ) : (
                'Assigner les rôles'
              )}
            </Button>
          </div>
        </div>

        {/* Informations sur la sécurité */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>• Toutes les tables sont protégées par Row Level Security (RLS)</p>
          <p>• Les actions administrateur sont automatiquement loggées</p>
          <p>• Les utilisateurs ne peuvent accéder qu'à leurs propres données</p>
        </div>
      </CardContent>
    </Card>
  );
};

export default SecurityPanel;
