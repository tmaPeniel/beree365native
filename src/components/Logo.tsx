
import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'medium' }) => {
  const sizeClasses = {
    small: 'text-xl',
    medium: 'text-3xl',
    large: 'text-5xl',
  };
  
  return (
    <div className={`font-bold ${sizeClasses[size]} ${className}`}>
      <span className="text-foreground">Bérée</span>
      <span className="text-beree-500">365</span>
    </div>
  );
};

export default Logo;
