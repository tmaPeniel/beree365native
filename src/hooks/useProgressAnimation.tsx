import { useState, useEffect, useRef } from 'react';

interface UseProgressAnimationProps {
  targetProgress: number;
  duration?: number;
  delay?: number;
  isInitialLoad?: boolean;
}

export const useProgressAnimation = ({ 
  targetProgress, 
  duration = 2000, 
  delay = 500,
  isInitialLoad = true 
}: UseProgressAnimationProps) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const previousProgressRef = useRef(0);

  useEffect(() => {
    const startValue = isInitialLoad ? 0 : previousProgressRef.current;
    
    // Pour les mises à jour non-initiales, commencer à la valeur précédente
    if (!isInitialLoad) {
      setAnimatedProgress(startValue);
    } else {
      setAnimatedProgress(0);
    }
    
    setIsAnimating(false);

    const startAnimation = () => {
      setIsAnimating(true);
      startTimeRef.current = Date.now();

      const animate = () => {
        const elapsed = Date.now() - (startTimeRef.current || 0);
        const progress = Math.min(elapsed / duration, 1);
        
        // Fonction d'easing (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentProgress = startValue + (easeOut * (targetProgress - startValue));
        
        setAnimatedProgress(currentProgress);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
          previousProgressRef.current = targetProgress;
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    };

    // Délai avant de commencer l'animation (plus court pour les mises à jour)
    const animationDelay = isInitialLoad ? delay : 100;
    const timer = setTimeout(startAnimation, animationDelay);

    return () => {
      clearTimeout(timer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetProgress, duration, delay, isInitialLoad]);

  return { animatedProgress, isAnimating };
};