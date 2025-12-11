import React from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/lib/formatNumber';

interface LikeButtonProps {
  likesCount: number;
  hasLiked: boolean;
  onToggle: () => void;
  isLoading?: boolean;
  variant?: 'light' | 'dark';
  showCount?: boolean;
}

const LikeButton: React.FC<LikeButtonProps> = ({
  likesCount,
  hasLiked,
  onToggle,
  isLoading,
  variant = 'dark',
  showCount = true,
}) => {
  return (
    <button
      onClick={onToggle}
      disabled={isLoading}
      className={cn(
        'flex items-center gap-1.5 transition-all duration-200',
        'active:scale-95 disabled:opacity-50',
        variant === 'light' ? 'text-white/90 hover:text-white' : 'text-foreground/70 hover:text-foreground'
      )}
    >
      <Heart
        className={cn(
          'h-6 w-6 transition-all duration-300',
          hasLiked && 'fill-red-500 text-red-500 scale-110 animate-[pulse_0.3s_ease-in-out]'
        )}
      />
      {showCount && (
        <span className={cn(
          'text-sm font-medium',
          variant === 'light' ? 'text-white/80' : 'text-muted-foreground'
        )}>
          {formatNumber(likesCount)}
        </span>
      )}
    </button>
  );
};

export default LikeButton;
