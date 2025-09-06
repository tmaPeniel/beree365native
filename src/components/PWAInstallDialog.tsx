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
import { Smartphone, Download, CheckCircle } from 'lucide-react';

interface PWAInstallDialogProps {
  isOpen: boolean;
  onInstall: () => void;
  onCancel: () => void;
  isInstalling: boolean;
}

const PWAInstallDialog: React.FC<PWAInstallDialogProps> = ({
  isOpen,
  onInstall,
  onCancel,
  isInstalling,
}) => {
  return (
    <AlertDialog open={isOpen}>
      <AlertDialogContent className="max-w-sm mx-4">
        <AlertDialogHeader className="text-center">
          <div className="mx-auto mb-4 w-16 h-16 bg-beree-500/10 rounded-full flex items-center justify-center">
            <Smartphone className="w-8 h-8 text-beree-500" />
          </div>
          <AlertDialogTitle className="text-xl">
            Installer Bérée 365
          </AlertDialogTitle>
          <AlertDialogDescription className="text-left space-y-2">
            <p>Ajoutez Bérée 365 à votre écran d'accueil pour :</p>
            <div className="space-y-2 ml-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-beree-500 flex-shrink-0" />
                <span className="text-sm">Accès rapide et hors ligne</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-beree-500 flex-shrink-0" />
                <span className="text-sm">Expérience native optimisée</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-beree-500 flex-shrink-0" />
                <span className="text-sm">Notifications de rappel</span>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2">
          <AlertDialogAction
            onClick={onInstall}
            disabled={isInstalling}
            className="w-full bg-beree-500 hover:bg-beree-600"
          >
            {isInstalling ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Installation...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Installer l'application
              </div>
            )}
          </AlertDialogAction>
          <AlertDialogCancel
            onClick={onCancel}
            disabled={isInstalling}
            className="w-full"
          >
            Plus tard
          </AlertDialogCancel>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default PWAInstallDialog;