async function initFilmsPage() {
  currentPage = "films";

  initSidebarToggle();
  updateUserGreeting();
  await isMediaServerAvailable();
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
  currentGenre = state.genre ?? "all";
  currentType = state.type ?? "all";
  currentStudio = state.studio ?? "all";
  window.selectedCollectionId = isCollectionContextActive()
    ? sessionStorage.getItem("selectedCollectionId")
    : null;
  if (isCollectionContextActive()) {
    document
      .querySelector('.nav-button[data-page="films"]')
      ?.classList.remove("active");
    document
      .querySelector('.nav-button[data-page="collections"]')
      ?.classList.add("active");
  }
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
  // BACK BUTTON
  //------------------------------
  const backToCollectionsButton = document.getElementById(
    "backToCollectionsButton",
  );
  const searchInput = document.getElementById("searchInput");

  if (window.selectedCollectionId && backToCollectionsButton) {
    backToCollectionsButton.classList.remove("hidden");
    searchInput.classList.add("hidden");

    backToCollectionsButton.onclick = () => {
      window.location.href = "collections.html";
    };
  }

  //------------------------------
  // RENDER SCREEN
  //------------------------------
  renderFilms();
}

function renderFilms() {
  currentPage = "films";
  const grid = document.getElementById("filmsGrid");
  grid.innerHTML = "";
  const groupedFilms = new Map();
  for (const film of catalog.films) {
    const groupKey = film.tmdbId
      ? `tmdb:${film.tmdbId}`
      : `title:${film.titre}|${film.annee || ""}`;
    if (!groupedFilms.has(groupKey)) {
      groupedFilms.set(groupKey, {
        film,
        files: [],
        hasExactDuplicate: false,
      });
    }
    const group = groupedFilms.get(groupKey);
    group.files.push(film);
    if (film.doublonExact) {
      group.hasExactDuplicate = true;
    }
  }
  let films = [...groupedFilms.values()]
    .map((group) => {
      group.film.fileCount = group.files.length;
      group.film.groupFiles = group.files;
      group.film.hasExactDuplicate = group.hasExactDuplicate;
      return group.film;
    })
    .filter((film) => {
      if (!window.selectedCollectionId) {
        return !film.collectionId || !film.collectionNom;
      }
      return String(film.collectionId) === window.selectedCollectionId;
    })
    .filter((film) => filmMatchesAjouts(film))
    .filter((film) => matchesGenre(film))
    .filter((film) => matchesType(film))
    .filter((film) => matchesStudio(film))
    .filter((film) => filmMatchesLanguage(film))
    .filter((film) =>
      matchesSearch(film.titreTmdb ? film.titreTmdb : film.titre),
    );
  if (currentAjouts === "Récents") {
    films = films.sort(
      (a, b) =>
        new Date(b.dateAjout).getTime() - new Date(a.dateAjout).getTime(),
    );
  } else if (window.selectedCollectionId) {
    films = films.sort((a, b) => {
      const anneeA = a.anneeTmdb || a.annee || 0;
      const anneeB = b.anneeTmdb || b.annee || 0;
      if (anneeA !== anneeB) {
        return anneeA - anneeB;
      }
      const titreA = a.titreTmdb || a.titre;
      const titreB = b.titreTmdb || b.titre;
      return titreA.localeCompare(titreB, "fr");
    });
  } else {
    films = films.sort((a, b) =>
      (a.titreTmdb || a.titre).localeCompare(b.titreTmdb || b.titre, "fr"),
    );
  }
  const collectionName = isCollectionContextActive()
    ? sessionStorage.getItem("selectedCollectionName")
    : null;
  if (collectionName) {
    setText("filmsCount", `${collectionName.replace(/\s*-\s*saga$/i, "")}`);
    setText(
      "filmsSubtitle",
      `${films.length} film${films.length > 1 ? "s" : ""}`,
    );
    const collection = (catalog.collections || []).find(
      (item) => String(item.collectionId) === window.selectedCollectionId,
    );
    const collectionInfoCard = document.getElementById("collectionInfoCard");
    if (collection && collectionInfoCard) {
      const imageContainer =
        collectionInfoCard.querySelector(".serie-info-image");
      imageContainer.innerHTML = "";
      if (collection.collectionImage) {
        imageContainer.appendChild(
          createPosterContent(
            `https://image.tmdb.org/t/p/w500${collection.collectionImage}`,
            collection.collectionNom,
            collection.collectionId,
          ),
        );
      }
      setText(
        "collectionInfoDescription",
        collection.collectionDescription || "",
      );
      collectionInfoCard.classList.remove("hidden");
    }
  } else {
    setText("filmsCount", `${films.length} film${films.length > 1 ? "s" : ""}`);
    setText("filmsSubtitle", "Hors collections");
  }
  for (const film of films) {
    grid.appendChild(createFilmCard(film));
  }
  updateResumeButtons();
}

function filmMatchesAjouts(film) {
  if (currentAjouts === "all") {
    return true;
  }
  if (currentAjouts === "Nouveautés") {
    if (!film.titreTmdb) {
      return true;
    }
  }
  if (currentAjouts === "Récents") {
    return true;
  }
  if (currentAjouts === "Doublons") {
    return Boolean(film.hasExactDuplicate);
  }
  return false;
}

function filmMatchesLanguage(film) {
  const selectedLanguages = getSelectedLanguages();
  if (selectedLanguages.length === 0) {
    return true;
  }
  const filmLanguages = Array.isArray(film.langue)
    ? film.langue
    : [film.langue];
  return filmLanguages.some((lang) => selectedLanguages.includes(lang));
}

function createFilmCard(film) {
  const card = document.createElement("article");
  card.className = "media-card";

  const posterZone = document.createElement("div");
  posterZone.className = "poster-zone";
  posterZone.onclick = () => {
    if (film.titreTmdb) {
      window.location.href = `film-detail.html?tmdbId=${film.tmdbId}`;
      return;
    }
    if (!mediaServerAvailable) {
      showToast("Film à venir");
      return;
    }
    showTmdbFilmSearch(film);
  };
  posterZone.appendChild(createPosterContent(film.image, film.titre, film.id));

  if (film.fileCount > 1) {
    const badge = document.createElement("button");
    badge.className = film.hasExactDuplicate
      ? "play-button duplicate-badge"
      : "play-button";
    badge.textContent = film.fileCount;
    posterZone.appendChild(badge);
  }

  card.appendChild(posterZone);
  return card;
}
