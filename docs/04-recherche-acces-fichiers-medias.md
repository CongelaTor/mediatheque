# Recherche et accès aux fichiers médias

## Objectif

Décrire comment le catalogue est produit et chargé, comment les pages filtrent ses entrées et comment un chemin de catalogue est relié au fichier physique pour ouvrir son dossier.

## Point d'entrée

- [C:\Users\alnos\Documents\Projets\mediatheque\films.html](C:\Users\alnos\Documents\Projets\mediatheque\films.html) — aucune classe ; `initFilmsPage()` charge puis filtre le catalogue des films.
- [C:\Users\alnos\Documents\Projets\mediatheque\js\catalog.js](C:\Users\alnos\Documents\Projets\mediatheque\js\catalog.js) — aucune classe ; `loadCatalog()` lit le JSON de catalogue ; `reloadCatalog()` demande au serveur local de le régénérer.
- [C:\Users\alnos\Documents\Projets\mediatheque\controller\generateCatalog.js](C:\Users\alnos\Documents\Projets\mediatheque\controller\generateCatalog.js) — aucune classe ; programme Node de scan appelé directement ou par le MediaServer.

## Parcours d'exécution

### Construction et chargement du catalogue

### Résumé visuel

| Départ | Parcours | Résultat |
|---|---|---|
| Demande de scan | Interface → `/refresh-catalog` → MediaServer → `generateCatalog.js` | Catalogue rescanné, synchronisé et écrit dans `data/catalog.json`. |
| Ouverture d’une page | Page → `loadCatalog()` → `data/catalog.json` | Données disponibles au rendu côté navigateur. |
| Recherche de films | Champ de recherche → `handleSearch()` → `renderFilms()` | Cartes regroupées et filtrées selon le contexte et les critères sélectionnés. |
| Recherche Tools | Champ/critères → `renderTools()` | Liste filtrée sur métadonnées, titre et chemin. |
| Ouverture d’un dossier | Détail film → `/open-file-location` → MediaServer → Explorer | Dossier physique transmis à Windows Explorer. |
| Affiche non accessible | `createPosterContent()` → `createMissingPoster()` | Vignette de remplacement avec le titre. |

Le scan collecte récursivement les extensions configurées. L’analyse extrait notamment titre, année, langue, saison/épisode et taille; les métadonnées existantes sont conservées pour les fichiers reconnus. Les fonctions et leurs responsabilités figurent dans « Fichiers impliqués ».

## Conditions de décision

- [C:\Users\alnos\Documents\Projets\mediatheque\controller\generateCatalog.js](C:\Users\alnos\Documents\Projets\mediatheque\controller\generateCatalog.js) — aucune classe ; `sourcesToScan` retient toutes les sources pour `all`, sinon compare `source.type` au type singulier dérivé (`films` → `film`, `series` → `serie`). Un dossier absent est journalisé puis ignoré.
- Même fichier — `analyzeVideoFile()` considère la source déclarée `film` ou `serie`; les épisodes dont saison/numéro ne sont pas détectés ne sont pas ajoutés par `syncEpisode()`.
- [Z:\01_mediaServer\mediaServer.js](Z:\01_mediaServer\mediaServer.js) — aucune classe ; `resolvePhysicalPath()` mappe `/Box_` et `/01_` vers le lecteur `01`, `/02_` vers le lecteur `02`, puis cherche les autres racines dans `config.sources`.
- [C:\Users\alnos\Documents\Projets\mediatheque\js\films.js](C:\Users\alnos\Documents\Projets\mediatheque\js\films.js) — aucune classe ; les résultats sont regroupés par `tmdbId`, ou à défaut par titre et année ; le clic poster ouvre le détail si TMDB est associé.

## Fichiers impliqués

| Chemin complet | Classe | Méthode / rôle |
|---|---|---|
| `C:\Users\alnos\Documents\Projets\mediatheque\data\catalog.json` | Aucune | Données persistées : tableaux `films` et `series`, chemins `fichier`, métadonnées et hiérarchie saisons/épisodes. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\catalog.js` | Aucune | `loadCatalog()`, `reloadCatalog()`, `updateStats()` lisent, régénèrent et résument le catalogue. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\films.js` | Aucune | `initFilmsPage()`, `renderFilms()`, `filmMatchesAjouts()`, `filmMatchesLanguage()`, `createFilmCard()` chargent, filtrent, regroupent et affichent les films. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\tools.js` | Aucune | `renderTools()` filtre les films/outils sur titre et chemin ; `saveFilmMetadata()` persiste les corrections. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\state.js` | Aucune | `getSearchTextKey()`, `saveSearchText()`, `loadSearchText()` gèrent la recherche persistée par page/contexte. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\utils.js` | Aucune | `handleSearch()` et `matchesSearch()` mettent à jour le texte de recherche et délèguent au rendu de la page. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\media.js` | Aucune | `createPosterContent()`, `isWebSafeImagePath()`, `createMissingPoster()` gèrent les images d’affiche et leur substitut. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\film-detail.js` | Aucune | `renderFilmFiles()`, `createFilmFileCard()`, `getFilmFolder()`, `openFilmLocation()` affichent les fichiers et ouvrent leur dossier. |
| `C:\Users\alnos\Documents\Projets\mediatheque\controller\generateCatalog.js` | Aucune | `scanDirectory()`, `buildCatalogPath()`, `analyzeVideoFile()`, `syncFilm()`, `syncEpisode()`, `sortCatalog()` composent le catalogue. |
| `C:\Users\alnos\Documents\Projets\mediatheque\config\constants.js` | Aucune | `initFiltersSidebar()` et `renderAllSidebarFilters()` fournissent les filtres et leur initialisation. |
| `Z:\01_mediaServer\mediaServer.js` | Aucune | `refreshCatalog()`, `resolvePhysicalPath()`, `openFileLocation()` transmettent le scan et l’accès local au système. |
| `Z:\01_mediaServer\js\calculChemins.js` | Aucune | `detectDriveMappings()` et `calculatePaths()` calculent lecteurs et racines de configuration. |
| `Z:\01_mediaServer\config\config.json` | Aucune | Extensions vidéo/image et configuration des sources consultées par le scan et la résolution. |

## Données d'entrée et de sortie

| Nature | Valeurs |
|---|---|
| Entrées scan | Type `all`, `films` ou `series`; racines physiques détectées; extensions et sources configurées; catalogue existant; alias de langue et mots ignorés. |
| Entrées de recherche | Texte, filtres courants, métadonnées et chemins de `catalog.json`. |
| Sorties | `data/catalog.json`; cartes filtrées dans la page; dossier physique transmis à Explorer pour l’ouverture locale. |
| Dépendances | Node.js, système de fichiers, lecteurs/montages, configurations JSON, navigateur et MediaServer pour le scan et l’accès local. |

## Cas d'erreur

- `loadCatalog()` ne définit pas de traitement spécifique d’une réponse HTTP non-OK ou d’un JSON invalide : **Non trouvé dans les sources analysées**.
- Un dossier de scan absent est signalé dans le journal et sauté ; un fichier média d’une extension non configurée est ignoré.
- `resolvePhysicalPath()` renvoie le chemin catalogué sans traduction si aucune règle de racine ne s’applique.
- `openFileLocation()` répond HTTP 400 si le chemin n’est pas fourni ; l’échec d’`explorer.exe` est écrit dans la console serveur.
- Les chemins d’image locaux de disque (par exemple `/Box_Films/...`) ne sont pas déclarés web-safe par `isWebSafeImagePath()` ; ils aboutissent donc à l’affiche substitutive dans le navigateur.

## Comportement de repli

- Un scan ciblé conserve l’autre catégorie du catalogue : films existants quand le type est `series`, séries existantes quand le type est `films`.
- Une image absente ou non exploitable est remplacée par une vignette portant le titre.
- Une recherche vide correspond à toutes les entrées ; `matchesSearch()` renvoie vrai sans filtre.
- Si une série n’a aucun épisode exploitable après le scan, `removeEmptySeries()` la retire du catalogue.

## Notes importantes

- La configuration observée `Z:\01_mediaServer\config\config.json` a des tableaux `paths` vides dans `sources`; le serveur construit néanmoins une liste de scan dynamique à partir des lecteurs détectés et la transmet via l’environnement.
- `refreshCatalog()` lit `config.ma_mediatheque_path`, alors que le JSON consulté présente `mediatheque_path` ; l’accès au chemin du générateur doit être interprété en tenant compte de cette différence de clé.
- Les fonctions sont globales ou de module Node ; aucune classe n’a été trouvée dans ces fichiers.
