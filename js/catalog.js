async function loadCatalog() {
  const response = await fetch("data/catalog.json");
  catalog = await response.json();
}

async function reloadCatalog(type = "all") {
  openScanModal();
  document.getElementById("scanTitle").textContent =
    type === "films"
      ? "Scan des films en cours..."
      : type === "series"
        ? "Scan des séries en cours..."
        : "Scan des disques en cours...";

  await new Promise((resolve) => setTimeout(resolve, 500));

  document.getElementById("scanLog").textContent = "";
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
    console.error(await response.text());
    return;
  }
  const log = await response.text();

  document.getElementById("scanTitle").textContent =
    type === "films"
      ? "Scan des films terminé"
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
  document.getElementById("scanLog").textContent = log;
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
  const collectionFilesCount = collectionFiles.length;
  const collectionsSize = collectionFiles.reduce(
    (total, film) => total + (Number(film.taille) || 0),
    0,
  );
  const groupedFilms = new Set();
  for (const film of catalog.films) {
    const groupKey = film.tmdbId
      ? `tmdb:${film.tmdbId}`
      : `title:${film.titre}|${film.annee || ""}`;
    groupedFilms.add(groupKey);
  }
  const filmsCount = groupedFilms.size;
  const filmsSize = catalog.films.reduce(
    (total, film) => total + (Number(film.taille) || 0),
    0,
  );

  const nouveautesCount = catalog.films.filter((film) => !film.tmdbId).length;
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
    `${collectionsCount} collections • ${collectionFilesCount} fichiers • ${formatMediaSize(collectionsSize)}`,
  );
  setText("sideCollections", collectionsCount);
  setText("statFilms", filmsCount);
  setText("statNouveautes", nouveautesCount);
  setText("statSeries", seriesCount);
  setText("statEpisodes", episodesCount);
  setText("sideFilms", filmsCount);
  setText("sideNouveautes", nouveautesCount);
  setText("sideSeries", seriesCount);
  setText("sideEpisodes", episodesCount);
  setText(
    "homeSeriesStats",
    `${seriesCount} séries • ${episodesCount} épisodes • ${formatMediaSize(seriesSize)}`,
  );

  setText(
    "homeLibrarySize",
    `Accédez à ${formatMediaSize(filmsSize + seriesSize)} de medias.`,
  );
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
  document.getElementById("scanModal").classList.remove("hidden");
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
