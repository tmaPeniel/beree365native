
import React from 'react';
import OptimizedDayReadingDialog from './OptimizedDayReadingDialog';

interface DayReadingDialogProps {
  day: number;
  date: string;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Wrapper pour maintenir la compatibilité avec l'ancien composant
 */
const DayReadingDialog: React.FC<DayReadingDialogProps> = (props) => {
  return <OptimizedDayReadingDialog {...props} />;
};

export default DayReadingDialog;
