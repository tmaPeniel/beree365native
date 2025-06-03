

/**
 * Hook centralisé pour calculer le jour courant du plan de lecture
 * VERSION MISE À JOUR - utilise maintenant la base de données
 */
export const useCurrentDay = () => {
  console.log(`🔄 useCurrentDay - Utilisation de la version DB`);
  
  // Déléguer à la version DB
  const { currentDayNumber, isLoading, refreshCurrentDay } = useCurrentDayFromDB();
  
  console.log(`🎯 useCurrentDay - Jour retourné depuis DB: ${currentDayNumber}`);

  return { 
    currentDayNumber,
    isLoading,
    refreshCurrentDay 
  };
};
