'use client';

import { useEffect, useState } from 'react';

/** Bandeau discret « connexion perdue » : évite qu'un utilisateur croie le site cassé. */
export function OfflineNotice() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const up = () => setOffline(false);
    const down = () => setOffline(true);
    setOffline(!window.navigator.onLine);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  if (!offline) return null;
  return (
    <div role="alert" className="fixed inset-x-0 bottom-0 z-[120] bg-ink px-4 py-2.5 text-center text-xs font-medium text-ice">
      Connexion internet perdue — le site reste consultable, certaines actions seront disponibles au retour du réseau.
    </div>
  );
}
