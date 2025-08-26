import { useState, useEffect } from 'react';

const SPLASH_DURATION = 3000; // 2 seconds

export const useSplashScreen = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Always show splash screen for the specified duration
    const timer = setTimeout(() => {
      setIsVisible(false);
      setIsComplete(true);
    }, SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, []);

  return {
    isVisible,
    isComplete
  };
};