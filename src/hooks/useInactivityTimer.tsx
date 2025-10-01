
import { useState, useEffect, useCallback, useRef } from 'react';

interface UseInactivityTimerProps {
  timeout?: number; // en millisecondes, par défaut 30 minutes
  warningTime?: number; // en millisecondes, par défaut 2 minutes avant timeout
  onWarning?: () => void;
  onTimeout?: () => void;
  enabled?: boolean;
}

export const useInactivityTimer = ({
  timeout = 30 * 60 * 1000, // 30 minutes par défaut
  warningTime = 2 * 60 * 1000, // 2 minutes avant timeout
  onWarning,
  onTimeout,
  enabled = true
}: UseInactivityTimerProps) => {
  const [isWarningActive, setIsWarningActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const warningTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  
  // Événements à surveiller pour détecter l'activité utilisateur
  const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];

  const clearAllTimers = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    if (warningTimeoutRef.current) {
      clearTimeout(warningTimeoutRef.current);
      warningTimeoutRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const startCountdown = useCallback(() => {
    let remaining = warningTime;
    setTimeLeft(remaining);
    
    countdownRef.current = setInterval(() => {
      remaining -= 1000;
      setTimeLeft(remaining);
      
      if (remaining <= 0) {
        clearInterval(countdownRef.current!);
        countdownRef.current = null;
      }
    }, 1000);
  }, [warningTime]);

  const resetTimer = useCallback(() => {
    clearAllTimers();
    setIsWarningActive(false);
    setTimeLeft(0);

    if (!enabled) return;

    // Timer pour l'avertissement
    warningTimeoutRef.current = setTimeout(() => {
      setIsWarningActive(true);
      startCountdown();
      onWarning?.();
    }, timeout - warningTime);

    // Timer pour la déconnexion automatique
    timeoutRef.current = setTimeout(() => {
      clearAllTimers();
      setIsWarningActive(false);
      onTimeout?.();
    }, timeout);
  }, [enabled, timeout, warningTime, onWarning, onTimeout, clearAllTimers, startCountdown]);

  const extendSession = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  const forceLogout = useCallback(() => {
    clearAllTimers();
    setIsWarningActive(false);
    onTimeout?.();
  }, [clearAllTimers, onTimeout]);

  // Gestionnaire d'événements pour détecter l'activité
  const handleActivity = useCallback(() => {
    if (!isWarningActive) {
      resetTimer();
    }
  }, [resetTimer, isWarningActive]);

  // Configuration des écouteurs d'événements
  useEffect(() => {
    if (!enabled) {
      clearAllTimers();
      setIsWarningActive(false);
      return;
    }

    // Démarrer le timer initialement
    resetTimer();

    // Ajouter les écouteurs d'événements
    events.forEach((event) => {
      document.addEventListener(event, handleActivity, true);
    });

    // Nettoyage
    return () => {
      clearAllTimers();
      events.forEach((event) => {
        document.removeEventListener(event, handleActivity, true);
      });
    };
  }, [enabled, handleActivity, resetTimer, clearAllTimers]);

  // Nettoyage lors du démontage
  useEffect(() => {
    return () => {
      clearAllTimers();
    };
  }, [clearAllTimers]);

  return {
    isWarningActive,
    timeLeft,
    extendSession,
    forceLogout,
    resetTimer
  };
};
