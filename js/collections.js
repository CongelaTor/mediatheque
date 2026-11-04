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

  updateSidebarTitle("ajoutsTitle", "AJOUTS", currentAjouts);
  updateSidebarTitle("genreTitle", "GENRE", currentGenre);
  updateSidebarTitle("typeTitle", "TYPE", currentType);
  updateSidebarTitle("studioTitle", "STUDIO", currentStudio);

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
      collections.set(film.collectionId, {
        id: film.collectionId,
        nom: film.collectionNom,
        image: film.collectionImage || null,
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
  let collectionsToCompleteCount = 0;
  for (const collection of collections.values()) {
    const uniqueFilms = new Set();
    for (const film of collection.films) {
      const key = film.tmdbId
        ? `tmdb:${film.tmdbId}`
        : `title:${film.titre}|${film.annee || ""}`;
      uniqueFilms.add(key);
    }
    const collectionFilmCount = collection.films.find((film) =>
      Number.isFinite(Number(film.collectionFilmCount)),
    )?.collectionFilmCount;
    if (
      Number.isFinite(Number(collectionFilmCount)) &&
      uniqueFilms.size < Number(collectionFilmCount)
    ) {
      collectionsToCompleteCount++;
    }
  }
  const toCompleteButton = document.querySelector(
    '.sidebar-link[data-ajouts="À compléter"]',
  );
  if (toCompleteButton) {
    toCompleteButton.textContent =
      collectionsToCompleteCount === 0
        ? "Aucune à compléter"
        : `${collectionsToCompleteCount} à compléter`;
  }

  const collectionList = [...collections.values()]
    .filter((collection) => matchesSearch(collection.nom))
    .filter((collection) => {
      const uniqueFilms = new Set();
      for (const film of collection.films) {
        const key = film.tmdbId
          ? `tmdb:${film.tmdbId}`
          : `title:${film.titre}|${film.annee || ""}`;
        uniqueFilms.add(key);
      }
      if (currentAjouts === "À compléter") {
        const collectionFilmCount = collection.films.find((film) =>
          Number.isFinite(Number(film.collectionFilmCount)),
        )?.collectionFilmCount;
        return (
          Number.isFinite(Number(collectionFilmCount)) &&
          uniqueFilms.size < Number(collectionFilmCount)
        );
      }
      return uniqueFilms.size >= 1;
    })
    .filter((collection) => {
      const firstFilm = [...collection.films].sort(
        (a, b) =>
          Number(a.anneeTmdb || a.annee || 9999) -
          Number(b.anneeTmdb || b.annee || 9999),
      )[0];

      console.log(
        collection.nom,
        firstFilm?.titreTmdb || firstFilm?.titre,
        matchesGenre(firstFilm),
        matchesType(firstFilm),
        matchesStudio(firstFilm),
      );

      return (
        matchesGenre(firstFilm) &&
        matchesType(firstFilm) &&
        matchesStudio(firstFilm)
      );
    })
    .sort((a, b) => a.nom.localeCompare(b.nom, "fr"));

  setText("sideCollections", collectionList.length);
  const groupedFilms = new Set();
  for (const film of catalog.films) {
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
    const collectionFilmCount = collection.films.find((film) =>
      Number.isFinite(Number(film.collectionFilmCount)),
    )?.collectionFilmCount;
    const badge = document.createElement("button");
    badge.className = "play-button";
    if (
      currentAjouts === "À compléter" &&
      Number.isFinite(Number(collectionFilmCount)) &&
      uniqueFilms.size < Number(collectionFilmCount)
    ) {
      badge.classList.add("collection-incomplete");
    }
    badge.textContent =
      currentAjouts === "À compléter"
        ? Number(collectionFilmCount) - uniqueFilms.size
        : uniqueFilms.size;
    posterZone.appendChild(badge);
    card.appendChild(posterZone);
    grid.appendChild(card);
  }
}
async function migrateCollections() {
  const button = document.getElementById("migrateCollectionsButton");
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
  button.textContent = `Mise à jour 0/${collectionIds.length}`;
  try {
    const collections = [];
    for (let index = 0; index < collectionIds.length; index += 1) {
      const collectionId = collectionIds[index];
      button.textContent = `Mise à jour ${index + 1}/${collectionIds.length}`;
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
    alert(`${result.updatedCollections} collections mises à jour.`);
    button.textContent = "Migration terminée";
  } catch (error) {
    console.error(error);
    alert(`Échec de la migration : ${error.message}`);
    button.disabled = false;
    button.textContent = "Mettre à jour les collections";
  }
}
