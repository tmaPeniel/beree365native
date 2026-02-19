/**
 * Bandeau de consentement aux cookies
 * Conforme au RGPD
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Cookie, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useCookieConsent } from '@/hooks/useCookieConsent';

const CookieConsentBanner = () => {
  const { showBanner, isLoading, acceptAll, rejectAll, savePreferences } = useCookieConsent();
  const [showPreferences, setShowPreferences] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);

  if (isLoading || !showBanner) {
    return null;
  }

  const handleSavePreferences = async () => {
    await savePreferences(analyticsEnabled);
    setShowPreferences(false);
  };

  return (
    <>
      {/* Bandeau principal */}
      <div className="fixed bottom-0 left-0 right-0 z-50 p-4 animate-in slide-in-from-bottom duration-300">
        <Card className="max-w-2xl mx-auto shadow-lg border-2">
          <CardContent className="p-4 sm:p-6">
            <div className="flex items-start gap-3">
              <div className="shrink-0 p-2 bg-primary/10 rounded-full">
                <Cookie className="h-5 w-5 text-primary" />
              </div>
              
              <div className="flex-1 space-y-3">
                <div>
                  <h3 className="font-semibold text-foreground">
                    Ce site utilise des cookies
                  </h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Nous utilisons des cookies essentiels pour le bon fonctionnement du site 
                    et des cookies optionnels pour améliorer votre expérience.
                  </p>
                </div>

                <div className="flex items-center gap-2 text-sm">
                  <Link 
                    to="/cookies" 
                    className="text-primary hover:underline"
                  >
                    Politique de cookies
                  </Link>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={rejectAll}
                  >
                    Tout refuser
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowPreferences(true)}
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Personnaliser
                  </Button>
                  <Button 
                    size="sm"
                    onClick={acceptAll}
                    className="bg-primary hover:bg-primary/90"
                  >
                    Tout accepter
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Dialog de personnalisation */}
      <Dialog open={showPreferences} onOpenChange={setShowPreferences}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Préférences de cookies
            </DialogTitle>
            <DialogDescription>
              Choisissez les cookies que vous souhaitez accepter.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Cookies essentiels */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <Label className="font-medium">Cookies essentiels</Label>
                <p className="text-xs text-muted-foreground">
                  Nécessaires au fonctionnement du site (authentification, thème).
                </p>
              </div>
              <Switch checked disabled />
            </div>

            {/* Cookies analytiques */}
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <Label htmlFor="analytics" className="font-medium">
                  Cookies analytiques
                </Label>
                <p className="text-xs text-muted-foreground">
                  Notifications push via OneSignal.
                </p>
              </div>
              <Switch 
                id="analytics"
                checked={analyticsEnabled}
                onCheckedChange={setAnalyticsEnabled}
              />
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button 
              variant="outline" 
              onClick={() => setShowPreferences(false)}
              className="w-full sm:w-auto"
            >
              Annuler
            </Button>
            <Button 
              onClick={handleSavePreferences}
              className="w-full sm:w-auto"
            >
              Enregistrer mes choix
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CookieConsentBanner;
