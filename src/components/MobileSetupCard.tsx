import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Smartphone, Globe, CheckCircle2, XCircle, AlertCircle, ExternalLink, Copy, Check } from 'lucide-react';
import { toast } from 'sonner';

export const MobileSetupCard = () => {
  const [copied, setCopied] = useState(false);
  const isNative = Capacitor.isNativePlatform();
  const platform = Capacitor.getPlatform();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Commande copiée !');
    setTimeout(() => setCopied(false), 2000);
  };

  const commands = {
    ios: 'npx cap add ios && npx cap sync && npx cap open ios',
    android: 'npx cap add android && npx cap sync && npx cap open android',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Configuration Mobile
        </CardTitle>
        <CardDescription>
          Statut de déploiement et instructions
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Statut actuel */}
        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
          <div className="flex items-center gap-3">
            {isNative ? (
              <>
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium">Mode Native</p>
                  <p className="text-sm text-muted-foreground">
                    Plateforme: {platform}
                  </p>
                </div>
              </>
            ) : (
              <>
                <Globe className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="font-medium">Mode Web (PWA)</p>
                  <p className="text-sm text-muted-foreground">
                    Application Progressive Web App
                  </p>
                </div>
              </>
            )}
          </div>
          <Badge variant={isNative ? 'default' : 'secondary'}>
            {isNative ? 'Native' : 'Web'}
          </Badge>
        </div>

        {/* Instructions si en mode web */}
        {!isNative && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <p className="font-medium mb-2">Pour profiter des notifications natives :</p>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li>Configurez Firebase (voir FIREBASE_SETUP.md)</li>
                <li>Déployez sur iOS ou Android</li>
                <li>Testez les notifications push natives</li>
              </ol>
            </AlertDescription>
          </Alert>
        )}

        {/* Commandes de déploiement */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Commandes de déploiement :</p>
          
          {/* iOS */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">iOS (Mac uniquement)</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                {commands.ios}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(commands.ios)}
              >
                {copied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>

          {/* Android */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Android</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 text-xs bg-muted p-2 rounded overflow-x-auto">
                {commands.android}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => copyToClipboard(commands.android)}
              >
                {copied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Liens de documentation */}
        <div className="flex flex-col gap-2 pt-2">
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => window.open('https://docs.lovable.dev/blogs/TODO', '_blank')}
          >
            <span>Guide complet Lovable</span>
            <ExternalLink className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            className="w-full justify-between"
            onClick={() => window.open('https://capacitorjs.com/docs', '_blank')}
          >
            <span>Documentation Capacitor</span>
            <ExternalLink className="h-4 w-4" />
          </Button>
        </div>

        {/* Checklist */}
        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-3">Checklist de configuration :</p>
          <div className="space-y-2">
            <ChecklistItem 
              label="Projet Firebase créé" 
              checked={false}
            />
            <ChecklistItem 
              label="FCM_SERVER_KEY configuré" 
              checked={false}
            />
            <ChecklistItem 
              label="GoogleService-Info.plist (iOS)" 
              checked={false}
            />
            <ChecklistItem 
              label="google-services.json (Android)" 
              checked={false}
            />
            <ChecklistItem 
              label="App déployée sur mobile" 
              checked={isNative}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const ChecklistItem = ({ label, checked }: { label: string; checked: boolean }) => (
  <div className="flex items-center gap-2 text-sm">
    {checked ? (
      <CheckCircle2 className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-muted-foreground" />
    )}
    <span className={checked ? 'text-foreground' : 'text-muted-foreground'}>
      {label}
    </span>
  </div>
);
