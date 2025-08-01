
import React from 'react';

interface CircularProgressProps {
  progress: number; // 0-100
  size?: number;
  strokeWidth?: number;
  className?: string;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  progress,
  size = 160,
  strokeWidth = 12,
  className = "",
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
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
          className="transition-all duration-1000 ease-out"
          style={{ 
            animationDelay: '0.5s',
            strokeDashoffset: progress === 0 ? circumference : strokeDashoffset
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center animate-fade-in" style={{ animationDelay: '0.8s' }}>
        <span className="text-3xl font-semibold transition-all duration-500 hover:scale-110">
          {Math.round(progress)}%
        </span>
      </div>
    </div>
  );
};

export default CircularProgress;
