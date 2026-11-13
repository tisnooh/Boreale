import Image from 'next/image';

/** Page publique avant ouverture : aucune donnée catalogue, collecte ou service distant. */
export function ComingSoon() {
  return (
    <main id="main" className="relative isolate flex min-h-svh flex-col overflow-hidden bg-ink text-white">
      <Image src="/images/hero-hiver.jpg" alt="" fill priority sizes="100vw" className="object-cover opacity-40" />
      <div className="absolute inset-0 -z-0 bg-linear-to-t from-ink via-ink/50 to-ink/20" aria-hidden="true" />
      <header className="relative flex flex-wrap items-center justify-between gap-4 border-b border-white/20 px-6 py-6 sm:px-12">
        <span className="text-xl font-semibold tracking-[0.24em]">BORÉALE<span className="text-ember">.</span></span>
        <span className="text-[10px] uppercase tracking-[0.2em] text-white/80">Une maison · Deux saisons</span>
      </header>
      <div className="relative mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-6 py-20 sm:px-12 sm:py-28">
        <p className="mb-8 text-xs uppercase tracking-[0.3em] text-white/80">La première page s’écrit</p>
        <h1 className="font-display max-w-4xl text-[clamp(3.2rem,10vw,8rem)] leading-[0.98] tracking-tight">
          À chaque saison,<br /><span className="italic text-cream">son essentiel.</span>
        </h1>
        <p className="mt-10 max-w-md text-base leading-relaxed text-white/85 sm:text-lg">
          Du refuge de l’hiver aux journées à ciel ouvert, BORÉALE imagine une sélection pour habiter les saisons autrement.
        </p>
        <div className="mt-10 flex items-center gap-3 text-xs uppercase tracking-[0.2em]">
          <span className="h-2 w-2 rounded-full bg-ember" aria-hidden="true" />
          Ouverture prochaine
        </div>
        <p className="mt-4 max-w-md text-sm leading-relaxed text-white/65">Notre sélection est en préparation. Les commandes ne sont pas encore ouvertes.</p>
      </div>
      <footer className="relative mx-6 flex flex-wrap justify-between gap-4 border-t border-white/20 py-6 text-[10px] uppercase tracking-[0.16em] text-white/65 sm:mx-12">
        <span>© {new Date().getFullYear()} BORÉALE</span><span>Hiver / Été</span>
      </footer>
    </main>
  );
}
