# Présentation générale du projet

## Rôle du projet

Médiathèque est une interface web locale qui présente un catalogue de films, de séries, d’épisodes et de collections. Elle permet de rechercher et filtrer les médias, d’associer des métadonnées TMDB, de lancer VLC sur un média local et de demander une reprise de lecture. Un serveur Node.js local relie le navigateur aux fichiers du catalogue, aux disques et au lecteur multimédia.

## Principales fonctionnalités détectées

- Parcourir le catalogue de films et séries, consulter les collections et les détails de films/épisodes.
- Filtrer les médias par texte, langue et métadonnées.
- Scanner les lecteurs et générer/synchroniser le catalogue JSON.
- Associer films et séries à TMDB et enregistrer les métadonnées associées.
- Lancer ou reprendre une lecture via VLC sur les postes où le MediaServer est disponible.
- Afficher les actions de téléchargement/demande si le MediaServer est absent.
- Modifier certaines métadonnées, ouvrir l’emplacement d’un fichier et supprimer un fichier de film depuis l’interface locale.

## Technologies utilisées

| Technologie | Usage observé |
|---|---|
| HTML | Pages de l’application et fragments de navigation partagés. |
| CSS | Mise en page et visibilité conditionnelle des actions (`mediaserver-only`, `download-only`, `linux-hidden`). |
| JavaScript côté navigateur | Navigation, rendu, filtres, état local, appels HTTP et intégration TMDB. |
| Node.js / CommonJS | Serveur local et générateur du catalogue. |
| JSON | Catalogue, configuration du serveur, alias, mots ignorés et état de reprise. |
| API TMDB | Recherche de films/séries, détails des collections et épisodes. |
| VLC | Lecture locale lancée par le serveur. |
| Windows Explorer | Ouverture des dossiers média par le serveur. |
| Google Forms | Formulaire de demande déclenché par les actions de téléchargement ; ce n’est pas un transfert direct du fichier. |

`package.json` ne déclare aucune dépendance npm. Le serveur utilise les modules Node intégrés `http`, `fs`, `path`, `child_process` et `os`. Les autres dépendances exécutées par le navigateur sont les API Web natives (`fetch`, DOM, `localStorage`, `sessionStorage`). Aucune bibliothèque/framework applicatif n’est déclaré dans le manifeste analysé.

# Structure des dossiers

```text
mediatheque/
├── common/       Fragment HTML réutilisé par les pages
├── config/       Constantes et filtres de l'interface
├── controller/   Génération du catalogue depuis les médias
├── css/          Styles de l'application
├── data/         Catalogue JSON exploité par l'interface
├── docs/         Documentation technique
├── img/          Images locales de l'application
├── js/           Logique navigateur organisée par domaine/page
├── Publication/  Ressources de publication, notamment les bannières
├── *.html        Pages d'accueil, collections, films, séries et outils
└── package.json  Métadonnées et commande npm de génération du catalogue

Z:\01_mediaServer/
├── config/       Configuration du serveur, des sources et chemins
├── data/         Données locales du serveur et reprise VLC
├── js/           Calcul des lecteurs et des chemins
└── mediaServer.js Serveur HTTP local, résolution des chemins et commandes VLC
```

| Dossier | Rôle |
|---|---|
| `common/` | Contient `topbar.html`, chargé par les pages pour partager navigation et actions. |
| `config/` | Définit les filtres, constantes et réglages du front-end. |
| `controller/` | Contient `generateCatalog.js`, qui parcourt les sources média et écrit `data/catalog.json`. |
| `css/` | Feuille de style principale, y compris l’affichage selon disponibilité du serveur et plateforme. |
| `data/` | Catalogue que le navigateur charge directement et que le générateur met à jour. |
| `docs/` | Fiches de parcours et vue d’ensemble destinées aux développeurs. |
| `img/` | Ressources locales d’interface. |
| `js/` | Scripts navigateur : état, catalogue, pages, lecture, TMDB et utilitaires. |
| `Publication/` | Images de publication/bannières ; aucun rôle dans le flux d’exécution principal n’a été trouvé dans les sources analysées. |
| `Z:\01_mediaServer\config\` | Configuration consommée par le serveur local et le générateur. |
| `Z:\01_mediaServer\data\` | Fichier de reprise partagé et autres données propres au MediaServer. |
| `Z:\01_mediaServer\js\` | Fonctions utilitaires serveur, notamment la détection de lecteurs et le calcul des chemins. |

# Architecture applicative

| Couche | Responsabilité | Composants principaux |
|---|---|---|
| Interface utilisateur | Pages statiques et éléments manipulés dans le navigateur. | `index.html`, `films.html`, `film-detail.html`, `collections.html`, `series.html`, `episodes.html`, `tools.html`. |
| Logique métier front-end | Chargement/rendu du catalogue, filtres, navigation, actions de lecture et de recherche. | `js/films.js`, `js/series.js`, `js/episodes.js`, `js/collections.js`, `js/film-detail.js`, `js/tools.js`, `js/playback.js`. |
| Composants partagés | Navigation, constantes, état, affichage des pochettes et fonctions communes. | `common/topbar.html`, `config/constants.js`, `js/state.js`, `js/media.js`, `js/utils.js`, `js/app-init.js`. |
| Stockage navigateur | Préférences et données temporaires de navigation/reprise locale. | `localStorage` et `sessionStorage`, utilisés par `state.js`, `playback.js`, `utils.js` et les pages. |
| Stockage applicatif | Catalogue persistant des films et séries. | `data/catalog.json`, lu par le navigateur et écrit par `controller/generateCatalog.js` ou le serveur local. |
| API externe | Recherche/complément des métadonnées et épisodes. | Endpoints TMDB appelés depuis `js/tmdb.js`. |
| Serveur local | API HTTP sur `localhost:9876`, accès aux disques, démarrage VLC et opérations de catalogue. | `Z:\01_mediaServer\mediaServer.js`. |
| Génération de données | Scan des fichiers, normalisation et construction du catalogue. | `controller/generateCatalog.js`, lancé par le serveur ou `npm run generate`. |

Les scripts front-end sont chargés directement par les pages HTML, sans système de modules visible côté navigateur. Le serveur local et le générateur utilisent CommonJS.

# Flux principaux

## Chargement d'une page

| Étape | Composant | Action |
|---|---|---|
| 1 | Page HTML | Charge scripts et fragment `common/topbar.html`. |
| 2 | Initialiseur de page | Attend `DOMContentLoaded`, prépare l’état et charge le catalogue. |
| 3 | `js/catalog.js` | Lit `data/catalog.json`. |
| 4 | Script de page | Filtre les données et construit les éléments du DOM. |
| 5 | `js/utils.js` / `css/style.css` | Établit l’état du serveur local et adapte les actions visibles. |

## Lecture locale

```text
Utilisateur
  → Fiche du film / carte d'épisode
  → js/playback.js
  → POST http://localhost:9876/
  → Z:\01_mediaServer\mediaServer.js
  → résolution du chemin physique
  → VLC
```

La reprise suit un flux voisin : le navigateur lit ou met à jour l’état via les routes `/get-resume-playback`, `/update-resume-playback`, `/resume-playback` et `/sync-resume-playback`. Les détails du parcours film sont dans [05-parcours-lecture-film.md](./05-parcours-lecture-film.md).

## Recherche et accès aux médias

```text
Disques / sources média
  → MediaServer (détection des lecteurs)
  → controller/generateCatalog.js
  → data/catalog.json
  → js/catalog.js
  → filtres et rendu de la page
```

Une ouverture de dossier part de la fiche du média, puis passe par `POST /open-file-location` et le MediaServer avant l’appel système. Voir [04-recherche-acces-fichiers-medias.md](./04-recherche-acces-fichiers-medias.md).

## Mise à jour des métadonnées

```text
Page d'outils / association TMDB
  → js/tools.js ou js/tmdb.js
  → API TMDB (si recherche/détails nécessaires)
  → POST au MediaServer
  → écriture dans data/catalog.json
  → mise à jour du rendu navigateur
```

# Points d'entrée

## Pages et lancement

| Point d'entrée | Rôle |
|---|---|
| `C:\Users\alnos\Documents\Projets\mediatheque\index.html` | Page d’accueil principale ; initialise `initHomePage()`. |
| `C:\Users\alnos\Documents\Projets\mediatheque\films.html` | Liste des films ; initialise `initFilmsPage()`. |
| `C:\Users\alnos\Documents\Projets\mediatheque\film-detail.html` | Détail TMDB d’un film et ses fichiers ; initialise `initFilmDetailPage()`. |
| `C:\Users\alnos\Documents\Projets\mediatheque\collections.html` | Liste des collections ; initialise `initCollectionsPage()`. |
| `C:\Users\alnos\Documents\Projets\mediatheque\series.html` | Liste des séries ; initialise `initSeriesPage()`. |
| `C:\Users\alnos\Documents\Projets\mediatheque\episodes.html` | Détail de série/saison et épisodes ; initialise `initSerieDetailPage()`. |
| `C:\Users\alnos\Documents\Projets\mediatheque\tools.html` | Édition rapide des métadonnées de films ; initialise `initToolsPage()`. |
| `Z:\01_mediaServer\mediaServer.js` | Processus Node local démarré sur le port 9876. |
| `C:\Users\alnos\Documents\Projets\mediatheque\controller\generateCatalog.js` | Générateur de catalogue lancé par `npm run generate` ou le MediaServer. |

## Routes principales du MediaServer

Toutes les routes sont reçues en POST ; OPTIONS est utilisé pour le préflight CORS. Les principales routes observées :

| Route | Fonction |
|---|---|
| `/get-resume-playback` | Vérifie la disponibilité et renvoie l’état de reprise. |
| `/resume-playback`, `/update-resume-playback`, `/sync-resume-playback` | Lance ou synchronise la reprise VLC. |
| `/refresh-catalog` | Lance le scan et la régénération du catalogue. |
| `/open-file-location` | Ouvre le dossier physique d’un média. |
| `/associate-tmdb-film`, `/associate-tmdb-serie` | Enregistre une association TMDB. |
| `/save-film-metadata`, `/save-missing-episode-flags` | Enregistre des métadonnées et indicateurs de série. |
| `/delete-film-file` | Supprime un fichier de film et son entrée de catalogue. |
| `/get-ignore-words`, `/set-ignore-word` | Lit ou met à jour la configuration des mots ignorés. |
| POST sur une route non reconnue | Le routeur courant transmet la requête à `launchVlc()` ; ce comportement concerne aussi la racine `/`. |

La route `/get-catalog` n’est pas référencée côté navigateur dans les sources analysées. Le front charge `data/catalog.json` par `fetch`.

# Dépendances majeures

| Dépendance | Présence et rôle |
|---|---|
| Node.js | Requis par `package.json` et les scripts `.cmd` pour exécuter générateur et serveur. |
| Modules Node natifs | `http`, `fs`, `path`, `child_process`, `os` apparaissent dans `Z:\01_mediaServer\mediaServer.js`; `fs`/`path` dans le générateur. |
| VLC | Exécutable enfant lancé par le MediaServer pour lire et reprendre les fichiers. |
| API TMDB | Appel réseau depuis `js/tmdb.js` pour les recherches et détails média. |
| Lecteurs / volumes média | Sources physiques détectées par `Z:\01_mediaServer\js\calculChemins.js` puis parcourues par le générateur. |
| API navigateur | DOM, `fetch`, `localStorage` et `sessionStorage`, sans paquet tiers déclaré. |
| Google Forms | Destination externe des actions de demande de téléchargement ; pas de bibliothèque utilisée pour ce flux. |
| npm | Script de confort `generate` ; aucune dépendance npm déclarée dans `package.json`. |

# Fichiers critiques

| Chemin complet | Raison |
|---|---|
| `C:\Users\alnos\Documents\Projets\mediatheque\index.html` | Porte d’entrée de l’accueil et exemple du chargement des scripts front-end. |
| `C:\Users\alnos\Documents\Projets\mediatheque\common\topbar.html` | Navigation et actions communes injectées dans les pages. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\catalog.js` | Lecture/régénération du catalogue et actualisation des statistiques/pages. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\state.js` | État de page, contexte collections et persistance de filtres/recherche. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\utils.js` | Détection du MediaServer, recherche commune et fonctions d’interface. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\playback.js` | Point de jonction front-end avec lecture locale et reprise. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\tmdb.js` | Recherche/association TMDB et chargement de détails externes. |
| `C:\Users\alnos\Documents\Projets\mediatheque\controller\generateCatalog.js` | Parcours des fichiers et production du catalogue persistant. |
| `C:\Users\alnos\Documents\Projets\mediatheque\data\catalog.json` | Source commune aux pages pour les entrées et chemins médias. |
| `Z:\01_mediaServer\mediaServer.js` | API locale, résolution des chemins, opérations sur les données et lancement VLC. |
| `Z:\01_mediaServer\js\calculChemins.js` | Découverte des volumes et calcul des chemins physiques/configuration. |
| `Z:\01_mediaServer\config\config.json` | Configuration des sources, extensions et chemin de reprise. |

# Carte du projet

```text
index.html ──────────┐
films.html ──────────┤
film-detail.html ────┤
collections.html ────┼──> scripts js/ ──> data/catalog.json
series.html ─────────┤       │
episodes.html ───────┤       ├──> API TMDB
tools.html ──────────┘       │
                             └──> localhost:9876
                                   └──> mediaServer.js
                                        ├──> VLC
                                        ├──> systèmes de fichiers
                                        └──> generateCatalog.js
                                             └──> data/catalog.json

common/topbar.html ───────────> partagé par les pages HTML
config/constants.js ─────────> filtres et constantes partagés
js/state.js / utils.js ──────> état et fonctions partagés
```

# Zone de démarrage rapide

Ordre conseillé pour une première lecture :

1. `C:\Users\alnos\Documents\Projets\mediatheque\package.json` — scripts disponibles et type de module Node.
2. `C:\Users\alnos\Documents\Projets\mediatheque\index.html` — composition de l’accueil et chargement des scripts.
3. `C:\Users\alnos\Documents\Projets\mediatheque\common\topbar.html` — navigation commune.
4. `C:\Users\alnos\Documents\Projets\mediatheque\config\constants.js` — filtres et constantes métier visibles.
5. `C:\Users\alnos\Documents\Projets\mediatheque\js\state.js` — état partagé et stockage navigateur.
6. `C:\Users\alnos\Documents\Projets\mediatheque\js\utils.js` — disponibilité serveur et fonctions utilitaires.
7. `C:\Users\alnos\Documents\Projets\mediatheque\js\catalog.js` — chargement et rafraîchissement du catalogue.
8. `C:\Users\alnos\Documents\Projets\mediatheque\data\catalog.json` — forme réelle des données média.
9. `C:\Users\alnos\Documents\Projets\mediatheque\js\films.js` — rendu et filtres de la liste de films.
10. `C:\Users\alnos\Documents\Projets\mediatheque\js\film-detail.js` — consultation des fichiers d’un film et actions.
11. `C:\Users\alnos\Documents\Projets\mediatheque\js\series.js` — liste et logique des séries/langues.
12. `C:\Users\alnos\Documents\Projets\mediatheque\js\episodes.js` — saisons, épisodes et commandes associées.
13. `C:\Users\alnos\Documents\Projets\mediatheque\js\playback.js` — lecture locale et reprise.
14. `C:\Users\alnos\Documents\Projets\mediatheque\js\tmdb.js` — intégration TMDB.
15. `C:\Users\alnos\Documents\Projets\mediatheque\controller\generateCatalog.js` — scan et génération des données.
16. `Z:\01_mediaServer\mediaServer.js` — endpoints locaux et opérations système.
17. `Z:\01_mediaServer\js\calculChemins.js` — adaptation des chemins aux volumes et plateformes.
18. `Z:\01_mediaServer\config\config.json` — configuration du MediaServer.

## Points à vérifier lors d'une intervention

- `Z:\01_mediaServer\config\config.json` observé contient `mediatheque_path`, mais `refreshCatalog()` consulte `config.ma_mediatheque_path`. L’effet concret dépend de la configuration réellement chargée.
- Le script `C:\Users\alnos\Documents\Projets\mediatheque\Lancer_MediaServer.cmd` pointe vers `E:\01_mediaServer\mediaServer.js`, tandis que le serveur analysé est dans `Z:\01_mediaServer`. L’alignement de ces chemins sur la machine de lancement est **Non trouvé dans les sources analysées**.
- La commande cliente `C:\Users\alnos\Documents\Projets\mediatheque\Lancer_MediaServer_client.cmd` référence `controller\mediaServer.js`; aucun fichier correspondant n’a été trouvé dans le workspace du projet : **Non trouvé dans les sources analysées**.

## Sources non trouvées

- `main.dart`, `README` et manifeste de dépendances front-end distinct : **Non trouvé dans les sources analysées**.
- Classes applicatives JavaScript/Node définies avec `class` : **Non trouvé dans les sources analysées**.
