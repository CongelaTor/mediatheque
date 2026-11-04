# Communication client ↔ serveur local

## Objectif

Décrire le contrat HTTP entre l’interface Web et le MediaServer Node.js local : disponibilité, lecture/reprise, synchronisation, scan et opérations sur le catalogue.

## Point d'entrée

- [C:\Users\alnos\Documents\Projets\mediatheque\js\utils.js](C:\Users\alnos\Documents\Projets\mediatheque\js\utils.js) — aucune classe ; `isMediaServerAvailable()` contacte le serveur pour la détection.
- [Z:\01_mediaServer\mediaServer.js](Z:\01_mediaServer\mediaServer.js) — aucune classe ; `http.createServer()` distribue les requêtes POST sur le port `9876`.
- [C:\Users\alnos\Documents\Projets\mediatheque\Lancer_MediaServer.cmd](C:\Users\alnos\Documents\Projets\mediatheque\Lancer_MediaServer.cmd) — script de lancement observé : exécute Node sur `E:\01_mediaServer\mediaServer.js`.

## Parcours d'exécution

### Résumé visuel

| Requête | Traitement serveur |
|---|---|
| OPTIONS | Réponse HTTP 200 au préflight CORS. |
| POST avec route reconnue | Analyse du JSON puis appel de la fonction associée à la route. |
| POST avec route inconnue | Délégation à `launchVlc()` pour démarrer la lecture. |
| Autre méthode HTTP | Réponse HTTP 404. |

Les routes et leurs fonctions associées sont listées dans le tableau ci-dessous. Les traitements utilisent le catalogue, les chemins physiques et les fichiers de configuration du serveur.

## Conditions de décision

- Seule la méthode POST est acceptée par le gestionnaire ; les méthodes non-POST reçoivent HTTP 404.
- Les routes de service doivent correspondre exactement aux chaînes vérifiées par le serveur. `/` n’a pas de branche nommée et atteint donc le démarrage VLC.
- `resolvePhysicalPath(catalogFile)` sélectionne une racine physique selon le préfixe du chemin de catalogue et la plateforme.
- `refreshCatalog(type, response)` crée des racines de scan à partir des lecteurs détectés ; le script de génération reçoit `MEDIA_SCAN_SOURCES`.

## Fichiers impliqués

| Chemin complet | Classe | Méthode / rôle |
|---|---|---|
| `C:\Users\alnos\Documents\Projets\mediatheque\js\utils.js` | Aucune | `isMediaServerAvailable()` envoie `POST /get-resume-playback`. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\catalog.js` | Aucune | `reloadCatalog()` envoie `POST /refresh-catalog`, recharge `data/catalog.json` après succès et rafraîchit les vues. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\playback.js` | Aucune | `requestLocalPlay()`, `syncResumePlayback()`, `requestResumePlayback()`, `updateResumePlayback()` envoient les commandes de lecture/reprise. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\film-detail.js` | Aucune | `openFilmLocation()` appelle `/open-file-location`; la suppression de fichier appelle `/delete-film-file`. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\episodes.js` | Aucune | `sendMissingEpisodeFlags()` appelle `/save-missing-episode-flags`. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\tmdb.js` | Aucune | Recherche des mots ignorés et association TMDB : `/get-ignore-words`, `/set-ignore-word`, `/associate-tmdb-film`, `/associate-tmdb-serie`. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\tools.js` | Aucune | `saveFilmMetadata()` appelle `/save-film-metadata`. |
| `Z:\01_mediaServer\mediaServer.js` | Aucune | Le serveur écoute, route les requêtes et implémente `launchVlc()`, les fonctions de reprise, `refreshCatalog()`, `resolvePhysicalPath()` et les opérations catalogue. |
| `Z:\01_mediaServer\js\calculChemins.js` | Aucune | `calculatePaths()` et `detectDriveMappings()` définissent racines, chemins de configuration et lecteurs détectés. |
| `Z:\01_mediaServer\config\config.json` | Aucune | Configuration des racines, formats média/image et chemin de reprise. |

## Routes, données et résultats observés

| Route | Appelant principal | Fonction serveur | Résultat/usage |
|---|---|---|---|
| `POST /get-resume-playback` | `utils.js`, `playback.js` | `getResumePlayback()` | Objet JSON de reprise, ou `{}` si le fichier n’existe pas. |
| `POST /resume-playback` | `playback.js` | `resumePlayback()` | Lance VLC sur la reprise et renvoie du texte ; accepte `type`. |
| `POST /update-resume-playback` | `playback.js` | `updateResumePlayback()` | Enregistre type, `catalogPath`, position, date et nom de PC. |
| `POST /sync-resume-playback` | `playback.js` et minuteur serveur | `syncResumePlayback()` | Lit le dernier média VLC et synchronise le fichier partagé. |
| `POST /refresh-catalog` | `catalog.js` | `refreshCatalog()` | Lance `controller/generateCatalog.js`, puis renvoie les logs. |
| `POST /open-file-location` | `film-detail.js`, `tmdb.js` | `openFileLocation()` | Ouvre le chemin physique via Explorer. |
| `POST /save-missing-episode-flags` | `episodes.js` | `saveMissingEpisodeFlags()` | Persiste les saisons avec épisodes manquants. |
| `POST /associate-tmdb-film`, `/associate-tmdb-serie` | `tmdb.js` | `saveFilmTmdbData()`, `saveSerieTmdbData()` | Persiste les métadonnées associées dans le catalogue. |
| `POST /save-film-metadata` | `tools.js` | `saveFilmMetadata()` | Persiste type, genre et studio. |
| `POST /delete-film-file` | `film-detail.js` | `deleteFilmFile()` | Supprime le média physique et son entrée catalogue après confirmation UI. |
| `POST /get-ignore-words`, `/set-ignore-word` | `tmdb.js` | `getIgnoreWords()`, `setIgnoreWord()` | Lit ou modifie les mots exclus du fichier de configuration dédié. |
| POST sur une route non listée (dont `/`) | `playback.js` | `launchVlc()` | Résout `fichier` ou `fichiers`, lance VLC et répond `OK`. |

## Données d'entrée et de sortie

| Nature | Valeurs |
|---|---|
| Entrées | Méthode et URL HTTP, corps JSON (vide interprété comme `{}`), fichiers de configuration et chemins relatifs du catalogue. |
| Sorties | Statuts HTTP et corps texte/JSON; selon la route, mise à jour du catalogue/reprise, ouverture d’un dossier, scan ou processus VLC. |
| Dépendances | API navigateur `fetch`, serveur Node.js local, modules Node intégrés, données JSON, volumes média et VLC. |

## Cas d'erreur

- JSON invalide ou exception synchrone dans la distribution : log serveur et HTTP 500 avec le message d’erreur.
- Méthode autre que POST : HTTP 404. Route POST non listée : ce n’est pas une 404, elle lance VLC.
- Reprise sans `resumePlaybackPath` configuré : HTTP 500 ; reprise absente : HTTP 404 ; aucune entrée VLC à synchroniser : HTTP 404.
- `launchVlc()` répond HTTP 200 immédiatement ; une erreur asynchrone de lancement VLC est seulement écrite dans la console serveur.
- Les clients `requestLocalPlay()`, `requestResumePlayback()` et `syncResumePlayback()` consignent les erreurs réseau en console. `requestLocalPlay()` ne vérifie pas `response.ok`. `updateResumePlayback()` vérifie le statut avant de traiter le JSON.

## Comportement de repli

Si le fichier de reprise n’existe pas, `getResumePlayback()` renvoie `{}`. Si une entrée n’a pas de chemin physique connu par `resolvePhysicalPath()`, la fonction renvoie le chemin de catalogue reçu inchangé. La position est normalisée à zéro dans `resumePlayback()` si sa valeur enregistrée n’est pas numérique.

## Notes importantes

- Le fichier de reprise configuré dans le fichier serveur est un état partagé sur disque ; sa configuration observée est `Z:\01_mediaServer\config\config.json`.
- La configuration lue contient la clé `mediatheque_path`, tandis que `refreshCatalog()` consulte `config.ma_mediatheque_path`. En l’état observé, cette différence peut empêcher la construction du chemin de génération ; l’issue d’exécution dépend de la valeur réellement chargée.
- La communication du bouton Télécharger n’est pas une route de ce serveur ; voir [02-affichage-play-telecharger.md](./02-affichage-play-telecharger.md).
- Aucune classe JavaScript/Node de type `class` n’a été trouvée pour ces composants ; ils sont constitués de fonctions et d’un serveur HTTP global.
