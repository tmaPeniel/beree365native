/**
 * Page de réinitialisation de mot de passe
 * Utilise l'événement PASSWORD_RECOVERY pour éviter les race conditions
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { updatePassword } from '@/services/auth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Schéma de validation pour le formulaire
const resetPasswordSchema = z.object({
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
  confirmPassword: z.string().min(6, { message: "Veuillez confirmer votre mot de passe" })
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"],
});

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

/**
 * Page de réinitialisation de mot de passe
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    },
  });

  // Écouter l'événement PASSWORD_RECOVERY pour éviter les race conditions
  useEffect(() => {
    // Configurer le listener AVANT de vérifier la session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("Auth event:", event);
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log("PASSWORD_RECOVERY event reçu - Token valide");
        setIsValidToken(true);
        toast.success("Lien de réinitialisation valide. Définissez votre nouveau mot de passe.");
      } else if (event === 'SIGNED_IN' && isValidToken === true) {
        // Après mise à jour du mot de passe, l'utilisateur est connecté
        console.log("Utilisateur connecté après réinitialisation");
      } else if (event === 'TOKEN_REFRESHED') {
        // Token rafraîchi, garder l'état actuel
        console.log("Token rafraîchi");
      }
    });

    // Vérifier s'il y a déjà une session recovery en cours
    const checkExistingSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // Si on a une session et qu'on n'a pas encore validé le token
      if (session?.user && isValidToken === null) {
        // Vérifier si l'URL contient les paramètres de recovery
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.replace('#', ''));
        const type = params.get('type');
        
        if (type === 'recovery') {
          console.log("Session recovery détectée via URL hash");
          setIsValidToken(true);
        } else {
          // Session existante mais pas de recovery - peut-être déjà traité
          console.log("Session existante trouvée, vérification du contexte...");
          // On attend un court instant pour laisser l'événement PASSWORD_RECOVERY se déclencher
          setTimeout(() => {
            if (isValidToken === null) {
              console.log("Timeout - pas d'événement PASSWORD_RECOVERY, redirection");
              setIsValidToken(false);
              toast.error("Lien de réinitialisation invalide ou expiré");
              navigate('/forgot-password');
            }
          }, 2000);
        }
      } else if (!session && isValidToken === null) {
        // Pas de session - attendre l'événement PASSWORD_RECOVERY
        console.log("Pas de session, attente de l'événement PASSWORD_RECOVERY...");
        // Timeout pour gérer le cas où aucun événement n'arrive
        setTimeout(() => {
          if (isValidToken === null) {
            console.log("Timeout - aucun événement reçu, lien invalide");
            setIsValidToken(false);
            toast.error("Lien de réinitialisation invalide ou expiré");
            navigate('/forgot-password');
          }
        }, 3000);
      }
    };

    checkExistingSession();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, isValidToken]);

  /**
   * Gère la soumission du formulaire
   */
  const handleSubmit = async (values: ResetPasswordFormValues) => {
    setIsLoading(true);
    
    try {
      console.log("Tentative de mise à jour du mot de passe...");
      const result = await updatePassword(values.password);
      if (result.success) {
        toast.success("Mot de passe mis à jour avec succès !");
        navigate('/dashboard');
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du mot de passe:", error);
      toast.error("Erreur lors de la mise à jour du mot de passe");
    } finally {
      setIsLoading(false);
    }
  };

  // Affichage pendant la vérification du token
  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Vérification du lien de réinitialisation...</p>
        </div>
      </div>
    );
  }

  // Affichage si le token est invalide
  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background animate-fade-in">
        <Card className="w-[400px] shadow-lg border-t-4 border-t-destructive">
          <CardHeader className="text-center">
            <h1 className="text-2xl font-bold text-destructive">Lien invalide</h1>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Le lien de réinitialisation est invalide ou a expiré.
            </p>
            <p className="text-sm text-muted-foreground">
              Vous allez être redirigé vers la page de demande de réinitialisation...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background animate-fade-in">
      <Card className="w-[400px] shadow-lg border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
          <p className="text-muted-foreground">
            Choisissez votre nouveau mot de passe
          </p>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nouveau mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmer le mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? "Mise à jour..." : "Mettre à jour le mot de passe"}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResetPassword;
