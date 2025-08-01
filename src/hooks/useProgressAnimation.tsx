import { useState, useEffect, useRef } from 'react';

interface UseProgressAnimationProps {
  targetProgress: number;
  duration?: number;
  delay?: number;
}

export const useProgressAnimation = ({ 
  targetProgress, 
  duration = 2000, 
  delay = 500 
}: UseProgressAnimationProps) => {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();

  useEffect(() => {
    // Réinitialiser pour une nouvelle animation
    setAnimatedProgress(0);
    setIsAnimating(false);

    const startAnimation = () => {
      setIsAnimating(true);
      startTimeRef.current = Date.now();

      const animate = () => {
        const elapsed = Date.now() - (startTimeRef.current || 0);
        const progress = Math.min(elapsed / duration, 1);
        
        // Fonction d'easing (ease-out)
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const currentProgress = easeOut * targetProgress;
        
        setAnimatedProgress(currentProgress);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setIsAnimating(false);
        }
      };

      animationRef.current = requestAnimationFrame(animate);
    };

    // Délai avant de commencer l'animation
    const timer = setTimeout(startAnimation, delay);

    return () => {
      clearTimeout(timer);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [targetProgress, duration, delay]);

  return { animatedProgress, isAnimating };
};