
/**
 * Configuration centralisée du QueryClient pour React Query
 * Permet l'import et l'utilisation du même client dans toute l'application
 */

import { QueryClient } from "@tanstack/react-query";

/**
 * Instance unique du QueryClient avec configuration optimisée
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
