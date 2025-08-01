import React, { useEffect, useState } from 'react';
import { Sparkles, Star, Award } from 'lucide-react';

interface CelebrationEffectsProps {
  trigger: boolean;
  type?: 'day-complete' | 'badge-unlock' | 'progress-milestone';
  onComplete?: () => void;
}

const CelebrationEffects: React.FC<CelebrationEffectsProps> = ({ 
  trigger, 
  type = 'day-complete',
  onComplete 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number; delay: number }[]>([]);

  useEffect(() => {
    if (trigger) {
      setIsVisible(true);
      
      // Générer des particules aléatoirement
      const newParticles = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 0.5
      }));
      setParticles(newParticles);

      // Nettoyer après l'animation
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete]);

  if (!isVisible) return null;

  const getIcon = () => {
    switch (type) {
      case 'badge-unlock':
        return Award;
      case 'progress-milestone':
        return Star;
      default:
        return Sparkles;
    }
  };

  const Icon = getIcon();

  return (
    <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
      {/* Animation principale */}
      <div className="relative">
        <Icon 
          size={64} 
          className="text-yellow-400 animate-tada"
        />
        
        {/* Particules dispersées */}
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-confetti-pop"
            style={{
              left: `${particle.x}%`,
              top: `${particle.y}%`,
              animationDelay: `${particle.delay}s`
            }}
          />
        ))}
      </div>

      {/* Message de félicitations */}
      <div className="absolute bottom-1/3 left-1/2 transform -translate-x-1/2 animate-slide-up">
        <div className="bg-white/90 backdrop-blur-sm rounded-lg px-6 py-3 shadow-lg">
          <p className="text-green-600 font-semibold text-center">
            {type === 'day-complete' && '🎉 Jour terminé !'}
            {type === 'badge-unlock' && '🏆 Nouveau badge !'}
            {type === 'progress-milestone' && '⭐ Excellent progrès !'}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CelebrationEffects;