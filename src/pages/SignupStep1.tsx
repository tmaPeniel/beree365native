/**
 * Première étape de l'inscription
 * Collecte les informations de base de l'utilisateur
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertCircle, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { cn } from "@/lib/utils";

// Schéma pour la première étape
const step1Schema = z.object({
  email: z.string().email({ message: "Adresse email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  startDate: z.date({ required_error: "La date de début est requise" })
});

type Step1FormValues = z.infer<typeof step1Schema>;

const SignupStep1 = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  
  const form = useForm<Step1FormValues>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      startDate: new Date()
    },
  });
  
  const handleSubmit = (values: Step1FormValues) => {
    // Stocker les données temporairement dans localStorage
    localStorage.setItem('signupData', JSON.stringify(values));
    // Naviguer vers la sélection du plan
    navigate('/signup/plan');
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 animate-fade-in">
      <Card className="w-[350px] md:w-[450px] shadow-lg border-t-4 border-t-green-500">
        <CardHeader className="text-center">
          <h1 className="font-bold text-xl md:text-2xl">Inscription</h1>
          <p className="text-sm text-muted-foreground">Étape 1 sur 2 - Informations personnelles</p>
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
              
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                Suivant <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </form>
          </Form>
        </CardContent>
        
        <CardFooter className="flex justify-center">
          <Button 
            variant="link" 
            onClick={() => navigate('/login')} 
            className="text-green-600 hover:text-green-700 w-full"
          >
            Déjà un compte? Se connecter
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignupStep1;