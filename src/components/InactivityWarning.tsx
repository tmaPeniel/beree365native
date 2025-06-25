
import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Clock, LogOut } from 'lucide-react';

interface InactivityWarningProps {
  isOpen: boolean;
  timeLeft: number; // en millisecondes
  onExtendSession: () => void;
  onLogout: () => void;
}

const InactivityWarning: React.FC<InactivityWarningProps> = ({
  isOpen,
  timeLeft,
  onExtendSession,
  onLogout
}) => {
  // Convertir les millisecondes en minutes et secondes
  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);
  
  const formatTime = () => {
    if (minutes > 0) {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${seconds}s`;
  };

  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="sm:max-w-md">
        <AlertDialogHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
            <Clock className="h-6 w-6 text-orange-600" />
          </div>
          <AlertDialogTitle className="text-lg font-semibold">
            Session sur le point d'expirer
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center">
            Votre session va expirer dans{' '}
            <span className="font-mono font-bold text-orange-600">
              {formatTime()}
            </span>
            {'. '}
            Voulez-vous rester connecté(e) ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
          <AlertDialogCancel 
            onClick={onLogout}
            className="flex items-center gap-2 order-2 sm:order-1"
          >
            <LogOut className="h-4 w-4" />
            Se déconnecter
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onExtendSession}
            className="bg-green-600 hover:bg-green-700 order-1 sm:order-2"
          >
            Rester connecté(e)
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default InactivityWarning;
