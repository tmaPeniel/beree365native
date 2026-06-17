import React, { useState, useRef, useCallback, useMemo } from 'react';
import { ArrowRight } from 'lucide-react';
import { Button } from './ui/button';
import onboardingWelcome from '@/assets/onboarding-welcome.png';
import onboardingPlan from '@/assets/onboarding-plan.png';
import onboardingProgress from '@/assets/onboarding-progress.png';
import onboardingInstallIos from '@/assets/onboarding-install-ios.png';
import onboardingInstallAndroid from '@/assets/onboarding-install-android.png';

interface OnboardingProps {
  onComplete: () => void;
}

type Platform = 'ios' | 'android' | 'desktop';

const detectPlatform = (): Platform => {
  if (typeof navigator === 'undefined') return 'desktop';
  const ua = navigator.userAgent || '';
  if (/iPad|iPhone|iPod/.test(ua)) return 'ios';
  // iPadOS 13+ reports as Mac with touch
  if (/Macintosh/.test(ua) && 'ontouchend' in document) return 'ios';
  if (/Android/i.test(ua)) return 'android';
  return 'desktop';
};

const isStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  // iOS
  if ((navigator as any).standalone === true) return true;
  return window.matchMedia?.('(display-mode: standalone)').matches ?? false;
};

const buildSlides = (platform: Platform) => {
  const installSlide =
    platform === 'ios'
      ? {
          image: onboardingInstallIos,
          title: 'Installez l\u2019application',
          description:
            'Dans Safari, touchez le bouton Partager en bas de l\u2019\u00e9cran, puis « Sur l\u2019\u00e9cran d\u2019accueil » pour ajouter B\u00e9r\u00e9e 365.',
        }
      : platform === 'android'
        ? {
            image: onboardingInstallAndroid,
            title: 'Installez l\u2019application',
            description:
              'Dans Chrome, ouvrez le menu \u22ee en haut \u00e0 droite, puis « Installer l\u2019application » ou « Ajouter \u00e0 l\u2019\u00e9cran d\u2019accueil ».',
          }
        : {
            image: onboardingInstallAndroid,
            title: 'Installez l\u2019application',
            description:
              'Ouvrez B\u00e9r\u00e9e 365 depuis Safari sur iPhone ou Chrome sur Android, puis ajoutez l\u2019application \u00e0 votre \u00e9cran d\u2019accueil.',
          };

  return [
    {
      image: onboardingWelcome,
      title: 'Bienvenue sur B\u00e9r\u00e9e 365',
      description: 'Parcourez la Bible en un an avec un plan de lecture adapt\u00e9 \u00e0 votre rythme.',
    },
    {
      image: onboardingPlan,
      title: 'Votre plan de lecture',
      description: 'Choisissez parmi 4 plans adapt\u00e9s : canonique ou chronologique, en 6 ou 12 mois.',
    },
    {
      image: onboardingProgress,
      title: 'Suivez votre progression',
      description: 'D\u00e9bloquez des badges, consultez vos statistiques et d\u00e9couvrez un verset chaque jour.',
    },
    installSlide,
  ];
};

const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const slides = useMemo(() => {
    const platform = detectPlatform();
    const all = buildSlides(platform);
    // Si l'app est déjà installée (standalone), on saute la slide d'installation
    return isStandalone() ? all.slice(0, 3) : all;
  }, []);

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
