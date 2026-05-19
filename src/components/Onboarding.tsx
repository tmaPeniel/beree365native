import React, { useState, useRef, useCallback } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import onboardingWelcome from '@/assets/onboarding-welcome.png';
import onboardingPlan from '@/assets/onboarding-plan.png';
import onboardingProgress from '@/assets/onboarding-progress.png';

interface OnboardingProps {
  onComplete: () => void;
}

const slides = [
  {
    image: onboardingWelcome,
    title: 'Bienvenue sur Bérée 365',
    description: 'Parcourez la Bible en un an avec un plan de lecture adapté à votre rythme.',
  },
  {
    image: onboardingPlan,
    title: 'Votre plan de lecture',
    description: 'Choisissez parmi 4 plans adaptés : canonique ou chronologique, en 6 ou 12 mois.',
  },
  {
    image: onboardingProgress,
    title: 'Suivez votre progression',
    description: 'Débloquez des badges, consultez vos statistiques et découvrez un verset chaque jour.',
  },
];

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState<'left' | 'right'>('left');
  const [isVisible, setIsVisible] = useState(true);
  const touchStartX = useRef(0);
  const isLast = current === slides.length - 1;

  const goTo = useCallback((nextIndex: number, dir: 'left' | 'right') => {
    setIsVisible(false);
    setDirection(dir);
    setTimeout(() => {
      setCurrent(nextIndex);
      setIsVisible(true);
    }, 200);
  }, []);

  const next = useCallback(() => {
    if (isLast) {
      onComplete();
    } else {
      goTo(current + 1, 'left');
    }
  }, [isLast, onComplete, current, goTo]);

  const prev = useCallback(() => {
    if (current > 0) goTo(current - 1, 'right');
  }, [current, goTo]);

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

  const slideClass = isVisible
    ? 'opacity-100 translate-x-0'
    : direction === 'left'
      ? 'opacity-0 translate-x-8'
      : 'opacity-0 -translate-x-8';

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
      <div className={`flex-1 flex flex-col items-center justify-center px-8 text-center transition-all duration-200 ease-out ${slideClass}`}>
        <div className="mb-8">
          <img
            src={slide.image}
            alt={slide.title}
            width={200}
            height={200}
            className="w-48 h-48 object-contain mx-auto drop-shadow-lg"
          />
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
