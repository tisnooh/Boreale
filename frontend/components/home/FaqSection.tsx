import type { HomepageSettings } from '@/lib/types';
import { ChevronDownIcon } from '@/components/Icons';
import { faqJsonLd } from '@/lib/seo';

/** FAQ (accueil + /faq) — accordéon natif <details>, accessible et sans JS. */
export function FaqSection({ faq, withSchema = true }: { faq: HomepageSettings['faq']; withSchema?: boolean }) {
  if (faq.length === 0) return null;
  return (
    <>
      {withSchema && (
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd(faq)) }} />
      )}
      <div className="mx-auto max-w-3xl divide-y divide-line">
        {faq.map((item) => (
          <details key={item.q} className="group py-1">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 rounded-lg px-2 py-4 text-left text-[15px] font-semibold text-ink transition hover:text-ember-dark [&::-webkit-details-marker]:hidden">
              {item.q}
              <ChevronDownIcon
                width={18}
                height={18}
                className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180"
              />
            </summary>
            <p className="px-2 pb-5 text-sm leading-relaxed text-muted">{item.a}</p>
          </details>
        ))}
      </div>
    </>
  );
}
