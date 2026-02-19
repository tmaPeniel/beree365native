import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Book } from 'lucide-react';
import { DailyVerse } from '@/types/supabase';
import VerseActionBar from './VerseActionBar';

interface VerseCardDesktopProps {
  verse: DailyVerse;
  likesCount: number;
  hasLiked: boolean;
  onToggleLike: () => void;
  isLoading?: boolean;
}

const VerseCardDesktop: React.FC<VerseCardDesktopProps> = ({
  verse,
  likesCount,
  hasLiked,
  onToggleLike,
  isLoading,
}) => {
  const wisdomContent = verse.wisdomType || 'Sagesse du Jour';

  return (
    <Card className="bg-card border-border">
      <CardContent className="p-6 text-center">
        <div className="flex items-center justify-center mb-4">
          <Book className="h-8 w-8 text-primary" />
        </div>
        
        <h2 className="text-lg font-semibold text-foreground mb-3">
          {wisdomContent}
        </h2>
        
        <blockquote className="text-foreground italic text-base mb-4 leading-relaxed">
          "{verse.text}"
        </blockquote>
        
        {verse.reference && (
          <cite className="text-sm text-muted-foreground font-medium block mb-4">
            {verse.reference}
          </cite>
        )}

        {/* Actions */}
        <div className="pt-4 border-t border-border">
          <VerseActionBar
            likesCount={likesCount}
            hasLiked={hasLiked}
            onToggleLike={onToggleLike}
            isLoading={isLoading}
            verseText={verse.text}
            verseReference={verse.reference}
            variant="dark"
            className="justify-center"
          />
        </div>
      </CardContent>
    </Card>
  );
};

export default VerseCardDesktop;
