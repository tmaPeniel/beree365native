import React from 'react';
import { Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import LikeButton from './LikeButton';
import { toast } from 'sonner';

interface VerseActionBarProps {
  likesCount: number;
  hasLiked: boolean;
  onToggleLike: () => void;
  isLoading?: boolean;
  verseText: string;
  verseReference: string;
  variant?: 'light' | 'dark';
  className?: string;
}

const VerseActionBar: React.FC<VerseActionBarProps> = ({
  likesCount,
  hasLiked,
  onToggleLike,
  isLoading,
  verseText,
  verseReference,
  variant = 'dark',
  className,
}) => {
  const handleShare = async () => {
    const shareText = `✨ Verset du jour - ${verseReference}\n\n"${verseText}"\n\n📖 Via l'app Le Tour de ma Bible`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Verset du jour - ${verseReference}`,
          text: shareText,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          copyToClipboard(shareText);
        }
      }
    } else {
      copyToClipboard(shareText);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Verset copié dans le presse-papier !');
    } catch {
      toast.error('Impossible de copier le verset');
    }
  };

  return (
    <div className={cn('flex items-center gap-6', className)}>
      <LikeButton
        likesCount={likesCount}
        hasLiked={hasLiked}
        onToggle={onToggleLike}
        isLoading={isLoading}
        variant={variant}
      />
      
      <button
        onClick={handleShare}
        className={cn(
          'flex items-center gap-1.5 transition-all duration-200',
          'active:scale-95',
          variant === 'light' 
            ? 'text-white/90 hover:text-white' 
            : 'text-foreground/70 hover:text-foreground'
        )}
      >
        <Share2 className="h-5 w-5" />
        <span className={cn(
          'text-sm font-medium',
          variant === 'light' ? 'text-white/80' : 'text-muted-foreground'
        )}>
          Partager
        </span>
      </button>
    </div>
  );
};

export default VerseActionBar;
