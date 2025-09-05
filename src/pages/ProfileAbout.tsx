import React from 'react';
import { ArrowLeft, Heart, Github, Mail, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Page À propos de l'application
 */
const ProfileAbout = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link to="/profile">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-foreground">À propos</h1>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="px-6 py-6 space-y-6">
        {/* Informations de l'app */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="h-5 w-5 text-primary" />
              <span>Bereé</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Version</p>
              <p className="font-medium">1.0.0</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Description</p>
              <p className="text-foreground">
                Bereé est une application de lecture biblique qui vous aide à développer 
                une habitude de lecture régulière de la Bible à travers des plans de lecture 
                structurés et une interface moderne.
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Mission</p>
              <p className="text-foreground">
                Notre mission est de rendre la Parole de Dieu accessible et engageante 
                pour tous, en fournissant des outils modernes pour la méditation et 
                l'étude biblique.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Fonctionnalités */}
        <Card>
          <CardHeader>
            <CardTitle>Fonctionnalités</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-foreground">
              <li>• Plans de lecture personnalisables</li>
              <li>• Suivi de progression quotidien</li>
              <li>• Versets du jour inspirants</li>
              <li>• Système de badges et récompenses</li>
              <li>• Interface moderne et intuitive</li>
              <li>• Mode hors ligne</li>
              <li>• Synchronisation entre appareils</li>
            </ul>
          </CardContent>
        </Card>

        {/* Contact et Support */}
        <Card>
          <CardHeader>
            <CardTitle>Contact & Support</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Mail className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Support</p>
                  <p className="text-sm text-muted-foreground">Contactez notre équipe</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                Contacter
              </Button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Github className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Code source</p>
                  <p className="text-sm text-muted-foreground">Contribuer au projet</p>
                </div>
              </div>
              <Button variant="outline" size="sm">
                <ExternalLink className="h-4 w-4 mr-2" />
                GitHub
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Remerciements */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-muted-foreground mb-2">
                Développé avec ❤️ pour la communauté chrétienne
              </p>
              <p className="text-sm text-muted-foreground">
                © 2024 Bereé. Tous droits réservés.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfileAbout;