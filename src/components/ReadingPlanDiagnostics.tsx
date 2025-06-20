
/**
 * Composant de diagnostic pour le plan de lecture
 * Affiche des informations détaillées sur l'état du cache et des données
 */

import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { useOptimizedAuth } from '@/hooks/useOptimizedAuth';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, Clock, Database } from 'lucide-react';

interface ReadingPlanDiagnosticsProps {
  dayNumber: number;
  visible: boolean;
}

const ReadingPlanDiagnostics: React.FC<ReadingPlanDiagnosticsProps> = ({ dayNumber, visible }) => {
  const { user } = useOptimizedAuth();
  const queryClient = useQueryClient();
  const [refreshTime, setRefreshTime] = useState<Date>(new Date());

  // Récupérer les informations du cache React Query
  const queryCache = queryClient.getQueryCache();
  const queries = queryCache.getAll();
  
  // Filtrer les requêtes pertinentes
  const relevantQueries = queries.filter(query => 
    query.queryKey.some(key => 
      typeof key === 'string' && (
        key.includes('reading-plan') || 
        key.includes('user-progress') ||
        key.includes('optimized-reading-plan')
      )
    )
  );

  const handleForceRefresh = () => {
    queryClient.invalidateQueries({
      queryKey: ['user-progress-optimized', user?.id, dayNumber],
      refetchType: 'active'
    });
    queryClient.invalidateQueries({
      queryKey: ['reading-plan-chapters', dayNumber],
      refetchType: 'active'
    });
    setRefreshTime(new Date());
  };

  if (!visible) return null;

  return (
    <Card className="bg-yellow-50 border-yellow-200 mt-4">
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <h3 className="font-semibold text-yellow-800">Diagnostics du Plan de Lecture</h3>
        </div>
        
        <div className="space-y-3 text-sm">
          {/* Informations générales */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Database className="h-4 w-4 text-blue-500" />
              <span>Jour: {dayNumber}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-green-500" />
              <span>Dernière vérif: {refreshTime.toLocaleTimeString()}</span>
            </div>
          </div>

          {/* État du cache React Query */}
          <div>
            <h4 className="font-medium text-gray-700 mb-2">Cache React Query</h4>
            <div className="space-y-1">
              {relevantQueries.map((query, index) => {
                const isStale = query.isStale();
                const isFetching = query.isFetching();
                const lastUpdated = query.state.dataUpdatedAt;
                
                return (
                  <div key={index} className="flex items-center gap-2 text-xs">
                    {isStale ? (
                      <AlertCircle className="h-3 w-3 text-orange-500" />
                    ) : (
                      <CheckCircle className="h-3 w-3 text-green-500" />
                    )}
                    <span className="font-mono text-xs">
                      {JSON.stringify(query.queryKey).substring(0, 50)}...
                    </span>
                    <span className={`px-1 rounded text-xs ${
                      isFetching ? 'bg-blue-100 text-blue-700' : 
                      isStale ? 'bg-orange-100 text-orange-700' : 
                      'bg-green-100 text-green-700'
                    }`}>
                      {isFetching ? 'Chargement' : isStale ? 'Obsolète' : 'Frais'}
                    </span>
                    {lastUpdated && (
                      <span className="text-gray-500">
                        {new Date(lastUpdated).toLocaleTimeString()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleForceRefresh}
              className="px-3 py-1 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
            >
              Forcer le rafraîchissement
            </button>
            <button
              onClick={() => {
                console.log('📊 [DEBUG] Query cache state:', {
                  totalQueries: queries.length,
                  relevantQueries: relevantQueries.length,
                  queries: relevantQueries.map(q => ({
                    key: q.queryKey,
                    stale: q.isStale(),
                    fetching: q.isFetching(),
                    lastUpdated: q.state.dataUpdatedAt
                  }))
                });
              }}
              className="px-3 py-1 bg-gray-500 text-white rounded text-xs hover:bg-gray-600"
            >
              Log vers Console
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ReadingPlanDiagnostics;
