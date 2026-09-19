import Link from 'next/link';
import { SnowflakeIcon } from '@/components/Icons';

export default function NotFound() {
  return (
    <div className="container-x grid place-items-center py-24 text-center">
      <SnowflakeIcon width={44} height={44} className="text-glacier" />
      <h1 className="font-display mt-6 text-4xl font-semibold">Page introuvable</h1>
      <p className="mt-3 max-w-sm text-sm text-muted">
        Cette page a dû prendre froid. Retrouvez nos essentiels d’hiver ci-dessous.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/" className="btn-primary btn-sm">Retour à l’accueil</Link>
        <Link href="/collections" className="btn-outline btn-sm">Voir la collection</Link>
      </div>
    </div>
  );
}
