import { isPreview } from '@/lib/config';
import { SnowflakeIcon } from '@/components/Icons';

/**
 * Bandeau de mode preview : signale sans ambiguïté que les données affichées sont
 * de la démonstration et qu'aucun service réel n'est connecté. Absent en mode live.
 */
export function PreviewBanner() {
  if (!isPreview()) return null;
  return (
    <div
      role="status"
      className="border-b border-ember/30 bg-cream px-4 py-2 text-center text-[11px] leading-relaxed text-ink-500 sm:text-xs"
    >
      <SnowflakeIcon width={12} height={12} className="mr-1 inline-block text-ember-dark" aria-hidden />
      <strong className="font-semibold">Mode preview</strong> — données de démonstration locales, aucun service
      réel connecté (paiement, comptes, emails et base seront branchés à l’ouverture de la boutique).
    </div>
  );
}
