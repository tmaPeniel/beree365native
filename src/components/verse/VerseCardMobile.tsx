import React from 'react';
import { DailyVerse } from '@/types/supabase';
import VerseActionBar from './VerseActionBar';

interface VerseCardMobileProps {
  verse: DailyVerse;
  likesCount: number;
  hasLiked: boolean;
  onToggleLike: () => void;
  isLoading?: boolean;
}

const VerseCardMobile: React.FC<VerseCardMobileProps> = ({
  verse,
  likesCount,
  hasLiked,
  onToggleLike,
  isLoading,
}) => {
  return (
    <div className="relative overflow-hidden rounded-2xl bg-verse-gradient min-h-[420px] flex flex-col">
      {/* Header */}
      <div className="p-5 pb-0">
        <p className="text-white/70 text-sm font-medium">Verset du jour</p>
        <p className="text-white/90 text-base font-semibold mt-0.5">
          {verse.reference}
        </p>
      </div>

      {/* Verse content - centered */}
      <div className="flex-1 flex items-center justify-center px-6 py-8">
        <blockquote className="text-white text-center text-xl font-medium leading-relaxed italic">
          "{verse.text}"
        </blockquote>
      </div>

      {/* Action bar */}
      <div className="p-5 pt-0 border-t border-white/10">
        <VerseActionBar
          likesCount={likesCount}
          hasLiked={hasLiked}
          onToggleLike={onToggleLike}
          isLoading={isLoading}
          verseText={verse.text}
          verseReference={verse.reference}
          variant="light"
          className="justify-center"
        />
      </div>
    </div>
  );
};

export default VerseCardMobile;
