let currentCollectionFilter = "all";

async function initCollectionsPage() {
  currentPage = "collections";
  setActiveCollectionContext();
  initSidebarToggle();
  updateUserGreeting();

  await loadCatalog();

  initFiltersSidebar();
  initLanguageFilters();

  updateStats();
  initResumeButtons();
  updateResumeButtons();

  //------------------------------
  // SET MAIN SEARCH
  //------------------------------
  document.getElementById("searchInput").value = loadSearchText();
  currentSearch = loadSearchText();

  //------------------------------
  // SET SIDE FILTERS
  //------------------------------
  const state = loadSidebarFiltersState();
  currentAjouts = state.ajouts ?? "all";
  currentGenre = state.genre ?? "all";
  currentType = state.type ?? "all";
  currentStudio = state.studio ?? "all";
  currentQuality = state.quality ?? "all";

  updateSidebarTitle("ajoutsTitle", "SELECTION", currentAjouts);
  updateSidebarTitle("genreTitle", "GENRE", currentGenre);
  updateSidebarTitle("typeTitle", "TYPE", currentType);
  updateSidebarTitle("studioTitle", "STUDIO", currentStudio);
  updateSidebarTitle("qualityTitle", "QUALITÉ", currentQuality);

  //------------------------------
  // SET LANGUAGE FILTERS
  //------------------------------
  if (state.languages) {
    document.querySelectorAll(".language-button").forEach((button) => {
      button.classList.toggle(
        "active",
        state.languages.includes(button.dataset.language),
      );
    });
  }

  //------------------------------
  // RENDER SCREEN
  //------------------------------
  renderCollections();
}

window.addEventListener("pageshow", async (event) => {
  if (!event.persisted) {
    return;
  }
  await loadCatalog();
  updateStats();
  renderCollections();
});

function getCollectionLatestDate(collection) {
  let latestTime = 0;
  for (const collectionFilm of collection.films) {
    const realFiles = catalog.films.filter(
      (f) => Number(f.tmdbId) === Number(collectionFilm.tmdbId) && f.dateAjout,
    );
    for (const file of realFiles) {
      const fileTime = new Date(file.dateAjout).getTime();
      if (!isNaN(fileTime) && fileTime > latestTime) {
        latestTime = fileTime;
      }
    }
  }
  return latestTime;
}

function renderCollections() {
  const grid = document.getElementById("collectionsGrid");

  if (!grid) {
    return;
  }

  grid.innerHTML = "";

  const collections = new Map();
  for (const film of catalog.films) {
    if (!film.collectionId || !film.collectionNom) {
      continue;
    }
    if (!collections.has(film.collectionId)) {
      const catalogCollection = (catalog.collections || []).find(
        (collection) =>
          String(collection.collectionId) === String(film.collectionId),
      );
      const collectionImage = catalogCollection?.collectionImage
        ? catalogCollection.collectionImage.startsWith("http")
          ? catalogCollection.collectionImage
          : `https://image.tmdb.org/t/p/w500${catalogCollection.collectionImage}`
        : film.collectionImage || null;
      collections.set(film.collectionId, {
        id: film.collectionId,
        nom: catalogCollection?.collectionNom || film.collectionNom,
        image: collectionImage,
        films: [],
      });
    }
    collections.get(film.collectionId).films.push(film);
  }

  for (const collection of collections.values()) {
    if (!collection.image) {
      const firstFilm = [...collection.films].sort(
        (a, b) =>
          Number(a.anneeTmdb || a.annee || 9999) -
          Number(b.anneeTmdb || b.annee || 9999),
      )[0];

      collection.image = firstFilm?.image || null;
    }
  }
  console.log("collections.size =", collections.size);

  const currentYear = new Date().getFullYear();
  const toCompleteButton = document.querySelector(
    '.sidebar-link[data-ajouts="À compléter"]',
  );
  if (toCompleteButton) {
    toCompleteButton.textContent = "À compléter";
  }

  const collectionList = [...collections.values()]
    .filter((collection) => matchesSearch(collection.nom))
    .filter((collection) => {
      const uniqueFilms = new Set();
      const eligibleFilms = new Set();
      const ownedFilms = new Set();
      for (const film of collection.films) {
        const key = film.tmdbId
          ? `tmdb:${film.tmdbId}`
          : `title:${film.titre}|${film.annee || ""}`;
        const isFutureFilm =
          film.anneeTmdb !== null &&
          film.anneeTmdb !== undefined &&
          Number(film.anneeTmdb) >= currentYear;
        uniqueFilms.add(key);
        if (!isFutureFilm && !film.ignoreInCollection) {
          eligibleFilms.add(key);
        }
        if (film.nomFichier) {
          ownedFilms.add(key);
        }
      }
      if (currentAjouts === "À compléter") {
        return [...eligibleFilms].some((key) => !ownedFilms.has(key));
      }
      return uniqueFilms.size >= 1;
    })
    .filter((collection) => {
      const firstFilm = [...collection.films].sort(
        (a, b) =>
          Number(a.anneeTmdb || a.annee || 9999) -
          Number(b.anneeTmdb || b.annee || 9999),
      )[0];
      return (
        matchesGenre(firstFilm) &&
        matchesType(firstFilm) &&
        matchesStudio(firstFilm) &&
        matchesQuality(firstFilm)
      );
    })
    .sort((a, b) => {
      if (currentAjouts === "Récents") {
        const timeA = getCollectionLatestDate(a);
        const timeB = getCollectionLatestDate(b);
        if (timeA !== timeB) {
          return timeB - timeA; // Tri décroissant (le plus récent en premier)
        }
      }
      return a.nom.localeCompare(b.nom, "fr");
    });

  setText("sideCollections", collections.size);
  const groupedFilms = new Set();
  for (const film of catalog.films) {
    if (!film.collectionId || !film.collectionNom || !film.fichier) {
      continue;
    }
    const key = film.tmdbId
      ? `tmdb:${film.tmdbId}`
      : `title:${film.titre}|${film.annee || ""}`;
    groupedFilms.add(key);
  }
  setText("sideFilms", groupedFilms.size);
  const uniqueFilms = new Set();
  for (const collection of collectionList) {
    for (const film of collection.films) {
      const key = film.tmdbId
        ? `tmdb:${film.tmdbId}`
        : `title:${film.titre}|${film.annee || ""}`;

      uniqueFilms.add(key);
    }
  }
  setText(
    "collectionsCount",
    `${collectionList.length} collection${collectionList.length > 1 ? "s" : ""}`,
  );
  setText("collectionsFilmsCount", `${uniqueFilms.size} films`);

  for (const collection of collectionList) {
    const card = document.createElement("article");
    card.className = "media-card";

    let collectionName = collection.nom;
    if (collectionName) {
      collectionName = `${collectionName.replace(/\s*-\s*saga$/i, "")}`;
    }

    const posterZone = document.createElement("div");
    posterZone.className = "poster-zone";
    const collectionFiles = [];
    for (const collectionFilm of collection.films) {
      const realFiles = catalog.films.filter(
        (f) => f.tmdbId === collectionFilm.tmdbId && f.fichier,
      );
      collectionFiles.push(...realFiles);
    }

    posterZone.classList.add(...getFilmBorderClasses(collectionFiles));

    posterZone.appendChild(
      createPosterContent(collection.image, collectionName, collection.id),
    );
    posterZone.onclick = () => {
      sessionStorage.setItem("collectionsSearch", currentSearch);
      sessionStorage.setItem("selectedCollectionId", collection.id);
      sessionStorage.setItem("selectedCollectionName", collection.nom);
      sessionStorage.setItem("collectionMode", "true");
      setActiveCollectionContext();
      window.location.href = "films.html";
    };

    const uniqueFilms = new Set();
    for (const film of collection.films) {
      const key = film.tmdbId
        ? `tmdb:${film.tmdbId}`
        : `title:${film.titre}|${film.annee || ""}`;
      uniqueFilms.add(key);
    }
    const eligibleFilms = new Set();
    const ownedFilms = new Set();
    for (const film of collection.films) {
      const key = film.tmdbId
        ? `tmdb:${film.tmdbId}`
        : `title:${film.titre}|${film.annee || ""}`;
      const isFutureFilm =
        film.anneeTmdb !== null &&
        film.anneeTmdb !== undefined &&
        Number(film.anneeTmdb) >= currentYear;
      if (!isFutureFilm && !film.ignoreInCollection) {
        eligibleFilms.add(key);
      }
      if (film.nomFichier) {
        ownedFilms.add(key);
      }
    }
    const missingFilmsCount = [...eligibleFilms].filter(
      (key) => !ownedFilms.has(key),
    ).length;
    const badge = document.createElement("button");
    badge.className = "play-button";
    if (currentAjouts === "À compléter" && missingFilmsCount > 0) {
      badge.classList.add("collection-incomplete");
    }
    badge.textContent =
      currentAjouts === "À compléter" ? missingFilmsCount : uniqueFilms.size;
    posterZone.appendChild(badge);
    card.appendChild(posterZone);
    grid.appendChild(card);
  }
}

async function scanCollectionsTmdb() {
  const button = document.getElementById("topbarScanButton");
  const buttonText = document.getElementById("topbarScanText");
  const collectionIds = [
    ...new Set(
      catalog.films
        .map((film) => film.collectionId)
        .filter((collectionId) => collectionId),
    ),
  ];
  if (collectionIds.length === 0) {
    alert("Aucune collection à mettre à jour.");
    return;
  }
  button.disabled = true;
  buttonText.textContent = `Scan 0/${collectionIds.length}`;
  try {
    const collections = [];
    for (let index = 0; index < collectionIds.length; index += 1) {
      const collectionId = collectionIds[index];
      buttonText.textContent = `Scan ${index + 1}/${collectionIds.length}`;
      const response = await fetch(
        `https://api.themoviedb.org/3/collection/${collectionId}?api_key=${appConstants.tmdbApiKey}&language=fr-FR`,
      );
      if (!response.ok) {
        throw new Error(`Collection TMDB ${collectionId} inaccessible`);
      }
      const collectionDetails = await response.json();
      collections.push({
        collectionId: collectionId,
        collectionNom: collectionDetails.name || "",
        collectionImage: collectionDetails.poster_path || null,
        collectionDescription: collectionDetails.overview || "",
        collectionFilmCount: collectionDetails.parts?.length || 0,
        films: (collectionDetails.parts || []).map((film) => ({
          tmdbId: film.id,
          tmdbUrl: `https://www.themoviedb.org/movie/${film.id}`,
          titreTmdb: film.title || film.original_title || "",
          titreOriginal: film.original_title || film.title || "",
          anneeTmdb: film.release_date
            ? Number(film.release_date.substring(0, 4))
            : 2100,
          image: film.poster_path
            ? `https://image.tmdb.org/t/p/w342${film.poster_path}`
            : null,
          descriptionTmdb: film.overview || "",
        })),
      });
    }
    const response = await fetch("http://localhost:9876/migrate-collections", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        collections: collections,
      }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const result = await response.json();
    alert(
      `${result.updatedCollections} collections mises à jour.\n${result.addedFilms} films manquants ajoutés.`,
    );
    buttonText.textContent = "Scan terminé";
  } catch (error) {
    console.error(error);
    alert(`Échec du scan : ${error.message}`);
  } finally {
    button.disabled = false;
    buttonText.textContent = "Scan des collections";
  }
}
