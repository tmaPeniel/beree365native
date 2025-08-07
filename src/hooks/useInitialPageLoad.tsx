import { useRef, useEffect } from 'react';

export const useInitialPageLoad = () => {
  const isInitialLoadRef = useRef(true);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // Ne s'exécute qu'une seule fois au premier mount
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      // Marquer comme non-initial après un court délai pour permettre l'animation initiale
      const timer = setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, []);

  return isInitialLoadRef.current;
};