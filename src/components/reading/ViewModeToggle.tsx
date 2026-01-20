import React from 'react';
import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

export type ViewMode = 'grid' | 'focus';

interface ViewModeToggleProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

/**
 * Composant toggle pour basculer entre la vue grille et la vue focus
 * Affiche deux boutons avec des icônes pour chaque mode
 */
const ViewModeToggle = React.memo<ViewModeToggleProps>(({ viewMode, onViewModeChange }) => {
  return (
    <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
      <Button
        variant={viewMode === 'focus' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('focus')}
        className="h-8 px-3"
        aria-label="Vue focus"
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={viewMode === 'grid' ? 'default' : 'ghost'}
        size="sm"
        onClick={() => onViewModeChange('grid')}
        className="h-8 px-3"
        aria-label="Vue grille"
      >
        <LayoutGrid className="h-4 w-4" />
      </Button>
    </div>
  );
});

ViewModeToggle.displayName = 'ViewModeToggle';

export default ViewModeToggle;
