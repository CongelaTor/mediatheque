# Logique d'affichage Play ou Télécharger

## Objectif

Présenter l’action adaptée à l’accès local : lecture via le MediaServer lorsqu’il est disponible, ou demande de téléchargement lorsqu’il ne l’est pas, avec un chemin spécifique à l’intégration WebContainer.

## Point d'entrée

- [C:\Users\alnos\Documents\Projets\mediatheque\film-detail.html](C:\Users\alnos\Documents\Projets\mediatheque\film-detail.html) — aucune classe ; l’initialiseur `initFilmDetailPage()` construit les commandes de chaque fichier du film.
- [C:\Users\alnos\Documents\Projets\mediatheque\episodes.html](C:\Users\alnos\Documents\Projets\mediatheque\episodes.html) — aucune classe ; `initSerieDetailPage()` mène à `showSerieDetails()`, puis aux cartes d’épisode.
- [C:\Users\alnos\Documents\Projets\mediatheque\js\utils.js](C:\Users\alnos\Documents\Projets\mediatheque\js\utils.js) — aucune classe ; calcule `window.isWebContainer` à partir de la présence de `window.flutterTest`.

## Parcours d'exécution

### Résumé visuel

| Média / situation | Action créée | Ce qui se passe au clic |
|---|---|---|
| Fichier de film, serveur disponible | Play | Appelle `playFilm(film)` et délègue au MediaServer. |
| Fichier de film, serveur indisponible | Télécharger | Ouvre le formulaire Google prérempli par `requestFilmDownload()`. |
| Film `/Box_` dans WebContainer | Bouton libellé Play dans la zone Télécharger | Appelle `window.flutterTest(film.nomFichier)`. |
| Épisode présent, serveur disponible | Play | Appelle `playEpisode(serie, saison, episode)`. |
| Premier épisode d’une saison | Télécharger | Demande la saison entière via `requestSeasonDownload()`. |
| Épisode absent | Avertissement uniquement | Pas d’action Play ni de demande de téléchargement. |

Les boutons Play et Télécharger des films sont tous deux construits dans le DOM. Le CSS en affiche un selon la classe du `<body>`. Pour un film WebContainer/`/Box_`, la logique du clic sur Télécharger emprunte le pont Flutter.

## Conditions de décision

- [C:\Users\alnos\Documents\Projets\mediatheque\css\style.css](C:\Users\alnos\Documents\Projets\mediatheque\css\style.css) — sans classe de code ; `body.no-mediaserver .mediaserver-only` cache Play et `body:not(.no-mediaserver) .download-only` cache Télécharger.
- [C:\Users\alnos\Documents\Projets\mediatheque\js\film-detail.js](C:\Users\alnos\Documents\Projets\mediatheque\js\film-detail.js) — aucune classe ; `createFilmFileCard(film)` configure l’icône et le titre selon WebContainer et le préfixe `/Box_`.
- [C:\Users\alnos\Documents\Projets\mediatheque\js\episodes.js](C:\Users\alnos\Documents\Projets\mediatheque\js\episodes.js) — aucune classe ; `createEpisodeCard()` distingue épisode présent/manquant et ne crée le bouton saison que pour `episode.numero === 1`.
- [C:\Users\alnos\Documents\Projets\mediatheque\js\utils.js](C:\Users\alnos\Documents\Projets\mediatheque\js\utils.js) — aucune classe ; `isMediaServerAvailable()` fait basculer `mediaserver`/`no-mediaserver`, utilisées par le CSS.

## Fichiers impliqués

| Chemin complet | Classe | Méthode / rôle |
|---|---|---|
| `C:\Users\alnos\Documents\Projets\mediatheque\js\film-detail.js` | Aucune | `initFilmDetailPage()`, `renderFilmFiles()` et `createFilmFileCard()` construisent le choix pour chaque fichier ; `requestFilmDownload()` forme et ouvre la demande. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\episodes.js` | Aucune | `showSerieDetails()` et `createEpisodeCard()` affichent les commandes d’épisode ; `requestSeasonDownload()` crée la demande de saison. |
| `C:\Users\alnos\Documents\Projets\mediatheque\js\utils.js` | Aucune | `isMediaServerAvailable()` détermine l’état qui gouverne les règles CSS ; le code global détermine `window.isWebContainer`. |
| `C:\Users\alnos\Documents\Projets\mediatheque\css\style.css` | Sans objet | Les sélecteurs des classes `mediaserver-only`, `download-only` et `no-mediaserver` décident ce qui est visible. |
| `C:\Users\alnos\Documents\Projets\mediatheque\common\topbar.html` | Sans objet | Contient le bouton d’identité ; il appelle `showUserPrompt()` et permet d’enregistrer le nom nécessaire à une demande de téléchargement. |

## Données d'entrée et de sortie

| Nature | Valeurs |
|---|---|
| Entrées film | Objet `film` (`fichier`, `nomFichier`, titre, langue, taille), état du serveur, `window.isWebContainer`, `localStorage["demandeur"]`. |
| Entrées épisode | Série, saison et épisode (`numero`, `fichier`, `missing`), état du serveur. |
| Sorties | Boutons d’action; lecture via `playFilm()`/`playEpisode()`; appel Flutter en WebContainer/Box; sinon formulaire Google prérempli (demandeur, titre, chemin). |
| Dépendances | Détection décrite dans [01-disponibilite-serveur-local.md](./01-disponibilite-serveur-local.md), lecture dans [05-parcours-lecture-film.md](./05-parcours-lecture-film.md), WebContainer/Flutter si présent, Google Forms. |

## Cas d'erreur

- Sans nom dans `localStorage["demandeur"]`, les méthodes `requestFilmDownload()` et `requestSeasonDownload()` affichent « Identifiez-vous pour télécharger » puis s’arrêtent.
- Pour un épisode absent, le bouton d’avertissement indique « Épisode absent du disque » ; aucun chemin d’action Play ou Télécharger n’est construit.
- Un échec de disponibilité produit l’affichage du bouton de téléchargement par CSS ; la requête Google Forms n’est pas une requête au MediaServer.
- Gestion d’erreur de `window.flutterTest` ou retour de Google Forms : **Non trouvé dans les sources analysées**.

## Comportement de repli

En navigateur sans serveur, les commandes Play sont masquées et l’action Télécharger est visible. Pour un fichier `/Box_` dans WebContainer, le libellé devient Play et le clic appelle le pont Flutter au lieu du formulaire. Pour les épisodes, la demande de téléchargement est portée par le premier épisode de chaque saison seulement.

## Notes importantes

- L’interface étiquette l’action comme téléchargement, mais le code ne télécharge pas le média : il ouvre un formulaire de demande.
- Aucun endpoint de téléchargement média n’est appelé par `requestFilmDownload()` ou `requestSeasonDownload()` : **Non trouvé dans les sources analysées**.
- Les boutons restent créés dans le DOM même quand le CSS les masque.
