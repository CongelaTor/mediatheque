# Parcours complet de lecture d'un film

## Objectif

Tracer le clic sur Play depuis la fiche d’un film jusqu’au lancement de VLC, ainsi que l’enregistrement et la reprise d’une position de lecture.

## Point d'entrée

- [C:\Users\alnos\Documents\Projets\mediatheque\film-detail.html](C:\Users\alnos\Documents\Projets\mediatheque\film-detail.html) — aucune classe ; charge `film-detail.js` et appelle `initFilmDetailPage()` au `DOMContentLoaded`.
- [C:\Users\alnos\Documents\Projets\mediatheque\js\film-detail.js](C:\Users\alnos\Documents\Projets\mediatheque\js\film-detail.js) — aucune classe ; `createFilmFileCard(film)` associe le clic du bouton Play à `playFilm(film)`.
- [C:\Users\alnos\Documents\Projets\mediatheque\js\playback.js](C:\Users\alnos\Documents\Projets\mediatheque\js\playback.js) — aucune classe ; contient les appels de lecture et de reprise au MediaServer.

## Parcours d'exécution

### Lecture

| Ordre | Composant | Action |
|---|---|---|
| 1 | `initFilmDetailPage()` | Lit `tmdbId`, charge le catalogue et sélectionne les fichiers du film. |
| 2 | `renderFilmFiles()` / `createFilmFileCard()` | Filtre par langues, trie par taille et crée les commandes. |
| 3 | `playFilm()` | Enregistre le choix localement, demande une mise à jour de reprise puis envoie le fichier au serveur. |
| 4 | `requestLocalPlay()` | Envoie un POST JSON à `http://localhost:9876/`. |
| 5 | `launchVlc()` / `resolvePhysicalPath()` | Résout le chemin catalogué et lance VLC avec le média physique. |
| 6 | MediaServer | Répond `OK`; une erreur asynchrone VLC est consignée côté serveur. |

### Reprise et synchronisation

| Événement | Client | MediaServer |
|---|---|---|
| Afficher l’état de reprise | `updateResumeButtons()` lit `/get-resume-playback`. | `getResumePlayback()` renvoie les données de reprise. |
| Reprendre | `resumeFilm()` demande `/resume-playback` avec le type film. | `resumePlayback()` résout le média et passe la position à VLC. |
| Synchroniser à la demande | `syncResumePlayback("film")` appelle `/sync-resume-playback`. | Lit les recents VLC et met à jour le fichier partagé. |
| Détecter une évolution VLC | Sans action du client. | Un minuteur serveur vérifie chaque minute le fichier d’interface VLC. |

Dans l’interface, l’état affiché contient le titre (ou le nom de fichier) et la position au format `HH:MM:SS`. Les détails des messages et leurs réponses sont dans [03-communication-client-serveur-local.md](./03-communication-client-serveur-local.md).

## Conditions de décision

- Le détail requiert un `tmdbId` numérique présent dans l’URL ; sans valeur, la page redirige vers `films.html`.
- `renderFilmFiles()` n’affiche que les fichiers dont une langue correspond à une langue sélectionnée.
- Play est un bouton `mediaserver-only` : il est masqué quand l’état de disponibilité ajoute `no-mediaserver`. Le détail du choix est dans [02-affichage-play-telecharger.md](./02-affichage-play-telecharger.md).
- `resumePlayback()` n’ouvre qu’un média pour le type `film`; les listes de 11 fichiers et le filtrage par langue sont le chemin propre aux séries.
- Le chemin physique dépend de la plateforme et des lecteurs configurés/détectés dans `resolvePhysicalPath()`.

## Fichiers impliqués

| Chemin complet | Classe | Méthode / rôle |
|---|---|---|
| `C:\Users\alnos\Documents\Projets\mediatheque\film-detail.html` | Aucune | Charge les modules et déclenche `initFilmDetailPage()`. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\film-detail.js` | Aucune | `initFilmDetailPage()`, `renderFilmFiles()`, `createFilmFileCard()` identifient et exposent le fichier à lire. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\playback.js` | Aucune | `playFilm()`, `saveResumeFilm()`, `updateResumePlayback()`, `requestLocalPlay()`, `updateResumeButtons()`, `resumeFilm()`, `requestResumePlayback()`, `syncResumePlayback()` orchestrent lecture et reprise. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\utils.js` | Aucune | `isMediaServerAvailable()` fournit l’état de service utilisé pour l’affichage. |
| `C:\Users\alnos\Documents\Projets\mediatheque\data\catalog.json` | Aucune | Fournit les films, leur `tmdbId`, leur `fichier` (chemin catalogué), titre et langues. |
| `Z:\01_mediaServer\mediaServer.js` | Aucune | `launchVlc()`, `resolvePhysicalPath()`, `getResumePlayback()`, `updateResumePlayback()`, `resumePlayback()`, `syncResumePlayback()` pilotent VLC et l’état de reprise. |
| `Z:\01_mediaServer\config\config.json` | Aucune | Fournit le chemin du fichier de reprise et les sources pour la résolution. |
| `Z:\01_mediaServer\data\01_reprise_vlc.json` | Aucune | État partagé observé : entrées `film`/`serie`, `catalogPath`, `positionSeconds`, `lastUpdate`, `pcName`. |
| Configuration VLC de l’utilisateur | Aucune | `readVlcRecents()` recherche le fichier récent VLC dans des emplacements dépendant de Windows/Linux ; chemin exact d’exécution propre à l’utilisateur. |

## Données d'entrée et de sortie

| Nature | Valeurs |
|---|---|
| Entrée lecture | `film.titre`, `film.fichier`; objet transmis `{type, titre, fichier}`. |
| Entrée de mise à jour de reprise | `{type:"film", catalogPath: film.fichier, durationSeconds: 0}`; le serveur lit aussi la position des recents VLC. |
| État persistant | Type, chemin, position, date ISO et nom du PC dans le fichier de reprise; titre, fichier et date également dans `localStorage["maVideotheque.resumeFilm"]`. |
| Sorties | Processus VLC; réponse HTTP textuelle (`OK` pour la lecture); informations de reprise affichées dans le navigateur. |
| Dépendances | MediaServer, VLC, catalogue JSON, configuration des chemins, historique récent VLC et stockage navigateur. |

## Cas d'erreur

- `resumePlayback()` renvoie 500 si `resumePlaybackPath` n’est pas configuré, 404 si aucune reprise de film n’a de `catalogPath`.
- Si l’historique VLC ne contient pas de fichier ou ne peut pas être lu avec les champs attendus, `readVlcRecents()` renvoie `null`; `updateResumePlayback()` consulte `latestPlayback.positionSeconds` sans garde après cet appel. **Comportement d’erreur complet au-delà du traitement 500 par le gestionnaire HTTP : Non trouvé dans les sources analysées**.
- `launchVlc()` répond avant le résultat de `execFile`; l’échec de lancement est uniquement journalisé dans la console serveur, pas retourné au client dans le statut HTTP.
- `requestLocalPlay()` lit le corps texte et journalise les erreurs réseau, mais ne vérifie pas `response.ok`.
- Sur la branche de détail sans film correspondant, `initFilmDetailPage()` tente de construire l’information avec `filmFiles.length`; la déclaration/origine de `filmFiles` n’a pas été trouvée dans les sources analysées. La branche utilise par ailleurs les métadonnées de session et appelle `renderFilmFiles([])`.

## Comportement de repli

- Sans `tmdbId` dans l’URL, redirection vers la liste de films.
- Si la position enregistrée est non numérique, `resumePlayback()` démarre à zéro (`Number(...) || 0`).
- Si le fichier JSON de reprise n’existe pas, `getResumePlayback()` renvoie `{}` ; le bouton de reprise film reste masqué faute de `catalogPath`.
- `saveResumeFilm()` garde un état local avec date même avant la réponse serveur, mais l’affichage de reprise côté film est construit depuis la réponse serveur.
- Le comportement détaillé en absence de serveur est documenté dans [01-disponibilite-serveur-local.md](./01-disponibilite-serveur-local.md).

## Notes importantes

- Les appels `updateResumePlayback()` et `requestLocalPlay()` sont démarrés l’un après l’autre sans être attendus ; l’ordre de fin des requêtes n’est donc pas garanti.
- `updateResumePlayback()` reçoit `durationSeconds: 0`, mais la fonction serveur utilise la position des recents VLC ; le paramètre n’est pas exploité dans le code serveur consulté.
- Pour les films, le chemin heureux démarre VLC sur un seul fichier. L’enchaînement jusqu’à 11 fichiers de même langue est implémenté pour les épisodes de série, pas pour `playFilm()`.
- Aucune classe JavaScript/Node de type `class` n’a été trouvée dans le parcours ; les composants sont des fonctions globales.
