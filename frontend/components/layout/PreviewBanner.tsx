import { isPreview } from '@/lib/config';
import { SnowflakeIcon } from '@/components/Icons';

/**
 * Bandeau de mode preview : distingue le catalogue public de démonstration
 * d'une offre de vente, sans présumer de l'état des services privés.
 */
export function PreviewBanner() {
  if (!isPreview()) return null;
  return (
    <div
      role="status"
      className="border-b border-ember/30 bg-cream px-4 py-2 text-center text-[11px] leading-relaxed text-ink-500 sm:text-xs"
    >
      <SnowflakeIcon width={12} height={12} className="mr-1 inline-block text-ember-dark" aria-hidden />
      <strong className="font-semibold">Mode preview</strong> — boutique en préparation. Le catalogue public
      présente des exemples ; les achats sont indisponibles.
    </div>
  );
}
