
import React from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

const loginSchema = z.object({
  email: z.string().email({ message: "Adresse email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" })
});

const signupSchema = z.object({
  name: z.string().min(2, { message: "Le nom doit contenir au moins 2 caractères" }),
  email: z.string().email({ message: "Adresse email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" }),
  startDate: z.date({ required_error: "La date de début est requise" })
});

const AuthForm: React.FC<AuthFormProps> = ({ isLogin, toggleForm, onSubmit }) => {
  const schema = isLogin ? loginSchema : signupSchema;
  
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      email: "",
      password: "",
      ...(isLogin ? {} : { name: "", startDate: new Date() })
    },
  });

  const handleSubmit = (values: z.infer<typeof schema>) => {
    onSubmit(values);
  };

  return (
    <Card className="w-[350px] md:w-[450px] shadow-lg border-t-4 border-t-green-500">
      <CardHeader className="text-center font-bold text-xl md:text-2xl">
        {isLogin ? "Connexion" : "Inscription"}
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {!isLogin && (
              <FormField
                control={form.control}
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
            )}
            
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
            
            <FormField
              control={form.control}
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
            
            {!isLogin && (
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date de début du plan de lecture</FormLabel>
                    <FormControl>
                      <Input 
                        type="date" 
                        onChange={(e) => field.onChange(new Date(e.target.value))}
                        value={field.value instanceof Date ? field.value.toISOString().split('T')[0] : ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
            
            <Button type="submit" className="w-full bg-green-600 hover:bg-green-700">
              {isLogin ? "Se connecter" : "S'inscrire"}
            </Button>
          </form>
        </Form>
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
