import { MarkdownInfoScreen } from "@/features/profile/screens/MoreScreens";

const content = `## Politique cookies
La version native de Beree 365 n'utilise pas de cookies web classiques.

- Les preferences locales peuvent etre stockees sur l'appareil.
- Les sessions et donnees metier sont synchronisees via Supabase.
- Le consentement a la mesure d'audience se gere depuis Confidentialite.
- Aucun consentement marketing n'est actuellement collecte par l'application native.`;

export default function CookiesPolicyRoute() {
  return <MarkdownInfoScreen content={content} title="Politique cookies" />;
}
