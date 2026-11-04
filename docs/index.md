# Documentation technique

Documentation de navigation dans les fonctionnalités, établie à partir des sources disponibles dans le workspace.

## Vue d'ensemble

- [Architecture globale](./architecture-globale.md) — organisation, technologies, parcours, dépendances et fichiers à lire en premier.

## Fonctionnalités détaillées

1. [Détection de disponibilité du serveur local](./01-disponibilite-serveur-local.md) — sonde HTTP, état de session, classes CSS et permissions.
2. [Logique d'affichage Play ou Télécharger](./02-affichage-play-telecharger.md) — règles CSS, variation WebContainer et demandes de téléchargement.
3. [Communication client ↔ serveur local](./03-communication-client-serveur-local.md) — protocole HTTP, routes, erreurs et opérations serveur.
4. [Recherche et accès aux fichiers médias](./04-recherche-acces-fichiers-medias.md) — génération/chargement du catalogue, filtres, chemins et ouverture de dossier.
5. [Parcours complet de lecture d'un film](./05-parcours-lecture-film.md) — sélection d’un fichier, lancement VLC, reprise et synchronisation.

Les fiches distinguent les fonctions globales des classes : aucune classe de code n’a été trouvée dans les sources étudiées. Les informations absentes des sources sont signalées explicitement dans les fiches.
