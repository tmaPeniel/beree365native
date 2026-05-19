import React from 'react';
import logoImage from '@/assets/beree-logo.png';

interface LogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

const Logo: React.FC<LogoProps> = ({ className = '', size = 'medium' }) => {
  const sizeClasses = {
    small: 'h-10',
    medium: 'h-16',
    large: 'h-28',
  };

  return (
    <img
      src={logoImage}
      alt="Bérée"
      className={`${sizeClasses[size]} w-auto object-contain mx-auto ${className}`}
    />
  );
};

export default Logo;
