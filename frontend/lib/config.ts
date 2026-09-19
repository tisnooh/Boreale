/**
 * Mode de fonctionnement du frontend.
 * - "preview" (défaut) : le site tourne SANS infrastructure réelle — catalogue de démonstration
 *   local clairement signalé, aucun appel réseau requis, aucun faux succès business.
 * - "live" : le site consomme l'API backend réelle (NEXT_PUBLIC_API_URL). Si l'API est
 *   injoignable, les pages affichent des états vides honnêtes (jamais de données inventées).
 *
 * Aucune clé réelle n'est requise dans les deux modes (DECISIONS.md D028).
 */
export type SiteMode = 'preview' | 'live';

export const SITE_MODE: SiteMode =
  process.env.NEXT_PUBLIC_SITE_MODE === 'live' ? 'live' : 'preview';

export const isPreview = (): boolean => SITE_MODE === 'preview';

/** Message unique et honnête affiché quand une action réelle est impossible en preview. */
export const PREVIEW_NOTICE =
  'Mode preview : aucune donnée réelle n’est envoyée. Cette fonctionnalité sera active dès la connexion de l’API et des services (ouverture de la boutique).';
