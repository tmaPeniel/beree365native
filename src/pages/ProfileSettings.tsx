import React, { useState } from "react";
import { ArrowLeft, User, Bell, Moon, Shield, HelpCircle, Check, X, AlertCircle, Send, RefreshCw, Crown } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useTheme } from "@/providers/ThemeProvider";
import { useUnifiedPushNotifications } from "@/hooks/useUnifiedPushNotifications";
import { useAuth } from "@/hooks/useAuth";
import { usePremium } from "@/hooks/usePremium";
import { pushService } from "@/services/pushService";
import { toast } from "@/hooks/use-toast";
import PushDiagnosticsPanel from "@/components/notifications/PushDiagnosticsPanel";

/**
 * Page des paramètres utilisateur
 */
const ProfileSettings = () => {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { isPremium } = usePremium();
  const { isSupported, isSubscribed, isLoading, permission, subscribe, unsubscribe } = useUnifiedPushNotifications();
  const [isSendingTest, setIsSendingTest] = useState(false);

  // Handler pour le toggle des notifications
  const handleNotificationToggle = async (checked: boolean) => {
    if (checked) {
      await subscribe();
    } else {
      await unsubscribe();
    }
  };

  // Handler pour envoyer une notification de test
  const handleSendTest = async () => {
    if (!user) return;
    setIsSendingTest(true);
    try {
      const success = await pushService.sendNotification({
        title: "🔔 Notification de test",
        message: "Vos notifications fonctionnent correctement !",
        userId: user.id,
      });
      toast({
        title: success ? "Notification envoyée" : "Échec de l'envoi",
        description: success
          ? "Vous devriez recevoir la notification dans quelques secondes."
          : "Impossible d'envoyer la notification de test.",
        variant: success ? "default" : "destructive",
      });
    } finally {
      setIsSendingTest(false);
    }
  };

  // Obtenir le statut des notifications push
  const getNotificationStatus = () => {
    if (!isSupported) {
      return { status: "unsupported", label: "Non supporté", variant: "secondary" as const };
    }
    if (permission === "denied") {
      return { status: "denied", label: "Refusé", variant: "destructive" as const };
    }
    if (isSubscribed) {
      return { status: "active", label: "Actif", variant: "default" as const };
    }
    return { status: "inactive", label: "Inactif", variant: "outline" as const };
  };

  // Description dynamique des notifications
  const getNotificationDescription = () => {
    if (!isSupported) return "Non disponible sur ce navigateur";
    if (permission === "denied") return "Autorisation bloquée dans le navigateur";
    if (isSubscribed) return "Recevez vos rappels quotidiens";
    return "Activez pour recevoir vos rappels";
  };

  const notificationStatus = getNotificationStatus();
  const settingsGroups = [
    {
      title: "Profil",
      options: [
        {
          label: "Informations personnelles",
          description: "Nom, email, photo de profil",
          icon: User,
          action: "navigate",
          to: "/profile/edit",
        },
      ],
    },
    ...(isPremium ? [{
      title: "Notifications",
      status: notificationStatus,
      options: [
        {
          label: "Notifications push",
          description: getNotificationDescription(),
          icon: Bell,
          action: "toggle",
          badge: notificationStatus,
        },
      ],
    }] : [{
      title: "Notifications",
      options: [
        {
          label: "Notifications push",
          description: "Réservé aux abonnés Premium",
          icon: Bell,
          action: "navigate",
          to: "/premium",
          badge: { status: "premium" as const, label: "Premium", variant: "secondary" as const },
        },
      ],
    }]),
    {
      title: "Apparence",
      options: [
        {
          label: "Thème de l'application",
          description: "Choisir le thème d'affichage",
          icon: Moon,
          action: "theme-selector",
        },
      ],
    },
    {
      title: "Confidentialité",
      options: [
        {
          label: "Données et confidentialité",
          description: "Gérer vos données personnelles",
          icon: Shield,
          action: "navigate",
          to: "/profile/privacy",
        },
      ],
    },
    {
      title: "Support",
      options: [
        {
          label: "Aide et support",
          description: "FAQ et centre d'aide",
          icon: HelpCircle,
          action: "navigate",
          to: "/profile/help",
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link to="/profile">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-foreground">Paramètres</h1>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="px-6 py-6 space-y-6">
        {settingsGroups.map((group, groupIndex) => (
          <Card key={groupIndex}>
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-foreground mb-4">{group.title}</h2>
              <div className="space-y-4">
                {group.options.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <option.icon className="h-5 w-5 text-muted-foreground" />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <p className="font-medium text-foreground">{option.label}</p>
                          {option.badge && (
                            <Badge variant={option.badge.variant}>
                              {option.badge.status === "active" && <Check className="h-3 w-3 mr-1" />}
                              {option.badge.status === "denied" && <X className="h-3 w-3 mr-1" />}
                              {option.badge.status === "unsupported" && <AlertCircle className="h-3 w-3 mr-1" />}
                              {option.badge.label}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                    {option.action === "theme-selector" && (
                      <Select
                        value={theme}
                        onValueChange={(value) => setTheme(value as "light" | "dark" | "system")}
                      >
                        <SelectTrigger className="w-[180px]">
                          <SelectValue placeholder="Sélectionner un thème" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Clair</SelectItem>
                          <SelectItem value="dark">Sombre</SelectItem>
                          <SelectItem value="system">Système</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    {option.action === "toggle" && (
                      <Switch
                        checked={isSubscribed}
                        onCheckedChange={handleNotificationToggle}
                        disabled={isLoading || !isSupported || permission === "denied"}
                      />
                    )}
                    {option.action === "navigate" && (
                      <Link to={option.to || "#"}>
                        <Button variant="ghost" size="sm">
                          Gérer
                        </Button>
                      </Link>
                    )}
                  </div>
                ))}
                {group.title === "Notifications" && isPremium && isSubscribed && (
                  <Button
                    onClick={handleSendTest}
                    disabled={isSendingTest}
                    variant="outline"
                    className="w-full mt-2"
                  >
                    {isSendingTest ? (
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Envoyer une notification de test
                  </Button>
                )}
                {group.title === "Notifications" && isPremium && <PushDiagnosticsPanel />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProfileSettings;
