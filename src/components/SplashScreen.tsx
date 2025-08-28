import React from 'react';
import Logo from './Logo';

interface SplashScreenProps {
  isVisible: boolean;
  onComplete?: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ isVisible, onComplete }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-gradient-to-br from-background via-background to-beree-50/20">
      {/* Logo Animation */}
      <div className="animate-splash-logo">
        <Logo size="large" className="mb-8" />
      </div>
      
      {/* Subtle Progress Indicator */}
      <div className="w-24 h-1 bg-border rounded-full overflow-hidden">
        <div className="h-full bg-beree-500 animate-splash-progress rounded-full"></div>
      </div>
      
      {/* Loading Text */}
      <p className="mt-6 text-muted-foreground text-sm font-medium animate-fade-in-delayed">
        Parcours la Bible en un an
      </p>
    </div>
  );
};

export default SplashScreen;