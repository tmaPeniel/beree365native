import React from 'react';
import { ArrowLeft, User, Bell, Moon, Shield, HelpCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useTheme } from '@/providers/ThemeProvider';

/**
 * Page des paramètres utilisateur
 */
const ProfileSettings = () => {
  const { theme, setTheme } = useTheme();
  const settingsGroups = [
    {
      title: 'Profil',
      options: [
        {
          label: 'Informations personnelles',
          description: 'Nom, email, photo de profil',
          icon: User,
          action: 'navigate',
          to: '/profile/edit'
        }
      ]
    },
    {
      title: 'Notifications',
      options: [
        {
          label: 'Rappels de lecture',
          description: 'Recevoir des rappels quotidiens',
          icon: Bell,
          action: 'toggle',
          defaultValue: true
        },
        {
          label: 'Versets du jour',
          description: 'Notifications pour le verset quotidien',
          icon: Bell,
          action: 'toggle',
          defaultValue: true
        }
      ]
    },
    {
      title: 'Apparence',
      options: [
        {
          label: 'Mode sombre',
          description: 'Activer le thème sombre',
          icon: Moon,
          action: 'toggle',
          defaultValue: theme === 'dark'
        }
      ]
    },
    {
      title: 'Confidentialité',
      options: [
        {
          label: 'Données et confidentialité',
          description: 'Gérer vos données personnelles',
          icon: Shield,
          action: 'navigate',
          to: '/profile/privacy'
        }
      ]
    },
    {
      title: 'Support',
      options: [
        {
          label: 'Aide et support',
          description: 'FAQ et centre d\'aide',
          icon: HelpCircle,
          action: 'navigate',
          to: '/profile/help'
        }
      ]
    }
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
              <h2 className="text-lg font-semibold text-foreground mb-4">
                {group.title}
              </h2>
              <div className="space-y-4">
                {group.options.map((option, optionIndex) => (
                  <div key={optionIndex} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <option.icon className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <p className="font-medium text-foreground">{option.label}</p>
                        <p className="text-sm text-muted-foreground">{option.description}</p>
                      </div>
                    </div>
                    {option.action === 'toggle' && (
                      <Switch 
                        checked={option.label === 'Mode sombre' ? theme === 'dark' : option.defaultValue}
                        onCheckedChange={(checked) => {
                          if (option.label === 'Mode sombre') {
                            setTheme(checked ? 'dark' : 'light');
                          }
                        }}
                      />
                    )}
                    {option.action === 'navigate' && (
                      <Link to={option.to || '#'}>
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