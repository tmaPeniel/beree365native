
/**
 * Page de demande de réinitialisation de mot de passe
 * Permet aux utilisateurs de demander un lien de réinitialisation par email
 */

import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { resetPassword } from '@/services/auth';
import { ArrowLeft } from 'lucide-react';

// Schéma de validation pour le formulaire
const forgotPasswordSchema = z.object({
  email: z.string().email({ message: "Adresse email invalide" })
});

type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;

/**
 * Page de demande de réinitialisation de mot de passe
 */
const ForgotPassword = () => {
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: ""
    },
  });

  /**
   * Gère la soumission du formulaire
   */
  const handleSubmit = async (values: ForgotPasswordFormValues) => {
    setIsLoading(true);
    
    try {
      const result = await resetPassword(values.email);
      if (result.success) {
        setIsSubmitted(true);
      }
    } catch (error) {
      console.error("Erreur lors de la demande de réinitialisation:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 animate-fade-in">
        <Card className="w-[400px] shadow-lg border-t-4 border-t-green-500">
          <CardHeader className="text-center">
            <h1 className="text-2xl font-bold text-green-600">Email envoyé !</h1>
          </CardHeader>
          
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Nous avons envoyé un lien de réinitialisation à votre adresse email.
            </p>
            <p className="text-sm text-gray-500">
              Vérifiez votre boîte de réception et cliquez sur le lien pour réinitialiser votre mot de passe.
            </p>
          </CardContent>
          
          <CardFooter className="flex justify-center">
            <Link to="/login">
              <Button variant="link" className="text-green-600 hover:text-green-700">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Retour à la connexion
              </Button>
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 animate-fade-in">
      <Card className="w-[400px] shadow-lg border-t-4 border-t-green-500">
        <CardHeader className="text-center">
          <h1 className="text-2xl font-bold">Mot de passe oublié</h1>
          <p className="text-gray-600">
            Entrez votre adresse email pour recevoir un lien de réinitialisation
          </p>
        </CardHeader>
        
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="votre@email.com" {...field} />
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
                {isLoading ? "Envoi en cours..." : "Envoyer le lien"}
              </Button>
            </form>
          </Form>
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <Link to="/login">
            <Button variant="link" className="text-green-600 hover:text-green-700">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Retour à la connexion
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};

export default ForgotPassword;
