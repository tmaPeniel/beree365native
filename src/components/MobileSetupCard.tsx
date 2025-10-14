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
    android: 'npx cap add android && npx cap sync && npx cap open android'
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" />
          Configuration mobile
        </CardTitle>
        <CardDescription>
          Guide pour installer l'application sur mobile
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Pour utiliser les notifications push sur mobile, l'application doit être installée nativement.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
};
const ChecklistItem = ({
  label,
  checked
}: {
  label: string;
  checked: boolean;
}) => <div className="flex items-center gap-2 text-sm">
    {checked ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-muted-foreground" />}
    <span className={checked ? 'text-foreground' : 'text-muted-foreground'}>
      {label}
    </span>
  </div>;