import React from 'react';
import { Filter } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface ThemeFilterProps {
  themes: string[];
  selectedTheme: string;
  onThemeChange: (theme: string) => void;
  verseCount: number;
}

const ThemeFilter: React.FC<ThemeFilterProps> = ({
  themes,
  selectedTheme,
  onThemeChange,
  verseCount
}) => {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Filtrer par thématique :</span>
        </div>
        
        <Select value={selectedTheme} onValueChange={onThemeChange}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Sélectionnez une thématique" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les thématiques</SelectItem>
            {themes.sort().map((theme) => (
              <SelectItem key={theme} value={theme}>
                {theme}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      <div className="text-sm text-muted-foreground">
        {selectedTheme === 'all' 
          ? `${verseCount} verset${verseCount > 1 ? 's' : ''} au total`
          : `${verseCount} verset${verseCount > 1 ? 's' : ''} trouvé${verseCount > 1 ? 's' : ''}`
        }
      </div>
    </div>
  );
};

export default ThemeFilter;