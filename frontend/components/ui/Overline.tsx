/** Surtitre éditorial : numéro de section + label + filet horizontal. */
export function Overline({ index, label, dark = false }: { index?: string; label: string; dark?: boolean }) {
  return (
    <p className={`overline ${dark ? 'overline-dark' : ''}`}>
      {index && <span className={dark ? 'text-ember' : 'text-ember-dark'}>{index}</span>}
      <span>{label}</span>
    </p>
  );
}
