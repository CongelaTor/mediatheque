let filmSearchSites = [];
async function initFilmsPage() {
  currentPage = "films";

  initSidebarToggle();
  updateUserGreeting();
  await isMediaServerAvailable();
  await loadCatalog();
  await loadFilmSearchConfig();

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
  currentQuality = state.quality ?? "all";
  window.selectedCollectionId = isCollectionContextActive()
    ? sessionStorage.getItem("selectedCollectionId")
    : null;
  const resumeFilmButton = document.getElementById("resumeFilmButton");
  resumeFilmButton?.classList.toggle(
    "resume-button-list",
    !isCollectionContextActive(),
  );
  if (isCollectionContextActive()) {
    document
      .querySelector('.nav-button[data-page="films"]')
      ?.classList.remove("active");
    document
      .querySelector('.nav-button[data-page="collections"]')
      ?.classList.add("active");
  }
  document
    .getElementById("sideCollectionsRow")
    ?.classList.toggle("hidden", !isCollectionContextActive());
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
    if (film.fichier || film.nomFichier) {
      group.files.push(film);
    }
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
        return (
          (!film.collectionId || !film.collectionNom) && film.fileCount > 0
        );
      }
      return String(film.collectionId) === window.selectedCollectionId;
    })
    .filter((film) => filmMatchesAjouts(film))
    .filter((film) => matchesGenre(film))
    .filter((film) => matchesType(film))
    .filter((film) => matchesStudio(film))
    .filter((film) => matchesQuality(film))
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
        const tmdbBadge = document.createElement("button");
        tmdbBadge.className = "play-button";
        tmdbBadge.style.right = "6px";
        tmdbBadge.style.bottom = "6px";
        tmdbBadge.style.width = "32px";
        tmdbBadge.style.height = "32px";
        tmdbBadge.style.fontSize = "14px";
        tmdbBadge.innerHTML = "🔍";
        tmdbBadge.onclick = (event) => {
          event.stopPropagation();
          window.location.href = `https://www.themoviedb.org/collection/${collection.collectionId}`;
        };
        imageContainer.appendChild(tmdbBadge);
        imageContainer.style.cursor = "pointer";
        imageContainer.onclick = () => {
          window.location.href = `https://www.themoviedb.org/collection/${collection.collectionId}`;
        };
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

  let hasHigh = false;
  let hasMedium = false;
  let hasLow = false;
  let hasFiles = false;
  let hasMissingOriginalTitle = false;

  const filesToCheck =
    film.groupFiles && film.groupFiles.length > 0 ? film.groupFiles : [film];
  for (const file of filesToCheck) {
    if (!file.titreOriginal || file.titreOriginal.trim() === "") {
      hasMissingOriginalTitle = true;
    }
    const width = file.technique?.largeur;
    if (width !== undefined && width !== null) {
      hasFiles = true;

      if (width >= 1920) {
        hasHigh = true;
      } else if (width >= 960) {
        hasMedium = true;
      } else {
        hasLow = true;
      }
    }
  }

  if (!hasFiles) {
    posterZone.classList.add("quality-none");
  } else if (hasMissingOriginalTitle) {
    posterZone.classList.add("no-original-title");
  } else if (hasLow && hasMedium && hasHigh) {
    posterZone.classList.add("quality-full-range");
  } else if (hasLow && hasHigh) {
    posterZone.classList.add("quality-low-high");
  } else if (hasLow && hasMedium) {
    posterZone.classList.add("quality-low-medium");
  } else if (hasMedium && hasHigh) {
    posterZone.classList.add("quality-medium-high");
  } else if (hasLow) {
    posterZone.classList.add("quality-low");
  } else if (hasMedium) {
    posterZone.classList.add("quality-medium");
  } else if (hasHigh) {
    posterZone.classList.add("quality-high");
  } else {
    posterZone.classList.add("quality-none");
  }

  posterZone.onclick = () => {
    if (film.fileCount === 0) {
      showFilmSearchModal(film);
      return;
    }
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
  if (film.fileCount === 0 || film.fileCount > 1) {
    const badge = document.createElement("button");
    badge.className =
      film.fileCount === 0
        ? film.ignoreInCollection
          ? "play-button film-ignore-in-collection"
          : "play-button film-missing-in-collection"
        : film.hasExactDuplicate
          ? "play-button duplicate-badge"
          : "play-button";
    badge.textContent =
      film.fileCount === 0
        ? film.ignoreInCollection
          ? "⊘"
          : ""
        : film.fileCount;
    if (film.fileCount === 0) {
      badge.title = film.ignoreInCollection
        ? "Réintégrer ce film dans le calcul de la collection"
        : "Ignorer ce film dans le calcul de la collection";
      badge.onclick = async (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (!mediaServerAvailable) {
          showToast("MediaServer indisponible");
          return;
        }
        const ignoreInCollection = !Boolean(film.ignoreInCollection);
        try {
          const response = await fetch(
            "http://localhost:9876/set-film-ignore-in-collection",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                tmdbId: film.tmdbId,
                ignoreInCollection,
              }),
            },
          );
          if (!response.ok) {
            throw new Error(await response.text());
          }
          film.ignoreInCollection = ignoreInCollection;
          badge.className = ignoreInCollection
            ? "play-button film-ignore-in-collection"
            : "play-button film-missing-in-collection";
          badge.textContent = ignoreInCollection ? "⊘" : "";
          badge.title = ignoreInCollection
            ? "Réintégrer ce film dans le calcul de la collection"
            : "Ignorer ce film dans le calcul de la collection";
        } catch (error) {
          console.error(error);
          showToast("Impossible d’enregistrer le film ignoré");
        }
      };
    }
    posterZone.appendChild(badge);
  }
  card.appendChild(posterZone);
  return card;
}

async function loadFilmSearchConfig() {
  try {
    const response = await fetch("config/searchConfig.json");
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const config = await response.json();
    filmSearchSites = Array.isArray(config.sites) ? config.sites : [];
  } catch (error) {
    console.error("Erreur de chargement de searchConfig.json :", error);
    filmSearchSites = [];
  }
}
function showFilmSearchModal(film) {
  const frenchTitle = film.titreTmdb || film.titre || "";
  const originalTitle = film.titreOriginal || frenchTitle;
  const year = film.anneeTmdb || film.annee || "";
  const originalTitleButton = document.getElementById(
    "filmSearchOriginalTitle",
  );
  const frenchTitleButton = document.getElementById("filmSearchFrenchTitle");
  const yearButton = document.getElementById("filmSearchYear");
  const buttonsContainer = document.getElementById("filmSearchButtons");
  const sameTitle =
    originalTitle.localeCompare(frenchTitle, "fr", {
      sensitivity: "base",
    }) === 0;
  originalTitleButton.textContent = originalTitle;
  originalTitleButton.dataset.title = originalTitle;
  originalTitleButton.classList.add("active");
  frenchTitleButton.textContent = frenchTitle;
  frenchTitleButton.dataset.title = frenchTitle;
  frenchTitleButton.classList.remove("active");
  frenchTitleButton.style.display = sameTitle ? "none" : "";

  const hasValidYear = year && String(year) !== "2100";
  yearButton.textContent = hasValidYear ? year : "";
  yearButton.dataset.year = hasValidYear ? year : "";
  yearButton.classList.toggle("active", Boolean(hasValidYear));
  yearButton.style.display = hasValidYear ? "" : "none";

  originalTitleButton.onclick = () => {
    originalTitleButton.classList.add("active");
    frenchTitleButton.classList.remove("active");
  };
  frenchTitleButton.onclick = () => {
    frenchTitleButton.classList.add("active");
    originalTitleButton.classList.remove("active");
  };
  yearButton.onclick = () => {
    yearButton.classList.toggle("active");
  };
  renderFilmSearchButtons(buttonsContainer);
  document.getElementById("filmSearchModal").classList.remove("hidden");
}
function renderFilmSearchButtons(container) {
  container.innerHTML = "";
  for (const site of filmSearchSites) {
    const button = document.createElement("button");
    button.className = "tmdb-search-token active";
    button.textContent = site.nom;
    button.onclick = () => {
      const activeTitleButton = document.querySelector(
        "#filmSearchTitleButtons button[data-title].active",
      );
      const yearButton = document.getElementById("filmSearchYear");
      const title = activeTitleButton?.dataset.title || "";
      const year =
        yearButton.classList.contains("active") && yearButton.dataset.year
          ? yearButton.dataset.year
          : "";
      const searchText = `${title} ${year}`.trim();
      const separator = site.separateur || "%20";
      const cleanSearchText = searchText
        .replace(/[-:;,.'"!?/\\()\[\]{}]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      const encodedSearchText = encodeURIComponent(cleanSearchText).replaceAll(
        "%20",
        separator,
      );
      window.open(`${site.url}${encodedSearchText}`, "_blank", "noopener");
    };
    container.appendChild(button);
  }
}
function closeFilmSearchModal() {
  document.getElementById("filmSearchModal").classList.add("hidden");
}
document
  .getElementById("filmSearchModal")
  .addEventListener("click", (event) => {
    if (event.target === event.currentTarget) {
      closeFilmSearchModal();
    }
  });
