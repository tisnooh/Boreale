# Polices BORÉALE

Fraunces et Inter restent les polices du design existant. Ces deux fichiers WOFF2 variables latin sont des copies exactes des fichiers déjà servis par le build Next.js précédent, identifiés par ses déclarations `@font-face` :

- `Fraunces`, poids 100–900 : `54fc36028e2bb174-s.p.20jfceqj9zyw9.woff2`.
- `Inter`, poids 100–900 : `83afe278b6a6bb3c-s.p.2bn3s6zvc0dyp.woff2`.

Le chargement `next/font/local` évite les téléchargements Google pendant le build. Même famille, mêmes fichiers binaires, mêmes variables CSS ; aucune nouvelle police ni dépendance ajoutée. Le sous-ensemble latin couvre les textes français du site.

Les licences SIL Open Font License sont conservées dans `OFL-fraunces.txt` et `OFL-inter.txt`, provenant du dépôt officiel Google Fonts :

- https://github.com/google/fonts/tree/main/ofl/fraunces
- https://github.com/google/fonts/tree/main/ofl/inter
