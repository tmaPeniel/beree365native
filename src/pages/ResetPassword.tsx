/**
 * Page de réinitialisation de mot de passe
 * Traite explicitement le token de recovery avec setSession()
 */

import React, { useEffect, useState, useRef } from 'react';
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
  const hasProcessedToken = useRef(false);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    },
  });

  // Traitement du token de recovery
  useEffect(() => {
    // Ne traiter qu'une seule fois
    if (hasProcessedToken.current) return;

    const processRecoveryToken = async () => {
      const hash = window.location.hash;
      const params = new URLSearchParams(hash.replace('#', ''));
      const accessToken = params.get('access_token');
      const refreshToken = params.get('refresh_token');
      const type = params.get('type');

      console.log("Processing recovery token:", { type, hasToken: !!accessToken });

      // Si c'est une URL de recovery avec un token valide
      if (type === 'recovery' && accessToken) {
        hasProcessedToken.current = true;
        
        try {
          // Établir la session manuellement avec le token
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || ''
          });

          if (error) {
            console.error("Erreur setSession:", error);
            setIsValidToken(false);
            toast.error("Lien de réinitialisation invalide ou expiré");
            setTimeout(() => navigate('/forgot-password'), 2000);
          } else if (data.session) {
            console.log("Session établie avec succès");
            setIsValidToken(true);
            // Nettoyer le hash de l'URL
            window.history.replaceState({}, '', '/reset-password');
            toast.success("Lien valide. Définissez votre nouveau mot de passe.");
          }
        } catch (err) {
          console.error("Erreur lors du traitement du token:", err);
          setIsValidToken(false);
          toast.error("Erreur lors de la vérification du lien");
          setTimeout(() => navigate('/forgot-password'), 2000);
        }
        return;
      }

      // Fallback: écouter l'événement PASSWORD_RECOVERY
      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        console.log("Auth event in ResetPassword:", event);
        
        if (event === 'PASSWORD_RECOVERY' && !hasProcessedToken.current) {
          hasProcessedToken.current = true;
          setIsValidToken(true);
          toast.success("Lien valide. Définissez votre nouveau mot de passe.");
        }
      });

      // Vérifier si une session recovery existe déjà
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && !hasProcessedToken.current) {
        console.log("Session existante trouvée");
        hasProcessedToken.current = true;
        setIsValidToken(true);
      } else if (!hasProcessedToken.current) {
        // Aucun token et pas de session - timeout plus long
        const timeoutId = setTimeout(() => {
          if (!hasProcessedToken.current) {
            console.log("Timeout - lien invalide");
            hasProcessedToken.current = true;
            setIsValidToken(false);
            toast.error("Lien de réinitialisation invalide ou expiré");
            navigate('/forgot-password');
          }
        }, 5000);

        return () => {
          clearTimeout(timeoutId);
          subscription.unsubscribe();
        };
      }

      return () => subscription.unsubscribe();
    };

    processRecoveryToken();
  }, [navigate]);

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
