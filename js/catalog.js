async function loadCatalog() {
  const response = await fetch("data/catalog.json");
  catalog = await response.json();
}

async function reloadCatalog(type = "all") {
  let hasSubtitleFiles = false;
  if (type === "films" || type === "nouveaux") {
    const checkResponse = await fetch(
      "http://localhost:9876/check-nouveaux-films-files",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({}),
      },
    );
    const checkResult = await checkResponse.json();
    if (checkResult.blockingFiles.length > 0) {
      alert("Pensez à vérifier les fichiers.");
      return;
    }
    hasSubtitleFiles = checkResult.subtitleFiles.length > 0;
  }
  openScanModal();
  document.getElementById("scanTitle").textContent =
    type === "films"
      ? "Scan des films en cours..."
      : type === "nouveaux"
        ? "Scan rapide des nouveaux en cours..."
        : type === "series"
          ? "Scan des séries en cours..."
          : "Scan des disques en cours...";
  await new Promise((resolve) => setTimeout(resolve, 500));
  const scanLog = document.getElementById("scanLog");
  scanLog.textContent = hasSubtitleFiles
    ? "Attention : pensez à vérifier les sous-titres.\n\n"
    : "";
  const response = await fetch("http://localhost:9876/refresh-catalog", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type,
    }),
  });
  if (!response.ok) {
    const log = await response.text();
    alert(log);
    console.error(log);
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  while (true) {
    const { value, done } = await reader.read();
    if (done) {
      break;
    }
    scanLog.textContent += decoder.decode(value, {
      stream: true,
    });
    scanLog.scrollTop = scanLog.scrollHeight;
  }
  scanLog.textContent += decoder.decode();
  document.getElementById("scanTitle").textContent =
    type === "films"
      ? "Scan des films terminé"
      : type === "nouveaux"
        ? "Scan rapide des nouveaux terminé"
        : type === "series"
          ? "Scan des séries terminé"
          : "Scan des disques terminé";
  await loadCatalog();
  updateStats();
  if (currentPage === "films" && typeof renderFilms === "function") {
    renderFilms();
  }
  if (currentPage === "series" && typeof renderSeries === "function") {
    renderSeries();
  }
  if (
    currentPage === "episodes" &&
    currentSerie &&
    typeof showSerieDetails === "function"
  ) {
    showSerieDetails(currentSerie, currentSeason);
  }
}

function isFilmNouveau(film) {
  const files = film.groupFiles?.length ? film.groupFiles : [film];
  return files.some((file) =>
    /^\/[^/]+_Films\/- Nouveaux\//i.test(file.fichier || ""),
  );
}
function isFilmNouveaute(film) {
  return !film.titreTmdb || isFilmNouveau(film);
}

function updateStats() {
  if (!catalog) {
    return;
  }

  const collections = new Map();
  for (const film of catalog.films) {
    if (!film.collectionId || !film.collectionNom) {
      continue;
    }
    if (!collections.has(film.collectionId)) {
      collections.set(film.collectionId, []);
    }
    collections.get(film.collectionId).push(film);
  }

  const collectionList = [...collections.values()].filter((films) => {
    const uniqueFilms = new Set();

    for (const film of films) {
      const key = film.tmdbId
        ? `tmdb:${film.tmdbId}`
        : `title:${film.titre}|${film.annee || ""}`;

      uniqueFilms.add(key);
    }

    return uniqueFilms.size >= 1;
  });

  const collectionsCount = collectionList.length;
  const collectionFiles = catalog.films.filter(
    (film) => film.collectionId && film.fichier,
  );

  const collectionFilms = new Set();
  for (const film of collectionFiles) {
    const key = film.tmdbId
      ? `tmdb:${film.tmdbId}`
      : `title:${film.titre}|${film.annee || ""}`;
    collectionFilms.add(key);
  }
  const collectionFilmsCount = collectionFilms.size;
  const collectionsSize = collectionFiles.reduce(
    (total, film) => total + (Number(film.taille) || 0),
    0,
  );

  const groupedFilms = new Set();
  const filmsOutsideCollections = catalog.films.filter(
    (film) => (!film.collectionId || !film.collectionNom) && film.fichier,
  );
  for (const film of filmsOutsideCollections) {
    const groupKey = film.tmdbId
      ? `tmdb:${film.tmdbId}`
      : `title:${film.titre}|${film.annee || ""}`;
    groupedFilms.add(groupKey);
  }
  const filmsCount = groupedFilms.size;
  const filmsSize = filmsOutsideCollections.reduce(
    (total, film) => total + (Number(film.taille) || 0),
    0,
  );

  const nouveautes = catalog.films.filter(isFilmNouveaute);
  const nouveautesFilms = new Set();
  for (const film of nouveautes) {
    const key = film.tmdbId
      ? `tmdb:${film.tmdbId}`
      : `title:${film.titre}|${film.annee || ""}`;
    nouveautesFilms.add(key);
  }
  const nouveautesCount = nouveautesFilms.size;
  const nouveauxCount = catalog.films.filter(isFilmNouveau).length;
  const seriesCount = catalog.series.length;
  const episodesCount = countEpisodes();

  let seriesSize = 0;
  for (const serie of catalog.series) {
    for (const saison of serie.saisons) {
      for (const episode of saison.episodes) {
        seriesSize += Number(episode.taille) || 0;
      }
    }
  }
  setText(
    "homeFilmsStats",
    `${filmsCount} films • ${formatMediaSize(filmsSize)}`,
  );
  setText(
    "homeCollectionsStats",
    `${collectionsCount} collections • ${collectionFilmsCount} films • ${formatMediaSize(collectionsSize)}`,
  );
  setText("sideCollections", collectionsCount);
  setText("statFilms", filmsCount);
  setText("statNouveautes", `${nouveautesCount} nouveautés`);
  const statNouveautesEl = document.getElementById("statNouveautes");
  if (statNouveautesEl) {
    const statRow = statNouveautesEl.closest(".sidebar-stat");
    if (statRow) {
      statRow.style.display = nouveautesCount > 0 ? "" : "none";
    }
  }
  setText("statSeries", seriesCount);
  setText("statEpisodes", episodesCount);
  setText("sideFilms", filmsCount);
  const sideNouveautesTextEl = document.getElementById("sideNouveautes");
  if (sideNouveautesTextEl) {
    setText("sideNouveautes", nouveautesCount);
    sideNouveautesTextEl.nextSibling.textContent =
      nouveautesCount > 1 ? " Nouveautés" : " Nouveauté";
  }
  const sideNouveauxTextEl = document.getElementById("sideNouveaux");
  if (sideNouveauxTextEl) {
    setText("sideNouveaux", nouveauxCount);
    sideNouveauxTextEl.nextSibling.textContent =
      nouveauxCount > 1 ? " Nouveaux" : " Nouveau";
  }
  setText("sideSeries", seriesCount);
  setText("sideEpisodes", episodesCount);

  // --- Rendre la ligne des collections/films cliquable pour réinitialiser le filtre à "all" ---
  // --- Rendre la ligne des films/collections cliquable pour réinitialiser le filtre à "all" selon l'écran ---
  const sideFilmsEl = document.getElementById("sideFilms");
  if (sideFilmsEl) {
    const statRow = sideFilmsEl.closest(".sidebar-stat");
    if (statRow) {
      const isCollectionsScreen = currentPage === "collections";

      statRow.style.cursor = "pointer";
      statRow.title = isCollectionsScreen
        ? "Afficher toutes les collections"
        : "Afficher tous les films";

      statRow.onclick = () => {
        // Utiliser selectAjouts("all") pour synchroniser l'UI, le stockage et le rendu de l'écran actif
        if (typeof selectAjouts === "function") {
          selectAjouts("all");
        } else {
          currentAjouts = "all";
          if (typeof updateSidebarTitle === "function") {
            updateSidebarTitle("ajoutsTitle", "SELECTION", "all");
          }
          if (typeof saveSidebarFiltersState === "function") {
            saveSidebarFiltersState({ ajouts: currentAjouts });
          }
          if (isCollectionsScreen && typeof renderCollections === "function") {
            renderCollections();
          } else if (
            currentPage === "films" &&
            typeof renderFilms === "function"
          ) {
            renderFilms();
          }
        }
      };
    }
  }
  // Rendre la ligne des nouveautés cliquable si count > 0 et masquer si contexte collection
  const sideNouveautesEl = document.getElementById("sideNouveautes");
  if (sideNouveautesEl) {
    const statRow = sideNouveautesEl.closest(".sidebar-stat");
    if (statRow) {
      statRow.style.display = nouveautesCount > 0 ? "" : "none";
      if (nouveautesCount > 0) {
        statRow.style.cursor = "pointer";
        statRow.title =
          currentPage === "collections"
            ? "Afficher les nouveautés dans Films"
            : "Filtrer par Nouveautés";
        statRow.onclick = () => {
          if (currentPage === "collections") {
            openFilmsNouveautes();
            return;
          }
          const nouveautesButton =
            document.querySelector('.sidebar-link[data-ajouts="Nouveautés"]') ||
            [
              ...document.querySelectorAll(
                ".sidebar-link, .filter-button, [data-ajouts]",
              ),
            ].find((el) => el.textContent.includes("Nouveautés"));
          if (nouveautesButton) {
            nouveautesButton.click();
          } else if (typeof currentAjouts !== "undefined") {
            currentAjouts = "Nouveautés";
            if (typeof updateSidebarTitle === "function") {
              updateSidebarTitle("ajoutsTitle", "SELECTION", currentAjouts);
            }
            if (typeof saveSidebarFiltersState === "function") {
              saveSidebarFiltersState({ ajouts: currentAjouts });
            }
            if (currentPage === "films" && typeof renderFilms === "function") {
              renderFilms();
            }
          }
        };
      } else {
        statRow.style.cursor = "default";
        statRow.title = "";
        statRow.onclick = null;
      }
    }
  }
  const sideErreursEl = document.getElementById("sideErreurs");
  if (sideErreursEl) {
    const statRow = sideErreursEl.closest(".sidebar-stat");
    if (statRow) {
      statRow.style.cursor = "pointer";
      statRow.title = "Filtrer par À corriger";
      statRow.onclick = () => {
        const erreursButton = document.querySelector(
          '.sidebar-link[data-ajouts="À corriger"]',
        );
        if (erreursButton) {
          erreursButton.click();
        }
      };
    }
  }
  setText(
    "homeSeriesStats",
    `${seriesCount} séries • ${episodesCount} épisodes • ${formatMediaSize(seriesSize)}`,
  );

  setText(
    "homeLibrarySize",
    `Accédez à ${formatMediaSize(collectionsSize + filmsSize + seriesSize)} de medias.`,
  );
  updateStorageStats();
}

function updateStorageStats() {
  const containers = document.querySelectorAll(
    "#homeStorageStats, #sidebarStorageStats",
  );
  if (!containers.length || !catalog.stockage) {
    return;
  }
  for (const container of containers) {
    container.innerHTML = "";
    for (const stockage of catalog.stockage) {
      const gigaBytes = stockage.espaceLibre / (1024 * 1024 * 1024);
      const level =
        gigaBytes >= 150 ? "green" : gigaBytes >= 40 ? "orange" : "red";
      const item = document.createElement("span");
      item.className = `storage-item storage-${level}`;
      item.innerHTML = `${stockage.lecteur}: ${formatMediaSize(stockage.espaceLibre)}`;
      container.appendChild(item);
    }
  }
}
function formatMediaSize(size) {
  const megaBytes = size / (1024 * 1024);
  const gigaBytes = size / (1024 * 1024 * 1024);
  const teraBytes = size / (1024 * 1024 * 1024 * 1024);
  if (teraBytes >= 1) {
    return `${teraBytes.toFixed(2).replace(".", ",")} To`;
  }
  if (gigaBytes >= 1) {
    return `${Math.round(gigaBytes)} Go`;
  }
  return `${Math.round(megaBytes)} Mo`;
}

function countEpisodes() {
  let count = 0;
  for (const serie of catalog.series) {
    for (const saison of serie.saisons) {
      count += saison.episodes.length;
    }
  }
  return count;
}
function openScanModal() {
  const modal = document.getElementById("scanModal");
  const header = modal.querySelector(".tmdb-modal-header");
  if (!header.querySelector(".tmdb-modal-close")) {
    const closeButton = document.createElement("button");
    closeButton.className = "tmdb-modal-close";
    closeButton.textContent = "×";
    closeButton.onclick = closeScanModal;
    header.appendChild(closeButton);
  }
  const oldCloseButton = [...modal.querySelectorAll("button")].find(
    (button) => button.textContent.trim() === "Fermer",
  );
  if (oldCloseButton) {
    oldCloseButton.style.display = "none";
  }
  modal.onclick = (event) => {
    if (event.target === modal) {
      closeScanModal();
    }
  };
  modal.classList.remove("hidden");
}
function closeScanModal() {
  document.getElementById("scanModal").classList.add("hidden");
}

function showDetectionPopup() {
  const results = [];
  const filmsX = catalog.films.filter((film) =>
    film.fichier?.startsWith("Z:/01_Films/"),
  );

  for (const filmX of filmsX) {
    const matches = catalog.films.filter(
      (film) =>
        film !== filmX &&
        film.taille === filmX.taille &&
        film.fichier?.startsWith("Y:/02_Films/"),
    );
    if (matches.length > 0) {
      results.push(filmX);
      for (const match of matches) {
        results.push(match);
      }
    }
  }
  results.sort((a, b) => {
    const isAZ = a.fichier.startsWith("Z:/01_Films/");
    const isBZ = b.fichier.startsWith("Z:/01_Films/");

    if (isAZ && isBZ) {
      const folderA = a.fichier.substring(0, a.fichier.lastIndexOf("/"));

      const folderB = b.fichier.substring(0, b.fichier.lastIndexOf("/"));

      const folderCompare = folderA.localeCompare(folderB, "fr");

      if (folderCompare !== 0) {
        return folderCompare;
      }
    }

    if (a.taille !== b.taille) {
      return a.taille - b.taille;
    }

    const driveOrder = {
      Z: 0,
      Y: 1,
    };

    return driveOrder[a.fichier[0]] - driveOrder[b.fichier[0]];
  });
  let text = "";
  let previousSize = null;
  for (const film of results) {
    const sizeKo = Math.round((film.taille || 0) / 1024);
    if (previousSize !== null && previousSize !== film.taille) {
      text += "\n";
    }
    text += `${sizeKo} | ${film.fichier}\n`;
    previousSize = film.taille;
  }
  document.getElementById("scanTitle").textContent = "Détection X";
  document.getElementById("scanLog").textContent = text || "Aucun résultat";

  openScanModal();
}
