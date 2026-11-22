-- Archive de démonstration : seed.historical.sql.txt, jamais à importer.
-- Brouillons actuels : sourcing/priority-catalog.json, sans stock ni prix publics.
-- Ce fichier ne contient aucune écriture, même si un client SQL continue après erreur.
do $$ begin
  raise exception 'legacy_seed_disabled: no demo catalog or inventory may be imported';
end $$;