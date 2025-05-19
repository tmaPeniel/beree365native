
import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import Logo from '@/components/Logo';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 animate-enter">
      <div className="max-w-md w-full text-center">
        <Logo size="large" className="mb-6" />
        
        <h1 className="text-3xl font-bold mb-4 text-gray-800">
          Lisez la Bible en un an
        </h1>
        
        <p className="text-gray-600 mb-8">
          Suivez votre lecture quotidienne, établissez une routine spirituelle et progressez pas à pas.
        </p>
        
        <div className="space-y-4">
          <Link to="/dashboard" className="block">
            <Button className="w-full h-12 rounded-full bg-beree-500 hover:bg-beree-600">
              Commencer
            </Button>
          </Link>
          
          <div className="flex space-x-4">
            <Link to="/login" className="flex-1 block">
              <Button variant="outline" className="w-full rounded-full border-beree-500 text-beree-500 hover:bg-beree-50">
                Connexion
              </Button>
            </Link>
            
            <Link to="/signup" className="flex-1 block">
              <Button variant="outline" className="w-full rounded-full border-beree-500 text-beree-500 hover:bg-beree-50">
                Inscription
              </Button>
            </Link>
          </div>
        </div>
      </div>
      
      <div className="mt-16 mb-8">
        <img 
          src="https://images.unsplash.com/photo-1504052434569-70ad5836ab65?ixlib=rb-1.2.1&auto=format&fit=crop&w=500&q=80" 
          alt="Bible ouverte" 
          className="w-full max-w-md rounded-2xl shadow-md"
        />
      </div>
    </div>
  );
};

export default Index;
