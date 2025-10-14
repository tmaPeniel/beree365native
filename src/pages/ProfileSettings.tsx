import React, { useState, useEffect } from "react";
import { ArrowLeft, User, Bell, Moon, Shield, HelpCircle, Check, X, AlertCircle } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { useTheme } from "@/providers/ThemeProvider";
import { useUnifiedPushNotifications } from "@/hooks/useUnifiedPushNotifications";
import { preferencesService } from "@/services/notifications/preferencesService";
import { NotificationPreferences } from "@/types/notifications";

/**
 * Page des paramètres utilisateur
 */
const ProfileSettings = () => {
  const { theme, setTheme } = useTheme();
  const { isSupported, isSubscribed, permission } = useUnifiedPushNotifications();
  const [preferences, setPreferences] = useState<NotificationPreferences>({});
  const [isLoading, setIsLoading] = useState(true);

  // Charger les préférences au montage
  useEffect(() => {
    const loadPreferences = async () => {
      const prefs = await preferencesService.get();
      setPreferences(prefs);
      setIsLoading(false);
    };
    loadPreferences();
  }, []);

  // Mettre à jour les préférences
  const updatePreference = async (key: keyof NotificationPreferences, value: boolean) => {
    const newPrefs = { ...preferences, [key]: value };
    setPreferences(newPrefs);
    await preferencesService.update(newPrefs);
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
    {
      title: "Notifications",
      status: notificationStatus,
      options: [
        {
          label: "Notifications push",
          description: `Statut: ${notificationStatus.label}`,
          icon: Bell,
          action: "navigate",
          to: "/profile/notifications",
          badge: notificationStatus,
        },
      ],
    },
    {
      title: "Apparence",
      options: [
        {
          label: "Mode sombre",
          description: "Activer le thème sombre",
          icon: Moon,
          action: "toggle",
          defaultValue: theme === "dark",
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
                    {option.action === "toggle" && (
                      <Switch
                        checked={
                          option.label === "Mode sombre"
                            ? theme === "dark"
                            : option.key
                              ? option.value
                              : option.defaultValue
                        }
                        onCheckedChange={async (checked) => {
                          if (option.label === "Mode sombre") {
                            setTheme(checked ? "dark" : "light");
                          } else if (option.key) {
                            await updatePreference(option.key as keyof NotificationPreferences, checked);
                          }
                        }}
                        disabled={isLoading}
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
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ProfileSettings;
