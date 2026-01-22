/**
 * Page de politique de cookies
 * Conforme au RGPD
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ArrowLeft, Cookie, Shield, Settings, Info } from 'lucide-react';

const lastUpdated = "22 janvier 2025";

const CookiesPolicy = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b">
        <div className="container flex items-center h-14 max-w-4xl mx-auto px-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
          <h1 className="font-semibold text-lg">Politique de cookies</h1>
        </div>
      </div>

      <div className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cookie className="h-5 w-5 text-primary" />
              Qu'est-ce qu'un cookie ?
            </CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <p>
              Un cookie est un petit fichier texte stocké sur votre appareil (ordinateur, tablette ou smartphone) 
              lorsque vous visitez un site web. Les cookies permettent au site de mémoriser vos préférences 
              et d'améliorer votre expérience de navigation.
            </p>
            <p className="text-sm">
              <strong>Dernière mise à jour :</strong> {lastUpdated}
            </p>
          </CardContent>
        </Card>

        {/* Cookies utilisés */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5 text-primary" />
              Cookies utilisés par Bérée 365
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="essential">
              <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    Cookies essentiels (obligatoires)
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-4">
                  <p>
                    Ces cookies sont nécessaires au fonctionnement du site et ne peuvent pas être désactivés.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="font-medium text-foreground">sb-* (Supabase)</p>
                      <p className="text-sm">Authentification et gestion de session utilisateur.</p>
                      <p className="text-xs mt-1">Durée : Session / 1 an</p>
                    </div>
                    
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="font-medium text-foreground">beree-theme</p>
                      <p className="text-sm">Mémorisation de votre préférence de thème (clair/sombre).</p>
                      <p className="text-xs mt-1">Durée : 1 an</p>
                    </div>
                    
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="font-medium text-foreground">cookie-consent</p>
                      <p className="text-sm">Enregistrement de vos choix concernant les cookies.</p>
                      <p className="text-xs mt-1">Durée : 1 an</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="analytics">
              <AccordionTrigger>
                  <div className="flex items-center gap-2">
                    <Info className="h-4 w-4 text-muted-foreground" />
                    Cookies analytiques (optionnels)
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground space-y-4">
                  <p>
                    Ces cookies nous aident à comprendre comment les visiteurs interagissent avec le site. 
                    Ils sont optionnels et vous pouvez les refuser.
                  </p>
                  
                  <div className="space-y-3">
                    <div className="bg-muted/50 p-3 rounded-lg">
                      <p className="font-medium text-foreground">OneSignal</p>
                      <p className="text-sm">
                        Service de notifications push. Stocke un identifiant unique pour vous envoyer 
                        des notifications si vous les avez activées.
                      </p>
                      <p className="text-xs mt-1">Durée : Jusqu'à révocation</p>
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </CardContent>
        </Card>

        {/* Gestion des cookies */}
        <Card>
          <CardHeader>
            <CardTitle>Comment gérer vos cookies ?</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-4">
            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Via notre bandeau de consentement</h4>
              <p>
                Lors de votre première visite, un bandeau vous permet de choisir les cookies que vous acceptez. 
                Vous pouvez modifier ces choix à tout moment depuis les paramètres de votre profil.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium text-foreground">Via votre navigateur</h4>
              <p>
                Vous pouvez également gérer les cookies directement depuis les paramètres de votre navigateur :
              </p>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>Chrome : Paramètres → Confidentialité et sécurité → Cookies</li>
                <li>Firefox : Options → Vie privée et sécurité → Cookies</li>
                <li>Safari : Préférences → Confidentialité</li>
                <li>Edge : Paramètres → Cookies et autorisations de site</li>
              </ul>
            </div>

            <div className="bg-muted border border-border p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong className="text-foreground">Note :</strong> La désactivation de certains cookies peut affecter le fonctionnement 
                de l'application, notamment l'authentification et la sauvegarde de vos préférences.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Vos droits */}
        <Card>
          <CardHeader>
            <CardTitle>Vos droits</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-3">
            <p>
              Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez des droits suivants :
            </p>
            <ul className="list-disc list-inside space-y-2">
              <li><strong>Droit d'accès :</strong> Vous pouvez demander quelles données nous détenons sur vous.</li>
              <li><strong>Droit de rectification :</strong> Vous pouvez corriger vos données personnelles.</li>
              <li><strong>Droit à l'effacement :</strong> Vous pouvez demander la suppression de vos données.</li>
              <li><strong>Droit de retrait du consentement :</strong> Vous pouvez retirer votre consentement aux cookies à tout moment.</li>
            </ul>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle>Nous contacter</CardTitle>
          </CardHeader>
          <CardContent className="text-muted-foreground">
            <p>
              Pour toute question concernant notre politique de cookies, vous pouvez nous contacter à :
            </p>
            <a 
              href="mailto:support@beree365.app" 
              className="text-primary hover:underline font-medium"
            >
              support@beree365.app
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CookiesPolicy;
