import { useState, useEffect } from 'react';

const SPLASH_DURATION = 2500; // 2.5 seconds
const SPLASH_SESSION_KEY = 'splash-shown-session';

export const useSplashScreen = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    // Check if splash was already shown in this session
    const sessionId = sessionStorage.getItem('app-session-id');
    const splashShown = sessionStorage.getItem(SPLASH_SESSION_KEY);
    
    // Generate new session ID if none exists
    if (!sessionId) {
      const newSessionId = Date.now().toString();
      sessionStorage.setItem('app-session-id', newSessionId);
    }
    
    // If splash was already shown in this session, skip it
    if (splashShown === sessionId) {
      setIsVisible(false);
      setIsComplete(true);
      return;
    }

    // Show splash screen for the specified duration
    const timer = setTimeout(() => {
      setIsVisible(false);
      setIsComplete(true);
      
      // Mark splash as shown for this session
      const currentSessionId = sessionStorage.getItem('app-session-id');
      if (currentSessionId) {
        sessionStorage.setItem(SPLASH_SESSION_KEY, currentSessionId);
      }
    }, SPLASH_DURATION);

    return () => clearTimeout(timer);
  }, []);

  return {
    isVisible,
    isComplete
  };
};