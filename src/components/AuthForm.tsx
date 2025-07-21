
/**
 * Formulaire d'authentification
 * Gère à la fois la connexion et l'inscription des utilisateurs
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { AlertCircle } from 'lucide-react';
import { cn } from "@/lib/utils";

// Types pour les propriétés du composant
interface AuthFormProps {
  isLogin: boolean;
  toggleForm: () => void;
  onSubmit: (data: { email: string; password: string; name?: string; startDate?: Date }) => void;
}

// Schéma pour le formulaire de connexion
const loginSchema = z.object({
  email: z.string().email({ message: "Adresse email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" })
});

// Schéma pour le formulaire d'inscription
const signupSchema = z.object({
  email: z.string().email({ message: "Adresse email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  startDate: z.date({ required_error: "La date de début est requise" })
});

// Types basés sur les schémas
type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

/**
 * Composant de formulaire d'authentification
 */
const AuthForm: React.FC<AuthFormProps> = ({ isLogin, toggleForm, onSubmit }) => {
  /**
   * Formulaire pour la connexion
   */
  const LoginForm = () => {
    const form = useForm<LoginFormValues>({
      resolver: zodResolver(loginSchema),
      defaultValues: {
        email: "",
        password: ""
      },
    });
    
    const handleSubmit = (values: LoginFormValues) => {
      console.log("Soumission du formulaire de connexion avec:", values);
      onSubmit({
        email: values.email,
        password: values.password
      });
    };
    
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
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
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
                    className={cn(fieldState.error && "border-destructive focus-visible:ring-destructive")}
                    {...field} 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="text-right">
            <Link 
              to="/forgot-password"
              className="text-sm text-green-600 hover:text-green-700 underline"
            >
              Mot de passe oublié ?
            </Link>
          </div>
          
          <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
            Se connecter
          </Button>
        </form>
      </Form>
    );
  };
  
  /**
   * Formulaire pour l'inscription
   */
  const SignupForm = () => {
    const form = useForm<SignupFormValues>({
      resolver: zodResolver(signupSchema),
      defaultValues: {
        email: "",
        password: "",
        name: "",
        startDate: new Date()
      },
    });
    
    const handleSubmit = (values: SignupFormValues) => {
      onSubmit({
        email: values.email,
        password: values.password,
        name: values.name,
        startDate: values.startDate
      });
    };
    
    return (
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
                  <Input 
                    type="password" 
                    placeholder="••••••••" 
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
            S'inscrire
          </Button>
        </form>
      </Form>
    );
  };

  return (
    <Card className="w-[350px] md:w-[450px] shadow-lg border-t-4 border-t-green-500">
      <CardHeader className="text-center font-bold text-xl md:text-2xl">
        {isLogin ? "Connexion" : "Inscription"}
      </CardHeader>
      
      <CardContent>
        {isLogin ? <LoginForm /> : <SignupForm />}
      </CardContent>
      
      <CardFooter className="flex justify-center">
        <Button variant="link" onClick={toggleForm} className="text-green-600 hover:text-green-700 w-full">
          {isLogin 
            ? "Pas encore de compte? S'inscrire" 
            : "Déjà un compte? Se connecter"}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default AuthForm;
