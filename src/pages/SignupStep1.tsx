/**
 * Inscription (étape unique)
 * Collecte les informations de base + code premium optionnel
 */

import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertCircle, Eye, EyeOff, CheckCircle, KeyRound } from 'lucide-react';
import { cn } from "@/lib/utils";
import { signUp } from '@/services/authService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const signupSchema = z.object({
  email: z.string().email({ message: "Adresse email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  startDate: z.date({ required_error: "La date de début est requise" }),
  premiumCode: z.string().trim().max(50, { message: "Code trop long" }).optional().or(z.literal('')),
  acceptTerms: z.boolean().refine(val => val === true, {
    message: "Vous devez accepter les CGU pour vous inscrire"
  })
});

type SignupFormValues = z.infer<typeof signupSchema>;

const SignupStep1 = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      startDate: new Date(),
      premiumCode: "",
      acceptTerms: false
    },
  });

  const handleSubmit = async (values: SignupFormValues) => {
    setIsLoading(true);
    try {
      const startDateStr = values.startDate instanceof Date
        ? values.startDate.toISOString().split('T')[0]
        : new Date(values.startDate).toISOString().split('T')[0];

      const result = await signUp(values.email, values.password, values.name, startDateStr);

      if (!result.success) {
        return;
      }

      const code = (values.premiumCode ?? '').trim();
      if (code.length > 0) {
        const { data, error } = await supabase.rpc('redeem_premium_signup_code', { _code: code });
        if (error) {
          console.warn('Redeem error:', error);
          toast.error("Code premium invalide. Compte créé en version gratuite.");
        } else {
          const res = data as { success: boolean; error?: string; duration_months?: number } | null;
          if (res?.success) {
            toast.success(`Code accepté ! Premium activé pour ${res.duration_months ?? 12} mois 🎉`);
          } else {
            const map: Record<string, string> = {
              invalid_code: "Code invalide.",
              inactive_code: "Ce code n'est plus actif.",
              expired_code: "Ce code a expiré.",
              code_exhausted: "Ce code a atteint sa limite d'utilisation.",
              already_redeemed: "Ce code a déjà été utilisé.",
              empty_code: "Code vide.",
            };
            toast.error(map[res?.error ?? ''] ?? "Code premium invalide. Compte créé en version gratuite.");
          }
        }
      }

      navigate('/dashboard');
    } catch (e) {
      console.error('Signup error', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background animate-fade-in p-4">
      <Card className="w-[350px] md:w-[450px] shadow-lg border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <h1 className="font-bold text-xl md:text-2xl">Inscription</h1>
          <p className="text-sm text-muted-foreground">Créez votre compte</p>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={cn(fieldState.error && "text-destructive")}>
                      Nom complet
                      {fieldState.error && <AlertCircle className="inline w-4 h-4 ml-1" />}
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Nom complet"
                        className={cn(fieldState.error && "border-destructive focus-visible:ring-destructive")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={cn(fieldState.error && "text-destructive")}>
                      Email
                      {fieldState.error && <AlertCircle className="inline w-4 h-4 ml-1" />}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="votre@email.com"
                        className={cn(fieldState.error && "border-destructive focus-visible:ring-destructive")}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={cn(fieldState.error && "text-destructive")}>
                      Mot de passe
                      {fieldState.error && <AlertCircle className="inline w-4 h-4 ml-1" />}
                    </FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          type={showPassword ? "text" : "password"}
                          placeholder="••••••••"
                          className={cn(fieldState.error && "border-destructive focus-visible:ring-destructive", "pr-10")}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="startDate"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel className={cn(fieldState.error && "text-destructive")}>
                      Date de début du plan de lecture
                      {fieldState.error && <AlertCircle className="inline w-4 h-4 ml-1" />}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type="date"
                        className={cn(fieldState.error && "border-destructive focus-visible:ring-destructive")}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : new Date();
                          field.onChange(date);
                        }}
                        value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="premiumCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center gap-1">
                      <KeyRound className="w-4 h-4" /> Code secret <span className="text-muted-foreground font-normal">(optionnel)</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Code premium"
                        autoCapitalize="characters"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">
                      Si vous avez reçu un code, saisissez-le pour activer la version premium.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="acceptTerms"
                render={({ field, fieldState }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel className={cn(fieldState.error && "text-destructive", "text-sm font-normal")}>
                        J'accepte les{' '}
                        <Link to="/terms" target="_blank" className="text-primary hover:underline font-medium">
                          Conditions Générales d'Utilisation
                        </Link>
                        {' '}et la{' '}
                        <Link to="/cookies" target="_blank" className="text-primary hover:underline font-medium">
                          Politique de cookies
                        </Link>
                        {' '}*
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )}
              />

              <Button type="submit" disabled={isLoading} className="w-full bg-primary hover:bg-primary/90">
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                    Inscription...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    S'inscrire
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>

        <CardFooter className="flex justify-center">
          <Button
            variant="link"
            onClick={() => navigate('/login')}
            className="text-primary hover:text-primary/80 w-full"
          >
            Déjà un compte? Se connecter
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignupStep1;
