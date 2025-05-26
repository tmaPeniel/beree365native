
/**
 * Page de réinitialisation de mot de passe
 * Permet aux utilisateurs de définir un nouveau mot de passe via le lien reçu par email
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

  // Vérifier si l'utilisateur a un token de réinitialisation valide
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        setIsValidToken(true);
      } else {
        setIsValidToken(false);
        toast.error("Lien de réinitialisation invalide ou expiré");
        setTimeout(() => {
          navigate('/forgot-password');
        }, 3000);
      }
    };

    checkSession();
  }, [navigate]);

  /**
   * Gère la soumission du formulaire
   */
  const handleSubmit = async (values: ResetPasswordFormValues) => {
    setIsLoading(true);
    
    try {
      const result = await updatePassword(values.password);
      if (result.success) {
        toast.success("Mot de passe mis à jour avec succès !");
        navigate('/dashboard');
      }
    } catch (error) {
      console.error("Erreur lors de la mise à jour du mot de passe:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Affichage pendant la vérification du token
  if (isValidToken === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
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
