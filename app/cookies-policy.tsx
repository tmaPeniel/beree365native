import { MarkdownInfoScreen } from "@/features/profile/screens/MoreScreens";

const content = `## Politique cookies
La version native de Beree 365 n'utilise pas de cookies web classiques.

- Les preferences locales peuvent etre stockees sur l'appareil.
- Les sessions et donnees metier sont synchronisees via Supabase.
- Les consentements analytics et marketing se gerent depuis Confidentialite.`;

export default function CookiesPolicyRoute() {
  return <MarkdownInfoScreen content={content} title="Politique cookies" />;
}
