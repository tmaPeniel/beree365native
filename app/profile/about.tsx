import { MarkdownInfoScreen } from "@/features/profile/screens/MoreScreens";

const content = `## Beree 365
Beree 365 accompagne la lecture quotidienne de la Bible avec un plan structure, un suivi simple et des rappels.

- Editeur : SISAP Editions
- Application native Expo React Native
- Donnees synchronisees avec Supabase`;

export default function AboutRoute() {
  return <MarkdownInfoScreen content={content} title="A propos" />;
}
