import { useState, useEffect } from 'react';

const SPLASH_DURATION = 3000;

/**
 * Vérifie si l'URL contient un token de recovery ou signup
 * Ces URLs doivent bypasser le splash pour traiter le token immédiatement
 */
const isAuthCallbackUrl = () => {
  const hash = window.location.hash;
  return hash.includes('type=recovery') || hash.includes('type=signup');
};

export const useSplashScreen = () => {
  // Bypass le splash si c'est une URL de callback auth
  const shouldBypass = isAuthCallbackUrl();
  const [isVisible, setIsVisible] = useState(!shouldBypass);
  const [isComplete, setIsComplete] = useState(shouldBypass);

  useEffect(() => {
    // Si déjà complété (callback URL), ne rien faire
    if (isComplete) return;
    
    const timer = setTimeout(() => {
      setIsVisible(false);
      setIsComplete(true);
    }, SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, [isComplete]);

  return {
    isVisible,
    isComplete
  };
};
