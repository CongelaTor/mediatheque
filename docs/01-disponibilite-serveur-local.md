# Détection de disponibilité du serveur local

## Objectif

Déterminer si le navigateur peut joindre le MediaServer sur `http://localhost:9876`, conserver le résultat pour la session et appliquer les classes CSS qui commandent la visibilité de certaines actions.

## Point d'entrée

- [C:\Users\alnos\Documents\Projets\mediatheque\js\utils.js](C:\Users\alnos\Documents\Projets\mediatheque\js\utils.js) — aucune classe ; code exécuté au chargement du script. Initialise `mediaServerAvailable` depuis l’hôte et `sessionStorage`, applique une classe au `<body>`, puis lance immédiatement `isMediaServerAvailable()`.
- [C:\Users\alnos\Documents\Projets\mediatheque\index.html](C:\Users\alnos\Documents\Projets\mediatheque\index.html) — aucune classe ; gestionnaire `DOMContentLoaded` → `initHomePage()`.
- [C:\Users\alnos\Documents\Projets\mediatheque\films.html](C:\Users\alnos\Documents\Projets\mediatheque\films.html) et [C:\Users\alnos\Documents\Projets\mediatheque\tools.html](C:\Users\alnos\Documents\Projets\mediatheque\tools.html) — aucune classe ; gestionnaires `DOMContentLoaded` → `initFilmsPage()` et `initToolsPage()`, qui attendent aussi la détection.

## Parcours d'exécution

### Résumé visuel

| Ordre | Composant | Résultat |
|---|---|---|
| 1 | Initialisation de `js/utils.js` | État de session lu et classe CSS initiale posée sur `<body>`. |
| 2 | `isMediaServerAvailable()` | Requête `POST http://localhost:9876/get-resume-playback`. |
| 3a | Réponse HTTP OK | `mediaServerAvailable = true`; état stocké en session; classe `mediaserver`. |
| 3b | Réponse non-OK ou erreur réseau | `mediaServerAvailable = false`; état stocké en session; classe `no-mediaserver`. |
| 4 | Initialiseur de page | L’accueil, Films et Tools attendent le test; Collections, Séries et Épisodes ne l’attendent pas explicitement. |

Sur l’accueil, le résultat alimente aussi le calcul des permissions. Les fonctions et leurs rôles sont détaillés dans le tableau « Fichiers impliqués ».

## Conditions de décision

- [C:\Users\alnos\Documents\Projets\mediatheque\js\calculContext.js](C:\Users\alnos\Documents\Projets\mediatheque\js\calculContext.js) — aucune classe ; `detectEnvironment(options)` établit `isLocalUrl` pour `localhost`/`127.0.0.1`, `isGitUrl` pour les hôtes `github.io`, et `isDevPc` si l’URL est locale et le serveur disponible.
- Même fichier — `calculatePermissions(environment)` autorise lecture/reprise/synchronisation si le serveur est disponible ; le scan, l’association TMDB, les boutons grisés et la publication exigent aussi `isDevPc`. `canRequest` vaut `isGitUrl && !isDevPc`.
- [C:\Users\alnos\Documents\Projets\mediatheque\css\style.css](C:\Users\alnos\Documents\Projets\mediatheque\css\style.css) — règles CSS globales : `body.no-mediaserver .mediaserver-only` masque les contrôles de lecture locale ; `body:not(.no-mediaserver) .download-only` masque les contrôles de téléchargement.

## Fichiers impliqués

| Chemin complet | Classe | Méthode / rôle |
|---|---|---|
| `C:\Users\alnos\Documents\Projets\mediatheque\js\utils.js` | Aucune | `isMediaServerAvailable()` vérifie la réponse HTTP, mémorise l’état et met à jour les classes du document. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\app-init.js` | Aucune | `initHomePage()` attend le résultat et utilise les permissions pour afficher scan et reprise. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\films.js` | Aucune | `initFilmsPage()` attend la détection avant le chargement et le rendu du catalogue. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\tools.js` | Aucune | `initToolsPage()` attend la détection avant d’afficher les outils. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\calculContext.js` | Aucune | `detectEnvironment()`, `calculatePermissions()` et `calculateContext()` calculent environnement et permissions. |
| `C:\Users\alnos\Documents\Projets\mediatheque\css\style.css` | Sans objet | Les règles sur `no-mediaserver`, `mediaserver-only` et `download-only` pilotent l’affichage. |
| `Z:\01_mediaServer\mediaServer.js` | Aucune | Le gestionnaire HTTP traite `POST /get-resume-playback` via `getResumePlayback()` ; le serveur écoute le port `9876`. |

## Données d'entrée et de sortie

| Nature | Valeurs |
|---|---|
| Entrées | `window.location.hostname`, valeur de session `mediaServerAvailable`, statut HTTP de `POST /get-resume-playback`. |
| Sorties | Booléen global `mediaServerAvailable`, valeur `"true"`/`"false"` en session, classe CSS sur `<body>` et, sur l’accueil, objet `context` avec environnement et permissions. |
| Dépendances | API navigateur (`fetch`, `sessionStorage`, `document`), MediaServer local sur le port 9876, `calculContext.js` sur l’accueil, `style.css` pour l’affichage. |

## Cas d'erreur

- Si la requête échoue au niveau réseau, le `catch` de `isMediaServerAvailable()` considère le serveur indisponible et renvoie `false`.
- La vérification se fonde sur `response.ok`, pas sur la validité ou le contenu JSON de la réponse.
- Dans `mediaServer.js`, une erreur levée pendant le traitement d’une requête est renvoyée avec HTTP 500 ; une méthode autre que POST reçoit 404.
- Un HTTP non-OK est traité comme indisponible même si le serveur répond. Aucun détail d’erreur n’est consigné par le `catch` client.

## Comportement de repli

La valeur en session initialise l’interface avant la réponse réseau. Une détection réseau négative masque les commandes `mediaserver-only` et expose les éléments `download-only`. Si une information plus précise sur le serveur distant est attendue : **Non trouvé dans les sources analysées**.

## Notes importantes

- L’appel immédiat depuis `utils.js` n’est pas attendu par tous les initialiseurs ; seule la page d’accueil, la page Films et la page Tools attendent explicitement la vérification dans leur initialiseur.
- `calculContext` calcule des permissions ; les règles CSS de visibilité utilisent les classes de `<body>`. Ce sont deux mécanismes distincts.
- Les classes JavaScript appelées `mediaserver` et `no-mediaserver` sont des classes CSS, pas des classes de code : **Aucune classe JavaScript définie dans les sources analysées**.
