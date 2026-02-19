import React from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

/**
 * Page des Conditions Générales d'Utilisation
 */
const Terms = () => {
  const lastUpdated = "22 janvier 2025";

  const articles = [
    {
      id: "article-1",
      title: "Article 1 - Objet et acceptation des CGU",
      content: `Les présentes Conditions Générales d'Utilisation (CGU) régissent l'utilisation de l'application Bereé, un service de lecture biblique permettant aux utilisateurs de suivre un plan de lecture structuré.

En utilisant l'application Bereé, vous acceptez sans réserve les présentes CGU. Si vous n'acceptez pas ces conditions, vous ne devez pas utiliser l'application.

L'utilisation de l'application implique l'acceptation pleine et entière des présentes CGU.`
    },
    {
      id: "article-2",
      title: "Article 2 - Description du service",
      content: `Bereé est une application de lecture biblique qui propose :
• Des plans de lecture structurés (chronologique, canonique, etc.)
• Un suivi de progression personnalisé
• Un système de badges et récompenses
• Des versets quotidiens
• Des notifications de rappel de lecture

Le service est accessible gratuitement après création d'un compte utilisateur.`
    },
    {
      id: "article-3",
      title: "Article 3 - Inscription et compte utilisateur",
      content: `Pour accéder aux fonctionnalités de l'application, vous devez créer un compte en fournissant :
• Une adresse email valide
• Un mot de passe sécurisé
• Un nom d'utilisateur (optionnel)

Vous êtes responsable de la confidentialité de vos identifiants de connexion et de toutes les activités effectuées sous votre compte.

Vous vous engagez à fournir des informations exactes et à les maintenir à jour.`
    },
    {
      id: "article-4",
      title: "Article 4 - Utilisation du service",
      content: `Vous vous engagez à utiliser l'application de manière conforme à sa destination et aux présentes CGU.

Il est interdit de :
• Tenter d'accéder de manière non autorisée aux systèmes
• Utiliser l'application à des fins illicites
• Perturber le fonctionnement du service
• Collecter des données sur les autres utilisateurs

Nous nous réservons le droit de suspendre ou supprimer tout compte en cas de violation de ces règles.`
    },
    {
      id: "article-5",
      title: "Article 5 - Propriété intellectuelle",
      content: `Les textes bibliques utilisés dans l'application sont dans le domaine public ou utilisés avec les autorisations nécessaires.

L'interface, le design, le code source et les éléments graphiques de l'application sont protégés par le droit d'auteur et restent la propriété exclusive de Bereé.

Toute reproduction, modification ou utilisation non autorisée de ces éléments est strictement interdite.`
    },
    {
      id: "article-6",
      title: "Article 6 - Responsabilités et limitations",
      content: `L'application est fournie "en l'état". Nous nous efforçons d'assurer sa disponibilité mais ne garantissons pas un fonctionnement ininterrompu.

Nous ne saurions être tenus responsables :
• Des interruptions temporaires du service
• De la perte de données due à des circonstances hors de notre contrôle
• De l'utilisation que vous faites de l'application

L'utilisateur est seul responsable de l'utilisation qu'il fait du service.`
    },
    {
      id: "article-7",
      title: "Article 7 - Données personnelles",
      content: `La collecte et le traitement de vos données personnelles sont régis par notre Politique de Confidentialité, accessible depuis les paramètres de votre profil.

Conformément au Règlement Général sur la Protection des Données (RGPD), vous disposez de droits sur vos données personnelles :
• Droit d'accès
• Droit de rectification
• Droit à l'effacement
• Droit à la portabilité

Pour exercer ces droits, rendez-vous dans la section "Données et confidentialité" de votre profil.`
    },
    {
      id: "article-8",
      title: "Article 8 - Modification des CGU",
      content: `Nous nous réservons le droit de modifier les présentes CGU à tout moment.

Les utilisateurs seront informés de toute modification substantielle par notification dans l'application ou par email.

La poursuite de l'utilisation de l'application après modification des CGU vaut acceptation des nouvelles conditions.`
    },
    {
      id: "article-9",
      title: "Article 9 - Droit applicable et juridiction",
      content: `Les présentes CGU sont régies par le droit français.

En cas de litige relatif à l'interprétation ou à l'exécution des présentes CGU, les parties s'efforceront de trouver une solution amiable.

À défaut d'accord amiable, les tribunaux français seront seuls compétents pour connaître du litige.`
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center space-x-4">
            <Link to="/">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <h1 className="text-xl font-bold text-foreground">Conditions Générales d'Utilisation</h1>
          </div>
        </div>
      </div>

      {/* Contenu */}
      <div className="px-6 py-6 space-y-6 max-w-3xl mx-auto">
        {/* Introduction */}
        <Card>
          <CardHeader>
            <CardTitle>Bienvenue sur Bereé</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              Les présentes Conditions Générales d'Utilisation définissent les règles d'utilisation 
              de l'application Bereé. Veuillez les lire attentivement.
            </p>
            <p className="text-sm text-muted-foreground mt-4">
              Dernière mise à jour : {lastUpdated}
            </p>
          </CardContent>
        </Card>

        {/* Articles */}
        <Card>
          <CardContent className="pt-6">
            <Accordion type="single" collapsible className="w-full">
              {articles.map((article) => (
                <AccordionItem key={article.id} value={article.id}>
                  <AccordionTrigger className="text-left">
                    {article.title}
                  </AccordionTrigger>
                  <AccordionContent>
                    <p className="text-muted-foreground whitespace-pre-line">
                      {article.content}
                    </p>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Pour toute question concernant ces CGU, contactez-nous à{' '}
              <a href="mailto:support@beree.app" className="text-primary hover:underline">
                support@beree.app
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Terms;
