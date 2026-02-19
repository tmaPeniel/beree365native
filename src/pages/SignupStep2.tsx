/**
 * Deuxième étape de l'inscription
 * Sélection du plan de lecture
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { ArrowLeft, CheckCircle } from 'lucide-react';
import PlanSelector from "@/components/ui/PlanSelector";
import { signUp } from '@/services/authService';
import { toast } from 'sonner';

const SignupStep2 = () => {
  const navigate = useNavigate();
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [signupData, setSignupData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    // Récupérer les données de la première étape
    const storedData = localStorage.getItem('signupData');
    if (!storedData) {
      // Si pas de données, retourner à la première étape
      navigate('/signup');
      return;
    }
    
    try {
      const data = JSON.parse(storedData);
      setSignupData(data);
    } catch (error) {
      console.error('Erreur lors de la lecture des données:', error);
      navigate('/signup');
    }
  }, [navigate]);
  
  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
  };
  
  const handleSubmit = async () => {
    if (!selectedPlanId) {
      toast.error("Veuillez sélectionner un plan de lecture");
      return;
    }
    
    if (!signupData) {
      toast.error("Données d'inscription manquantes");
      navigate('/signup');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const result = await signUp(
        signupData.email,
        signupData.password,
        signupData.name,
        signupData.startDate instanceof Date 
          ? signupData.startDate.toISOString().split('T')[0]
          : new Date(signupData.startDate).toISOString().split('T')[0],
        selectedPlanId
      );
      
      if (result.success) {
        // Nettoyer les données temporaires
        localStorage.removeItem('signupData');
        toast.success("Inscription réussie ! Bienvenue !");
        navigate('/dashboard');
      }
    } catch (error) {
      console.error("Erreur d'inscription:", error);
      toast.error("Une erreur est survenue lors de l'inscription");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleGoBack = () => {
    navigate('/signup');
  };
  
  if (!signupData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-background animate-fade-in">
      <Card className="w-[350px] md:w-[450px] shadow-lg border-t-4 border-t-green-500">
        <CardHeader className="text-center">
          <h1 className="font-bold text-xl md:text-2xl">Choisir un plan</h1>
          <p className="text-sm text-muted-foreground">Étape 2 sur 2 - Sélection du plan de lecture</p>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <p className="text-sm text-green-800">
              <strong>Bienvenue {signupData.name} !</strong><br />
              Choisissez le plan de lecture qui vous convient le mieux.
            </p>
          </div>
          
          <PlanSelector
            selectedPlanId={selectedPlanId}
            onPlanSelect={handlePlanSelect}
          />
        </CardContent>
        
        <CardFooter className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleGoBack}
            className="flex-1"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
          
          <Button 
            onClick={handleSubmit}
            disabled={!selectedPlanId || isLoading}
            className="flex-1 bg-green-600 hover:bg-green-700"
          >
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
        </CardFooter>
      </Card>
    </div>
  );
};

export default SignupStep2;