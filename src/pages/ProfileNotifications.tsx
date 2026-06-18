import React from 'react';
import { ArrowLeft, Bell, BellOff, Smartphone, Send } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { useNotificationPreferences } from '@/hooks/useNotificationPreferences';
import { isIOS, isStandalone } from '@/lib/push/push';

const ProfileNotifications = () => {
  const { isSupported, permission, isSubscribed, isLoading, subscribe, unsubscribe, sendTest } =
    usePushNotifications();
  const { prefs, update } = useNotificationPreferences();

  const ios = typeof window !== 'undefined' && isIOS();
  const standalone = typeof window !== 'undefined' && isStandalone();
  const iosBlocked = ios && !standalone;

  const handleEnable = async () => {
    try {
      const ok = await subscribe();
      if (!ok) {
        toast.error('Permission refusée ou navigateur incompatible');
        return;
      }
      toast.success('Notifications activées');
      try { await sendTest(); } catch (_) {}
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleDisable = async () => {
    try {
      await unsubscribe();
      toast.success('Notifications désactivées');
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  const handleTest = async () => {
    try {
      const r = await sendTest();
      toast.success(`Notification envoyée (${r.sent})`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="px-6 py-4 flex items-center gap-4">
          <Link to="/profile/settings">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="text-xl font-bold">Notifications</h1>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" /> Notifications push
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isSupported && (
              <p className="text-sm text-muted-foreground">
                Ton navigateur ne supporte pas les notifications push.
              </p>
            )}

            {isSupported && iosBlocked && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-sm flex gap-2">
                <Smartphone className="h-4 w-4 mt-0.5 shrink-0 text-amber-600" />
                <div>
                  <div className="font-medium">Sur iPhone, installe d'abord Bérée 365</div>
                  <p className="text-muted-foreground mt-1">
                    Partager → « Sur l'écran d'accueil ». Reviens ensuite ici pour activer les notifications.
                  </p>
                </div>
              </div>
            )}

            {isSupported && permission === 'denied' && (
              <p className="text-sm text-muted-foreground">
                Les notifications sont bloquées. Réactive-les dans les réglages de ton navigateur.
              </p>
            )}

            {isSupported && !iosBlocked && permission !== 'denied' && (
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-medium">Activer les notifications</div>
                  <p className="text-xs text-muted-foreground">
                    Reçois tes rappels même quand l'app est fermée.
                  </p>
                </div>
                {isSubscribed ? (
                  <Button variant="outline" onClick={handleDisable} disabled={isLoading}>
                    <BellOff className="h-4 w-4 mr-2" /> Désactiver
                  </Button>
                ) : (
                  <Button onClick={handleEnable} disabled={isLoading}>
                    <Bell className="h-4 w-4 mr-2" /> Activer
                  </Button>
                )}
              </div>
            )}

            {isSubscribed && (
              <Button variant="ghost" size="sm" onClick={handleTest}>
                <Send className="h-4 w-4 mr-2" /> Envoyer une notification de test
              </Button>
            )}
          </CardContent>
        </Card>

        {prefs && (
          <Card>
            <CardHeader>
              <CardTitle>Préférences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <PrefRow
                label="Sagesse du jour"
                desc="Verset envoyé tous les matins"
                checked={prefs.daily_verse_enabled}
                onChange={(v) => update({ daily_verse_enabled: v })}
                extra={
                  <Input
                    type="time"
                    className="w-28"
                    value={prefs.daily_verse_time?.slice(0, 5) ?? '08:00'}
                    onChange={(e) => update({ daily_verse_time: e.target.value })}
                  />
                }
              />
              <PrefRow
                label="Rappel de lecture"
                desc="Rappel pour ta lecture du jour"
                checked={prefs.reading_reminder_enabled}
                onChange={(v) => update({ reading_reminder_enabled: v })}
                extra={
                  <Input
                    type="time"
                    className="w-28"
                    value={prefs.reading_reminder_time?.slice(0, 5) ?? '20:00'}
                    onChange={(e) => update({ reading_reminder_time: e.target.value })}
                  />
                }
              />
              <PrefRow
                label="Badges débloqués"
                desc="Notification lorsqu'un nouveau badge est obtenu"
                checked={prefs.badges_enabled}
                onChange={(v) => update({ badges_enabled: v })}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

function PrefRow({
  label,
  desc,
  checked,
  onChange,
  extra,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  extra?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="font-medium text-sm">{label}</div>
        <div className="text-xs text-muted-foreground">{desc}</div>
      </div>
      <div className="flex items-center gap-3">
        {extra}
        <Switch checked={checked} onCheckedChange={onChange} />
      </div>
    </div>
  );
}

export default ProfileNotifications;
