import React, { useState, useRef, useCallback, useEffect } from 'react';
import { BookOpen, BarChart3, ArrowRight } from 'lucide-react';
import Logo from './Logo';
import { Button } from './ui/button';

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    icon: null, // Logo used instead
    title: 'Bienvenue sur Bérée 365',
    description: 'Parcourez la Bible en un an avec un plan de lecture adapté à votre rythme.',
    isLogo: true,
  },
  {
    icon: BookOpen,
    title: 'Votre plan de lecture',
    description: 'Choisissez parmi 4 plans adaptés : canonique ou chronologique, en 6 ou 12 mois.',
    isLogo: false,
  },
  {
    icon: BarChart3,
    title: 'Suivez votre progression',
    description: 'Débloquez des badges, consultez vos statistiques et découvrez un verset chaque jour.',
    isLogo: false,
  },
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [current, setCurrent] = useState(0);
  const touchStartX = useRef(0);
  const isLast = current === slides.length - 1;

  const next = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      setCurrent((c) => c + 1);
    }
  }, [isLast, onComplete]);

  const prev = useCallback(() => {
    setCurrent((c) => Math.max(0, c - 1));
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) next();
      else prev();
    }
  };

  const slide = slides[current];

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-background"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Skip button */}
      {!isLast && (
        <div className="flex justify-end p-4">
          <Button variant="ghost" size="sm" onClick={onComplete} className="text-muted-foreground">
            Passer
          </Button>
        </div>
      )}
      {isLast && <div className="p-4 h-[52px]" />}

      {/* Slide content */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 text-center">
        <div className="mb-8 transition-all duration-300">
          {slide.isLogo ? (
            <Logo size="large" />
          ) : (
            slide.icon && (
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <slide.icon className="w-10 h-10 text-primary" />
              </div>
            )
          )}
        </div>

        <h2 className="text-2xl font-bold text-foreground mb-3">{slide.title}</h2>
        <p className="text-muted-foreground max-w-xs leading-relaxed">{slide.description}</p>
      </div>

      {/* Bottom: dots + button */}
      <div className="pb-12 px-8 flex flex-col items-center gap-8">
        {/* Dots */}
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
              }`}
            />
          ))}
        </div>

        {/* Action button */}
        <Button onClick={next} className="w-full max-w-xs" size="lg">
          {isLast ? 'Commencer' : 'Suivant'}
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default Onboarding;
