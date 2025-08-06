
import React from 'react';
import { useProgressAnimation } from '@/hooks/useProgressAnimation';

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
  animate?: boolean;
  animationDelay?: number;
  isInitialLoad?: boolean;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 160,
  strokeWidth = 12,
  className = "",
  animate = true,
  animationDelay = 500,
  isInitialLoad = true,
}) => {
  const { animatedProgress } = useProgressAnimation({
    targetProgress: progress,
    duration: isInitialLoad ? 2000 : 0, // Animation seulement au chargement initial
    delay: isInitialLoad ? animationDelay : 0, // Délai seulement au chargement initial
    isInitialLoad
  });
  
  const displayProgress = (animate && isInitialLoad) ? animatedProgress : progress;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (displayProgress / 100) * circumference;
  
  return (
    <div className={`relative ${className} animate-scale-in`} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(0, 0, 0, 0.1)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-300 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center animate-fade-in" style={{ animationDelay: `${animationDelay + 800}ms` }}>
        <span className="text-3xl font-semibold transition-all duration-500 hover:scale-110">
          {Math.round(displayProgress)}%
        </span>
      </div>
    </div>
  );
};

export default CircularProgress;
