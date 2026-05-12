import React, { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { pushService } from "@/services/pushService";
import { toast } from "@/hooks/use-toast";

interface Diagnostics {
  hasNotificationApi: boolean;
  hasServiceWorker: boolean;
  hasPushManager: boolean;
  permission: string;
  vapidConfigured: boolean;
  swReady: boolean;
  swScope: string | null;
  localEndpoint: string | null;
  dbActiveDevices: number;
  dbEndpointMatchesLocal: boolean;
  dbEndpointPreview: string | null;
}

const truncate = (s: string | null | undefined, n = 80) =>
  !s ? "" : s.length > n ? s.slice(0, n) + "…" : s;

const PushDiagnosticsPanel: React.FC = () => {
  const { user } = useAuth();
  const [diag, setDiag] = useState<Diagnostics | null>(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const hasNotificationApi = typeof window !== "undefined" && "Notification" in window;
      const hasServiceWorker = typeof navigator !== "undefined" && "serviceWorker" in navigator;
      const hasPushManager = typeof window !== "undefined" && "PushManager" in window;
      const permission = hasNotificationApi ? Notification.permission : "unsupported";
      const vapidConfigured = !!import.meta.env.VITE_VAPID_PUBLIC_KEY;

      let swReady = false;
      let swScope: string | null = null;
      let localEndpoint: string | null = null;

      if (hasServiceWorker) {
        try {
          const reg = await navigator.serviceWorker.ready;
          swReady = !!reg;
          swScope = reg?.scope ?? null;
          const sub = await reg.pushManager.getSubscription();
          localEndpoint = sub?.endpoint ?? null;
        } catch {
          swReady = false;
        }
      }

      let dbActiveDevices = 0;
      let dbEndpointMatchesLocal = false;
      let dbEndpointPreview: string | null = null;

      if (user) {
        const { data } = await supabase
          .from("user_devices")
          .select("push_endpoint, is_active, last_seen_at")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .eq("device_platform", "web");

        dbActiveDevices = data?.length ?? 0;
        const endpoints = (data ?? []).map((d) => d.push_endpoint).filter(Boolean) as string[];
        dbEndpointPreview = endpoints[0] ?? null;
        if (localEndpoint && endpoints.includes(localEndpoint)) {
          dbEndpointMatchesLocal = true;
        }
      }

      setDiag({
        hasNotificationApi,
        hasServiceWorker,
        hasPushManager,
        permission,
        vapidConfigured,
        swReady,
        swScope,
        localEndpoint,
        dbActiveDevices,
        dbEndpointMatchesLocal,
        dbEndpointPreview,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const sendTest = async () => {
    if (!user) return;
    setSending(true);
    setLastResult(null);
    try {
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        await pushService.subscribe();
        await refresh();
      }

      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          title: "🔔 Test Bérée",
          message: "Ceci est une notification de diagnostic.",
          userId: user.id,
        },
      });

      if (error) {
        const msg = `❌ Erreur invocation: ${error.message}`;
        setLastResult(msg);
        toast({ title: "Échec", description: msg, variant: "destructive" });
      } else {
        const msg = `Réponse edge function: ${JSON.stringify(data, null, 2)}`;
        setLastResult(msg);
        const sent = data?.sent ?? 0;
        toast({
          title: sent > 0 ? "Test envoyé" : "Aucune notification envoyée",
          description: `devices=${data?.devicesFound ?? 0} sent=${sent} failed=${data?.failed ?? 0}`,
          variant: sent > 0 ? "default" : "destructive",
        });
      }
    } catch (e: any) {
      setLastResult(`❌ Exception: ${e?.message || String(e)}`);
    } finally {
      setSending(false);
      refresh();
    }
  };

  const Row = ({ label, value, ok }: { label: string; value: React.ReactNode; ok?: boolean }) => (
    <div className="flex items-start justify-between gap-3 text-sm py-1">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono text-right break-all">
        {ok === undefined ? (
          value
        ) : (
          <Badge variant={ok ? "default" : "destructive"}>{value}</Badge>
        )}
      </span>
    </div>
  );

  if (!diag) {
    return (
      <Card className="p-4 mt-2 text-sm text-muted-foreground">Chargement du diagnostic…</Card>
    );
  }

  return (
    <Card className="p-4 mt-2 space-y-1">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold">Diagnostic notifications push</h3>
        <Button size="sm" variant="ghost" onClick={refresh} disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </Button>
      </div>

      <Row label="Notification API" value={String(diag.hasNotificationApi)} ok={diag.hasNotificationApi} />
      <Row label="Service Worker API" value={String(diag.hasServiceWorker)} ok={diag.hasServiceWorker} />
      <Row label="PushManager" value={String(diag.hasPushManager)} ok={diag.hasPushManager} />
      <Row label="Permission" value={diag.permission} ok={diag.permission === "granted"} />
      <Row label="VAPID configurée" value={String(diag.vapidConfigured)} ok={diag.vapidConfigured} />
      <Row label="Service worker prêt" value={String(diag.swReady)} ok={diag.swReady} />
      <Row label="SW scope" value={diag.swScope ?? "—"} />
      <Row
        label="Souscription locale"
        value={diag.localEndpoint ? truncate(diag.localEndpoint, 50) : "absente"}
        ok={!!diag.localEndpoint}
      />
      <Row label="Devices actifs en base" value={String(diag.dbActiveDevices)} ok={diag.dbActiveDevices > 0} />
      <Row
        label="DB ↔ navigateur courant"
        value={diag.dbEndpointMatchesLocal ? "alignés" : "non alignés"}
        ok={diag.dbEndpointMatchesLocal}
      />
      <Row label="DB endpoint" value={truncate(diag.dbEndpointPreview, 50) || "—"} />

      <div className="pt-3 flex flex-col gap-2">
        <Button onClick={sendTest} disabled={sending || !user} variant="outline">
          {sending ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Send className="h-4 w-4 mr-2" />
          )}
          Tester l'envoi (et voir la réponse serveur)
        </Button>
        {lastResult && (
          <pre className="text-xs bg-muted p-2 rounded overflow-auto whitespace-pre-wrap max-h-64">
            {lastResult}
          </pre>
        )}
      </div>
    </Card>
  );
};

export default PushDiagnosticsPanel;
