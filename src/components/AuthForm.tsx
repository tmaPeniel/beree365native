
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Logo from './Logo';

interface AuthFormProps {
  isLogin: boolean;
  toggleForm: () => void;
  onSubmit: (data: { email: string; password: string; name?: string }) => void;
}

const AuthForm: React.FC<AuthFormProps> = ({ isLogin, toggleForm, onSubmit }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLogin) {
      onSubmit({ email, password });
    } else {
      onSubmit({ email, password, name });
    }
  };
  
  return (
    <div className="w-full max-w-md mx-auto p-6">
      <div className="flex justify-center mb-8">
        <Logo size="medium" />
      </div>
      
      <h1 className="text-2xl font-bold mb-6 text-center">
        {isLogin ? 'Connexion' : 'Inscription'}
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              type="text"
              placeholder="Votre nom"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required={!isLogin}
              className="rounded-xl"
            />
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="votreemail@exemple.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="rounded-xl"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="password">Mot de passe</Label>
          <Input
            id="password"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="rounded-xl"
          />
        </div>
        
        <Button type="submit" className="w-full rounded-full bg-beree-500 hover:bg-beree-600 h-12 mt-6">
          {isLogin ? 'Se connecter' : "S'inscrire"}
        </Button>
      </form>
      
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          {isLogin ? "Pas encore inscrit ?" : "Déjà inscrit ?"}
          <button 
            onClick={toggleForm}
            className="ml-1 text-beree-500 hover:text-beree-600 font-medium"
          >
            {isLogin ? "S'inscrire" : "Se connecter"}
          </button>
        </p>
      </div>
    </div>
  );
};

export default AuthForm;
