import { useRef, useEffect } from 'react';

export const useInitialPageLoad = (dependency?: any) => {
  const isInitialLoadRef = useRef(true);

  useEffect(() => {
    // Après le premier rendu, tous les changements suivants ne sont plus des chargements initiaux
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
    }
  }, [dependency]);

  return isInitialLoadRef.current;
};