import { MarkdownInfoScreen } from "@/features/profile/screens/MoreScreens";

const content = `## Conditions d'utilisation
Beree 365 est fourni pour accompagner un parcours de lecture biblique personnel.

- L'utilisateur reste responsable de son compte.
- Les donnees de progression servent a synchroniser l'experience.
- Les fonctionnalites Premium dependent des conditions commerciales validees par l'equipe.`;

export default function TermsRoute() {
  return <MarkdownInfoScreen content={content} title="Conditions" />;
}
