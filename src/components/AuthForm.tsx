
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

interface AuthFormProps {
  isLogin: boolean;
  toggleForm: () => void;
  onSubmit: (data: { email: string; password: string; name?: string; startDate?: Date }) => void;
}

// Login schema requires only email and password
const loginSchema = z.object({
  email: z.string().email({ message: "Adresse email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" })
});

// Signup schema requires email, password, name and startDate
const signupSchema = z.object({
  email: z.string().email({ message: "Adresse email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  startDate: z.date({ required_error: "La date de début est requise" })
});

// Define types based on the schemas
type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;

const AuthForm: React.FC<AuthFormProps> = ({ isLogin, toggleForm, onSubmit }) => {
  // Use the appropriate schema and default values based on isLogin
  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: ""
    },
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      email: "",
      password: "",
      name: "",
      startDate: new Date()
    },
  });

  const handleLoginSubmit = (values: LoginFormValues) => {
    onSubmit({
      email: values.email,
      password: values.password
    });
  };

  const handleSignupSubmit = (values: SignupFormValues) => {
    onSubmit({
      email: values.email,
      password: values.password,
      name: values.name,
      startDate: values.startDate
    });
  };

  return (
    <Card className="w-[350px] md:w-[450px] shadow-lg border-t-4 border-t-green-500">
      <CardHeader className="text-center font-bold text-xl md:text-2xl">
        {isLogin ? "Connexion" : "Inscription"}
      </CardHeader>
      
      <CardContent>
        {isLogin ? (
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
              <FormField
                control={loginForm.control}
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
              
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
                Se connecter
              </Button>
            </form>
          </Form>
        ) : (
          <Form {...signupForm}>
            <form onSubmit={signupForm.handleSubmit(handleSignupSubmit)} className="space-y-4">
              <FormField
                control={signupForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom complet</FormLabel>
                    <FormControl>
                      <Input placeholder="Nom complet" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={signupForm.control}
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
              
              <FormField
                control={signupForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mot de passe</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={signupForm.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de début du plan de lecture</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
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
        )}
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
