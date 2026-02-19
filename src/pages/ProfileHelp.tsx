import React, { useState } from "react";
import { ArrowLeft, HelpCircle, Mail, BookOpen, Shield, Bell, MessageSquare, ChevronDown, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const ProfileHelp = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [contactForm, setContactForm] = useState({
    subject: "",
    message: ""
  });

  const faqCategories = [
    {
      category: "Compte et Profil",
      icon: Shield,
      questions: [
        {
          q: "Comment modifier mon profil ?",
          a: "Allez dans Paramètres > Profil, puis cliquez sur 'Modifier le profil'. Vous pourrez y changer votre nom, photo et autres informations."
        },
        {
          q: "Comment réinitialiser mon mot de passe ?",
          a: "Sur la page de connexion, cliquez sur 'Mot de passe oublié'. Suivez les instructions envoyées par email pour créer un nouveau mot de passe."
        },
        {
          q: "Puis-je supprimer mon compte ?",
          a: "Oui, rendez-vous dans Profil > Paramètres > Données et confidentialité. Vous pourrez y supprimer définitivement votre compte et toutes vos données."
        }
      ]
    },
    {
      category: "Plans de Lecture",
      icon: BookOpen,
      questions: [
        {
          q: "Comment choisir un plan de lecture ?",
          a: "Lors de votre inscription ou depuis votre profil, vous pouvez sélectionner parmi plusieurs plans de lecture (90 jours, 180 jours, 365 jours, etc.)."
        },
        {
          q: "Puis-je changer de plan en cours de route ?",
          a: "Oui, vous pouvez changer de plan à tout moment depuis votre profil. Attention : votre progression actuelle sera réinitialisée."
        },
        {
          q: "Que se passe-t-il si je manque un jour de lecture ?",
          a: "Aucun problème ! Vous pouvez rattraper les lectures manquées à tout moment. L'application garde une trace de votre progression globale."
        },
        {
          q: "Comment marquer une lecture comme terminée ?",
          a: "Cliquez sur le jour de lecture, puis sur 'Marquer comme lu' après avoir terminé les chapitres du jour."
        }
      ]
    },
    {
      category: "Notifications",
      icon: Bell,
      questions: [
        {
          q: "Comment activer les notifications ?",
          a: "Allez dans Paramètres > Notifications. Activez les notifications push et configurez vos préférences (rappels quotidiens, versets du jour, etc.)."
        },
        {
          q: "Je ne reçois pas de notifications, que faire ?",
          a: "Vérifiez que les notifications sont activées dans les paramètres de votre appareil pour l'application Bereé. Vérifiez également vos préférences dans l'app."
        },
        {
          q: "Puis-je choisir l'heure de mes rappels ?",
          a: "Actuellement, les rappels sont envoyés à 8h00 chaque jour. Nous travaillons sur une fonctionnalité pour personnaliser l'heure."
        }
      ]
    },
    {
      category: "Badges et Progression",
      icon: HelpCircle,
      questions: [
        {
          q: "Comment obtenir des badges ?",
          a: "Les badges sont débloqués automatiquement lorsque vous atteignez certains objectifs : lectures consécutives, livres terminés, progression dans votre plan, etc."
        },
        {
          q: "Où puis-je voir mes statistiques ?",
          a: "Votre tableau de bord affiche vos statistiques principales. Pour plus de détails, allez dans Profil > Statistiques."
        },
        {
          q: "Les badges filtrés par plan, c'est quoi ?",
          a: "Certains badges (comme la complétion de livres) sont calculés uniquement selon les chapitres de votre plan de lecture actuel."
        }
      ]
    }
  ];

  const filteredFAQ = faqCategories.map(category => ({
    ...category,
    questions: category.questions.filter(
      q => 
        searchQuery === "" ||
        q.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
        q.a.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.questions.length > 0);

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactForm.subject || !contactForm.message) {
      toast({
        title: "Champs requis",
        description: "Veuillez remplir tous les champs",
        variant: "destructive"
      });
      return;
    }

    // Simuler l'envoi
    toast({
      title: "Message envoyé",
      description: "Notre équipe vous répondra dans les 24-48h"
    });
    setContactForm({ subject: "", message: "" });
  };

  const quickLinks = [
    {
      title: "Guide de démarrage",
      description: "Premiers pas avec Bereé",
      icon: BookOpen,
      url: "/profile/about"
    },
    {
      title: "Confidentialité",
      description: "Gérer vos données (RGPD)",
      icon: Shield,
      url: "/profile/privacy"
    },
    {
      title: "Notifications",
      description: "Gérer vos notifications",
      icon: Bell,
      url: "/profile/notifications"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="container max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link to="/profile/settings">
                <ArrowLeft className="h-5 w-5" />
              </Link>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Aide & Support</h1>
              <p className="text-sm text-muted-foreground">
                Trouvez des réponses à vos questions
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Search */}
        <Card>
          <CardContent className="pt-6">
            <div className="relative">
              <HelpCircle className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher dans la FAQ..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick Links */}
        <div className="grid gap-4 md:grid-cols-3">
          {quickLinks.map((link) => {
            const Icon = link.icon;
            return (
              <Card key={link.title} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <Link to={link.url} className="block space-y-2">
                    <Icon className="h-6 w-6 text-primary" />
                    <h3 className="font-semibold">{link.title}</h3>
                    <p className="text-sm text-muted-foreground">{link.description}</p>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* FAQ */}
        <Card>
          <CardHeader>
            <CardTitle>Questions Fréquentes</CardTitle>
            <CardDescription>
              {searchQuery ? `${filteredFAQ.reduce((acc, cat) => acc + cat.questions.length, 0)} résultat(s) trouvé(s)` : "Consultez les réponses aux questions les plus courantes"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredFAQ.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Aucune question trouvée pour "{searchQuery}"</p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredFAQ.map((category, idx) => {
                  const Icon = category.icon;
                  return (
                    <div key={idx}>
                      <div className="flex items-center gap-2 mb-3">
                        <Icon className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold">{category.category}</h3>
                      </div>
                      <Accordion type="single" collapsible className="space-y-2">
                        {category.questions.map((item, qIdx) => (
                          <AccordionItem key={qIdx} value={`${idx}-${qIdx}`} className="border rounded-lg px-4">
                            <AccordionTrigger className="text-left hover:no-underline">
                              {item.q}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground">
                              {item.a}
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contact Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Contactez-nous
            </CardTitle>
            <CardDescription>
              Vous n'avez pas trouvé de réponse ? Envoyez-nous un message
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleContactSubmit} className="space-y-4">
              <div>
                <Label htmlFor="subject">Sujet</Label>
                <Input
                  id="subject"
                  placeholder="De quoi s'agit-il ?"
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Décrivez votre problème ou question..."
                  rows={5}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                />
              </div>
              <Button type="submit" className="w-full">
                <Mail className="h-4 w-4 mr-2" />
                Envoyer le message
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Support Info */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <Mail className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div className="space-y-1">
                <p className="font-medium">Email de support</p>
                <p className="text-sm text-muted-foreground">support@beree.app</p>
                <p className="text-xs text-muted-foreground">Réponse sous 24-48h</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ProfileHelp;
