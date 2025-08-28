import { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export const PWAUpdateNotification = () => {
  useEffect(() => {
    // Register service worker update listener
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        toast('Application mise à jour', {
          description: 'L\'application a été mise à jour avec succès.',
          duration: 3000,
        });
      });

      // Check for updates periodically
      navigator.serviceWorker.getRegistration().then((registration) => {
        if (registration) {
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  toast('Nouvelle version disponible', {
                    description: 'Une mise à jour de l\'application est disponible.',
                    action: (
                      <Button 
                        size="sm" 
                        onClick={() => {
                          window.location.reload();
                        }}
                      >
                        Mettre à jour
                      </Button>
                    ),
                    duration: 10000,
                  });
                }
              });
            }
          });
        }
      });
    }
  }, []);

  return null;
};