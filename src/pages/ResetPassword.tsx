
/**
 * Page de réinitialisation de mot de passe
 * Permet aux utilisateurs de définir un nouveau mot de passe via le lien reçu par email
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isValidToken, setIsValidToken] = useState<boolean | null>(null);

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: "",
      confirmPassword: ""
    },
  });

  // Vérifier et traiter les tokens de réinitialisation
  useEffect(() => {
    const handlePasswordReset = async () => {
      console.log("Vérification des paramètres URL...");
      
      // Récupérer les tokens depuis l'URL
      const accessToken = searchParams.get('access_token');
      const refreshToken = searchParams.get('refresh_token');
      const type = searchParams.get('type');
      
      console.log("Paramètres URL:", { accessToken: !!accessToken, refreshToken: !!refreshToken, type });
      
      // Vérifier si c'est bien un lien de réinitialisation de mot de passe
      if (type === 'recovery' && accessToken && refreshToken) {
        try {
          console.log("Tentative de définition de la session avec les tokens...");
          
          // Définir la session avec les tokens reçus
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            console.error("Erreur lors de la définition de la session:", error);
            throw error;
          }
          
          if (data.session && data.user) {
            console.log("Session définie avec succès pour l'utilisateur:", data.user.id);
            setIsValidToken(true);
            toast.success("Lien de réinitialisation valide. Vous pouvez maintenant définir votre nouveau mot de passe.");
          } else {
            console.error("Session ou utilisateur manquant après setSession");
            throw new Error("Session invalide");
          }
        } catch (error: any) {
          console.error("Erreur lors du traitement du token:", error);
          setIsValidToken(false);
          toast.error("Lien de réinitialisation invalide ou expiré");
          setTimeout(() => {
            navigate('/forgot-password');
          }, 3000);
        }
      } else {
        console.log("Paramètres manquants ou type incorrect:", { type, hasAccessToken: !!accessToken, hasRefreshToken: !!refreshToken });
        
        // Vérifier s'il y a une session existante
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          console.log("Session existante trouvée");
          setIsValidToken(true);
        } else {
          console.log("Aucune session valide trouvée");
          setIsValidToken(false);
          toast.error("Lien de réinitialisation invalide ou expiré");
          setTimeout(() => {
            navigate('/forgot-password');
          }, 3000);
        }
      }
    };

    handlePasswordReset();
  }, [navigate, searchParams]);

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
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification du lien de réinitialisation...</p>
        </div>
      </div>
    );
  }

  // Affichage si le token est invalide
  if (isValidToken === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 animate-fade-in">
        <Card className="w-[400px] shadow-lg border-t-4 border-t-red-500">
          <CardHeader className="text-center">
            <h1 className="text-2xl font-bold text-red-600">Lien invalide</h1>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Le lien de réinitialisation est invalide ou a expiré.
            </p>
            <p className="text-sm text-gray-500">
              Vous allez être redirigé vers la page de demande de réinitialisation...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 animate-fade-in">
      <Card className="w-[400px] shadow-lg border-t-4 border-t-green-500">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-bold">Nouveau mot de passe</h1>
          <p className="text-gray-600">
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
                className="w-full bg-green-600 hover:bg-green-700"
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
