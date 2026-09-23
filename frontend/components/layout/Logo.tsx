/** Logo BORÉALE — monogramme « flocon-montagne » + wordmark (SVG inline, docs/BRANDING.md). */

export function LogoMark({ className = 'h-8 w-8' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="BORÉALE">
      <circle cx="32" cy="32" r="30" fill="#0B1B2B" />
      {/* montagne */}
      <path d="M14 42 L27 24 L34 34 L39 28 L50 42 Z" fill="#F7FAFC" />
      {/* flocon / étoile polaire */}
      <g stroke="#E8622C" strokeWidth="2.4" strokeLinecap="round">
        <path d="M32 8 V18" />
        <path d="M28.5 11 L32 14.5 L35.5 11" />
      </g>
      <circle cx="32" cy="21.5" r="1.6" fill="#3D7EA6" />
    </svg>
  );
}

export function Logo({
  light = false,
  withBaseline = false,
  baseline = 'L’hiver, du bon côté.',
}: {
  light?: boolean;
  withBaseline?: boolean;
  baseline?: string;
}) {
  return (
    <span className="inline-flex flex-col leading-none">
      <span className="inline-flex items-center gap-2.5">
        <LogoMark className="h-8 w-8 shrink-0" />
        <span
          className={`font-display text-xl font-semibold tracking-[0.22em] ${light ? 'text-white' : 'text-ink'}`}
        >
          BORÉALE
        </span>
      </span>
      {withBaseline && (
        <span className={`mt-1 text-[11px] tracking-wide ${light ? 'text-white/60' : 'text-muted'}`}>
          {baseline}
        </span>
      )}
    </span>
  );
}
