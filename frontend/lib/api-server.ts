
import { API_URL } from './constants';

/**
 * Fetch serveur (Server Components) — jamais de cache (données catalogue fraîches),
 * et JAMAIS d'échec de build si l'API est absente : on retourne null et la page
 * affiche son état vide/fallback. Aucun faux contenu n'est injecté.
 */
export async function apiGetServer<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      cache: 'no-store',
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}
