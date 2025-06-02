
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Calendar, Search } from 'lucide-react';

interface DayNavigatorProps {
  currentDay: number;
  totalDays: number;
  onNavigateToDay: (day: number) => void;
  onCurrentDayClick: () => void;
}

const DayNavigator: React.FC<DayNavigatorProps> = ({
  currentDay,
  totalDays,
  onNavigateToDay,
  onCurrentDayClick
}) => {
  const [searchDay, setSearchDay] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const day = parseInt(searchDay);
    if (day >= 1 && day <= totalDays) {
      onNavigateToDay(day);
      setSearchDay('');
      setIsSearchOpen(false);
    }
  };

  const handlePrevious = () => {
    if (currentDay > 1) {
      onNavigateToDay(currentDay - 1);
    }
  };

  const handleNext = () => {
    if (currentDay < totalDays) {
      onNavigateToDay(currentDay + 1);
    }
  };

  return (
    <div className="flex items-center gap-2 bg-white p-3 rounded-lg border shadow-sm">
      <Button
        variant="outline"
        size="sm"
        onClick={handlePrevious}
        disabled={currentDay <= 1}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      <button
        onClick={onCurrentDayClick}
        className="flex items-center gap-2 px-4 py-2 bg-green-50 rounded-lg border border-green-200 hover:bg-green-100 transition-colors"
      >
        <Calendar className="h-4 w-4 text-green-600" />
        <span className="font-medium text-green-700">
          Jour {currentDay}/{totalDays}
        </span>
      </button>

      <Button
        variant="outline"
        size="sm"
        onClick={handleNext}
        disabled={currentDay >= totalDays}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <div className="ml-2">
        {isSearchOpen ? (
          <form onSubmit={handleSearchSubmit} className="flex items-center gap-1">
            <Input
              type="number"
              min="1"
              max={totalDays}
              value={searchDay}
              onChange={(e) => setSearchDay(e.target.value)}
              placeholder={`1-${totalDays}`}
              className="w-20 h-8"
              autoFocus
            />
            <Button type="submit" size="sm" disabled={!searchDay}>
              Aller
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsSearchOpen(false);
                setSearchDay('');
              }}
            >
              ✕
            </Button>
          </form>
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsSearchOpen(true)}
          >
            <Search className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};

export default DayNavigator;
