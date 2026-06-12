import React, { useState } from 'react';
import { ArrowLeft, Download, Trash2, Shield, FileText, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Page de gestion des données personnelles et confidentialité (RGPD)
 */
const ProfilePrivacy = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  /**
   * Exporte toutes les données de l'utilisateur en JSON
   */
  const handleExportData = async () => {
    if (!user) return;
    
    setIsExporting(true);
    try {
      // Récupérer toutes les données de l'utilisateur
      const [profileRes, progressRes, badgesRes, notifPrefsRes, notifLogsRes, devicesRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', user.id).single(),
        supabase.from('user_progress').select('*').eq('user_id', user.id),
        supabase.from('user_badges').select('*, badges(*)').eq('user_id', user.id),
        supabase.from('notification_preferences').select('*').eq('user_id', user.id),
        supabase.from('notification_logs').select('*').eq('user_id', user.id),
        supabase.from('user_devices').select('*').eq('user_id', user.id)
      ]);

      const userData = {
        exportDate: new Date().toISOString(),
        account: {
          email: user.email,
          createdAt: user.created_at
        },
        profile: profileRes.data,
        progress: progressRes.data,
        badges: badgesRes.data,
        notificationPreferences: notifPrefsRes.data,
        notificationLogs: notifLogsRes.data,
        devices: devicesRes.data
      };

      // Créer et télécharger le fichier JSON
      const blob = new Blob([JSON.stringify(userData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `beree-mes-donnees-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success('Vos données ont été exportées avec succès');
    } catch (error) {
      console.error('Erreur lors de l\'export:', error);
      toast.error('Erreur lors de l\'export des données');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Supprime définitivement le compte utilisateur
   */
  const handleDeleteAccount = async () => {
    if (!user || confirmEmail !== user.email) {
      toast.error('L\'email saisi ne correspond pas à votre compte');
      return;
    }

    setIsDeleting(true);
    try {
      const response = await supabase.functions.invoke('delete-user-account', {
        body: { userId: user.id }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      toast.success('Votre compte a été supprimé avec succès');
      setDeleteDialogOpen(false);
      
      // Déconnecter et rediriger
      await supabase.auth.signOut();
      navigate('/');
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast.error('Erreur lors de la suppression du compte. Veuillez réessayer.');
    } finally {
      setIsDeleting(false);
    }
  };

  const privacyPolicySections = [
    {
      id: "data-collected",
      title: "Données collectées",
      content: `Nous collectons les données suivantes :
• Email et nom (lors de l'inscription)
• Progression de lecture (chapitres lus, dates)
• Badges et récompenses obtenus
• Préférences de notifications
• Identifiants d'appareils (pour les notifications push)`
    },
    {
      id: "data-purpose",
      title: "Finalité du traitement",
      content: `Vos données sont utilisées pour :
• Gérer votre compte et authentification
• Suivre votre progression de lecture
• Vous envoyer des rappels et notifications
• Améliorer l'expérience utilisateur
• Calculer vos statistiques et badges`
    },
    {
      id: "data-retention",
      title: "Durée de conservation",
      content: `Vos données sont conservées pendant toute la durée d'utilisation de votre compte.

En cas de suppression de compte, toutes vos données sont immédiatement et définitivement effacées de nos serveurs.`
    },
    {
      id: "your-rights",
      title: "Vos droits RGPD",
      content: `Conformément au RGPD, vous disposez des droits suivants :
• Droit d'accès : obtenir une copie de vos données
• Droit de rectification : modifier vos informations
• Droit à l'effacement : supprimer votre compte et données
• Droit à la portabilité : exporter vos données
• Droit d'opposition : refuser certains traitements

Ces droits peuvent être exercés depuis cette page ou en nous contactant.`
    },
    {
      id: "subprocessors",
      title: "Sous-traitants",
      content: `Nous utilisons les services suivants pour héberger et traiter vos données :
• Supabase (hébergement base de données et authentification) - Données hébergées en Europe

Ces sous-traitants sont tenus contractuellement de protéger vos données.`
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link to="/profile/settings">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-foreground">Données et confidentialité</h1>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="px-6 py-6 space-y-6 max-w-3xl mx-auto">
        {/* Politique de confidentialité */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="h-5 w-5 text-primary" />
              <span>Politique de confidentialité</span>
            </CardTitle>
            <CardDescription>
              Comment nous collectons et utilisons vos données
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              {privacyPolicySections.map((section) => (
                <AccordionItem key={section.id} value={section.id}>
                  <AccordionTrigger className="text-left">
                    {section.title}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {section.content}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Export des données */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Download className="h-5 w-5 text-primary" />
              <span>Exporter mes données</span>
            </CardTitle>
            <CardDescription>
              Téléchargez une copie de toutes vos données personnelles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Conformément à votre droit à la portabilité (RGPD), vous pouvez télécharger 
              l'ensemble de vos données au format JSON.
            </p>
            <Button 
              onClick={handleExportData} 
              disabled={isExporting}
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Export en cours...' : 'Télécharger mes données'}
            </Button>
          </CardContent>
        </Card>

        {/* Suppression du compte */}
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-destructive">
              <Trash2 className="h-5 w-5" />
              <span>Supprimer mon compte</span>
            </CardTitle>
            <CardDescription>
              Action irréversible - toutes vos données seront supprimées
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-destructive/10 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="h-5 w-5 text-destructive mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-destructive">Attention</p>
                  <p className="text-muted-foreground mt-1">
                    La suppression de votre compte est définitive et irréversible. 
                    Toutes vos données seront immédiatement effacées :
                  </p>
                  <ul className="list-disc list-inside text-muted-foreground mt-2 space-y-1">
                    <li>Votre progression de lecture</li>
                    <li>Vos badges et récompenses</li>
                    <li>Vos préférences et paramètres</li>
                    <li>Votre historique de notifications</li>
                  </ul>
                </div>
              </div>
            </div>

            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full sm:w-auto">
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer définitivement mon compte
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmer la suppression du compte</AlertDialogTitle>
                  <AlertDialogDescription className="space-y-4">
                    <p>
                      Cette action est irréversible. Toutes vos données seront 
                      définitivement supprimées de nos serveurs.
                    </p>
                    <div className="space-y-2">
                      <Label htmlFor="confirm-email">
                        Pour confirmer, saisissez votre email : <strong>{user?.email}</strong>
                      </Label>
                      <Input
                        id="confirm-email"
                        type="email"
                        placeholder="Votre email"
                        value={confirmEmail}
                        onChange={(e) => setConfirmEmail(e.target.value)}
                      />
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel onClick={() => setConfirmEmail('')}>
                    Annuler
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    disabled={isDeleting || confirmEmail !== user?.email}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    {isDeleting ? 'Suppression...' : 'Supprimer mon compte'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>

        {/* Lien vers CGU */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Conditions Générales d'Utilisation</p>
                  <p className="text-sm text-muted-foreground">Consulter les CGU de l'application</p>
                </div>
              </div>
              <Link to="/terms">
                <Button variant="outline" size="sm">
                  Lire
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Pour toute question concernant vos données, contactez notre DPO à{' '}
              <a href="mailto:privacy@beree.app" className="text-primary hover:underline">
                privacy@beree.app
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePrivacy;
