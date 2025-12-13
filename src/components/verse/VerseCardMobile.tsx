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
    <div className="relative overflow-hidden rounded-2xl bg-verse-gradient min-h-[380px] flex flex-col shadow-lg">
      {/* Header */}
      <div className="p-5 pb-2">
        <p className="text-white text-sm font-semibold uppercase tracking-wider drop-shadow-md">
          Verset du jour
        </p>
        <p className="text-white text-lg font-bold mt-1 drop-shadow-md">
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
