import React, { useEffect, useState } from 'react';
import { Sparkles, Star, Award, CheckCircle, Trophy, Crown, Zap } from 'lucide-react';

interface CelebrationEffectsProps {
  trigger: boolean;
  type?: 'day-complete' | 'badge-unlock' | 'progress-milestone';
  onComplete?: () => void;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  delay: number;
  size: number;
  color: string;
  rotation: number;
}

const CelebrationEffects: React.FC<CelebrationEffectsProps> = ({ 
  trigger, 
  type = 'day-complete',
  onComplete 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [phase, setPhase] = useState<'burst' | 'confetti' | 'fade'>('burst');

  useEffect(() => {
    if (trigger) {
      setIsVisible(true);
      setPhase('burst');
      
      // Générer plus de particules avec variations
      const particleCount = type === 'badge-unlock' ? 20 : 15;
      const colors = type === 'badge-unlock' 
        ? ['#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#45B7D1']
        : ['#34A853', '#4CAF50', '#8BC34A', '#CDDC39', '#FFC107'];
      
      const newParticles = Array.from({ length: particleCount }, (_, i) => ({
        id: i,
        x: 50 + (Math.random() - 0.5) * 80, // Centré avec spread
        y: 50 + (Math.random() - 0.5) * 80,
        delay: Math.random() * 0.8,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * 360
      }));
      setParticles(newParticles);

      // Phases d'animation
      setTimeout(() => setPhase('confetti'), 400);
      setTimeout(() => setPhase('fade'), 1600);

      // Nettoyer après l'animation
      const timer = setTimeout(() => {
        setIsVisible(false);
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [trigger, onComplete, type]);

  if (!isVisible) return null;

  const getIconAndColors = () => {
    switch (type) {
      case 'badge-unlock':
        return { 
          icon: Trophy, 
          iconColor: 'text-yellow-500',
          glowColor: 'shadow-yellow-500/50',
          bgGradient: 'from-yellow-400 to-orange-500'
        };
      case 'progress-milestone':
        return { 
          icon: Star, 
          iconColor: 'text-blue-500',
          glowColor: 'shadow-blue-500/50',
          bgGradient: 'from-blue-400 to-purple-500'
        };
      default:
        return { 
          icon: CheckCircle, 
          iconColor: 'text-green-500',
          glowColor: 'shadow-green-500/50',
          bgGradient: 'from-green-400 to-emerald-500'
        };
    }
  };

  const { icon: Icon, iconColor, glowColor, bgGradient } = getIconAndColors();

  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {/* Background overlay avec effet de pulse */}
      <div className={`absolute inset-0 bg-gradient-to-r ${bgGradient} opacity-10 animate-pulse`} />
      
      {/* Cercles concentriques d'expansion */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`w-32 h-32 rounded-full border-4 border-current ${iconColor} animate-ping opacity-20`} />
        <div className={`absolute w-24 h-24 rounded-full border-2 border-current ${iconColor} animate-ping opacity-40`} style={{ animationDelay: '0.2s' }} />
        <div className={`absolute w-16 h-16 rounded-full border border-current ${iconColor} animate-ping opacity-60`} style={{ animationDelay: '0.4s' }} />
      </div>

      {/* Icône principale avec effet spectaculaire */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className={`relative p-6 rounded-full bg-white shadow-2xl ${glowColor} animate-bounce-gentle`}>
          <Icon 
            size={80} 
            className={`${iconColor} animate-tada drop-shadow-lg`}
          />
          
          {/* Éclat autour de l'icône */}
          <div className={`absolute inset-0 rounded-full bg-gradient-to-r ${bgGradient} opacity-20 animate-pulse`} />
        </div>
      </div>

      {/* Particules explosives */}
      <div className="absolute inset-0 flex items-center justify-center">
        {particles.map((particle) => {
          const isLargeParticle = particle.size > 8;
          return (
            <div key={particle.id} className="absolute">
              {isLargeParticle ? (
                <div
                  className="absolute animate-confetti-pop"
                  style={{
                    left: `${particle.x}%`,
                    top: `${particle.y}%`,
                    animationDelay: `${particle.delay}s`,
                    transform: `rotate(${particle.rotation}deg)`
                  }}
                >
                  {type === 'badge-unlock' ? (
                    <Crown size={particle.size} style={{ color: particle.color }} />
                  ) : (
                    <Sparkles size={particle.size} style={{ color: particle.color }} />
                  )}
                </div>
              ) : (
                <div
                  className="absolute rounded-full animate-confetti-pop shadow-lg"
                  style={{
                    left: `${particle.x}%`,
                    top: `${particle.y}%`,
                    width: `${particle.size}px`,
                    height: `${particle.size}px`,
                    backgroundColor: particle.color,
                    animationDelay: `${particle.delay}s`,
                    transform: `rotate(${particle.rotation}deg)`
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Étoiles qui scintillent */}
      {Array.from({ length: 6 }).map((_, i) => (
        <div 
          key={`star-${i}`}
          className="absolute animate-wiggle"
          style={{
            left: `${20 + i * 12}%`,
            top: `${15 + (i % 2) * 70}%`,
            animationDelay: `${i * 0.3}s`
          }}
        >
          <Star size={16} className={`${iconColor} opacity-70`} />
        </div>
      ))}

      {/* Message de félicitations avec animation améliorée */}
      <div className="absolute inset-x-0 bottom-1/3 flex justify-center">
        <div className="animate-slide-up" style={{ animationDelay: '0.5s' }}>
          <div className={`bg-white/95 backdrop-blur-sm rounded-2xl px-8 py-4 shadow-2xl ${glowColor} border border-white/20`}>
            <div className="text-center">
              <div className="text-2xl mb-1">
                {type === 'day-complete' && '🎉'}
                {type === 'badge-unlock' && '🏆'}
                {type === 'progress-milestone' && '⭐'}
              </div>
              <p className={`${iconColor.replace('text-', 'text-')} font-bold text-lg`}>
                {type === 'day-complete' && 'Jour terminé !'}
                {type === 'badge-unlock' && 'Nouveau badge !'}
                {type === 'progress-milestone' && 'Excellent progrès !'}
              </p>
              <p className="text-gray-600 text-sm mt-1">
                {type === 'day-complete' && 'Félicitations pour votre assiduité !'}
                {type === 'badge-unlock' && 'Vous avez débloqué une récompense !'}
                {type === 'progress-milestone' && 'Continuez sur cette lancée !'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CelebrationEffects;