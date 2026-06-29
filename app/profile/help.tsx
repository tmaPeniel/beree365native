import { MarkdownInfoScreen } from "@/features/profile/screens/MoreScreens";

const content = `## Utiliser Beree 365
- Ouvrez Accueil pour voir votre jour actuel.
- Ouvrez Lecture pour cocher les passages lus.
- Consultez Profil pour suivre vos badges, statistiques et preferences.

## Besoin d'aide
Contactez l'equipe support depuis votre canal habituel SISAP Editions.`;

export default function HelpRoute() {
  return <MarkdownInfoScreen content={content} title="Aide" />;
}
