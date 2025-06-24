
/**
 * Hook pour gérer le tri des tableaux
 */

import { useState, useMemo } from 'react';

export type SortDirection = 'asc' | 'desc' | null;

export interface SortConfig {
  key: string;
  direction: SortDirection;
}

export const useSortableTable = <T extends Record<string, any>>(
  data: T[],
  defaultSortKey?: string
) => {
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    key: defaultSortKey || '',
    direction: defaultSortKey ? 'asc' : null
  });

  const sortedData = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return data;
    }

    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];

      // Gérer les valeurs nulles
      if (aValue === null && bValue === null) return 0;
      if (aValue === null) return sortConfig.direction === 'asc' ? 1 : -1;
      if (bValue === null) return sortConfig.direction === 'asc' ? -1 : 1;

      // Tri pour les booléens
      if (typeof aValue === 'boolean' && typeof bValue === 'boolean') {
        if (aValue === bValue) return 0;
        const result = aValue ? 1 : -1;
        return sortConfig.direction === 'asc' ? result : -result;
      }

      // Tri pour les nombres
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        const result = aValue - bValue;
        return sortConfig.direction === 'asc' ? result : -result;
      }

      // Tri pour les dates
      if (aValue instanceof Date || bValue instanceof Date || 
          (typeof aValue === 'string' && !isNaN(Date.parse(aValue)))) {
        const dateA = new Date(aValue);
        const dateB = new Date(bValue);
        const result = dateA.getTime() - dateB.getTime();
        return sortConfig.direction === 'asc' ? result : -result;
      }

      // Tri pour les chaînes
      const stringA = String(aValue).toLowerCase();
      const stringB = String(bValue).toLowerCase();
      const result = stringA.localeCompare(stringB);
      return sortConfig.direction === 'asc' ? result : -result;
    });
  }, [data, sortConfig]);

  const requestSort = (key: string) => {
    let direction: SortDirection = 'asc';
    
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'asc') {
        direction = 'desc';
      } else if (sortConfig.direction === 'desc') {
        direction = null;
      } else {
        direction = 'asc';
      }
    }

    setSortConfig({ key, direction });
  };

  return {
    sortedData,
    sortConfig,
    requestSort
  };
};
