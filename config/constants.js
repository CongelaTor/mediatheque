const SIDEBAR_HOVER_OPEN_DELAY_MS = 500;
const SIDEBAR_HOVER_CLOSE_DELAY_MS = 120;

const FILTER_DOUBLONS_NB_FICHIERS = 3;
const FILTER_AJOUTS = {
  collections: ["Récents", "À compléter", "Doublons"],
  films: ["Nouveautés", "Récents", "Doublons", "À déplacer"],
  tools: ["Nouveautés", "Récents", "Doublons", "À corriger", "À déplacer"],
  series: ["Nouveautés", "Récents", "À compléter"],
};
const FILTER_TYPES = ["Animation", "Anime", "Film", "Spectacle"];
const FILTER_GENRES = [
  "Action",
  "Aventure",
  "Biopic",
  "Comédie",
  "Comédie musicale",
  "Drame",
  "Guerre",
  "Policier",
  "Science-Fiction",
  "Sport",
];
const TMDB_IGNORE_GENRES = [
  "Animation",
  "Crime",
  "Documentaire",
  "Familial",
  "Fantastique",
  "Histoire",
  "Musique",
  "Mystère",
  "Romance",
  "Téléfilm",
  "Thriller",
  "Western",
];
const FILTER_STUDIOS = [
  "Disney",
  "Disney Classic",
  "DreamWorks",
  "Marvel",
  "Pixar",
  "Autres",
];
const FILTER_LANGUAGES = ["VO", "VF", "VOST", "VOSTFR", "TBD"];
const FILTER_QUALITIES = ["Haute", "Moyenne", "Basse"];

const TOOLS_FILTER_STATE_KEY = "toolsFilterState";

function loadFilterState(storageKey, defaultState) {
  return JSON.parse(
    sessionStorage.getItem(storageKey) || JSON.stringify(defaultState),
  );
}
function saveFilterState(storageKey, state) {
  sessionStorage.setItem(storageKey, JSON.stringify(state));
}

function loadSidebarState() {
  return loadFilterState("sidebarState", {
    ajoutsExpanded: false,
    storageExpanded: false,
    genreExpanded: false,
    typeExpanded: false,
    studioExpanded: false,
    languageExpanded: false,
    qualityExpanded: false,
  });
}
function saveSidebarState(state) {
  saveFilterState("sidebarState", state);
}

const appConstants = {
  tmdbApiKey: "7f5ccb60f02be23a0abc64fdd5070eba",
  tmdbBaseUrl: "https://www.themoviedb.org",
  tmdbSearchBaseUrl: "https://www.themoviedb.org/search",
};

window.appConstants = appConstants;

if (typeof module !== "undefined" && module.exports) {
  module.exports = appConstants;
}

function renderSidebarFilters(containerId, values, dataAttribute, allLabel) {
  const container = document.getElementById(containerId);
  if (!container) {
    return;
  }
  container.innerHTML =
    `<button class="sidebar-link" data-${dataAttribute}="all">${allLabel}</button>` +
    values
      .map((value) => {
        let qualityClass = "";
        if (dataAttribute === "quality") {
          if (value === "Haute") qualityClass = " film-technical-good";
          if (value === "Moyenne") qualityClass = " film-technical-medium";
          if (value === "Basse") qualityClass = " film-technical-low";
        }
        return `<button class="sidebar-link${qualityClass}" data-${dataAttribute}="${value}">${value}</button>`;
      })
      .join("");
}

function renderAllSidebarFilters(tousValue) {
  renderSidebarFilters(
    "ajoutsFilters",
    FILTER_AJOUTS[currentPage],
    "ajouts",
    tousValue,
  );
  renderSidebarFilters(
    "genreFilters",
    FILTER_GENRES,
    "genre",
    "Tous les genres",
  );
  renderSidebarFilters("typeFilters", FILTER_TYPES, "type", "Tous les types");
  renderSidebarFilters(
    "studioFilters",
    FILTER_STUDIOS,
    "studio",
    "Tous les studios",
  );
  renderSidebarFilters(
    "languageFilters",
    FILTER_LANGUAGES,
    "language",
    "Toutes les langues",
  );
  if (currentPage !== "series") {
    renderSidebarFilters(
      "qualityFilters",
      FILTER_QUALITIES,
      "quality",
      "Toutes les qualités",
    );
  }
}

function updateSidebarTitle(elementId, label, value) {
  const element = document.getElementById(elementId);
  if (!element) {
    return;
  }
  element.textContent = value === "all" ? label : `${label} (${value})`;
  element.classList.toggle(
    "sidebar-title-filtered",
    value !== "all" && elementId !== "qualityTitle",
  );
  if (elementId === "qualityTitle") {
    element.classList.remove(
      "film-technical-good",
      "film-technical-medium",
      "film-technical-low",
    );
    if (value === "Haute") element.classList.add("film-technical-good");
    if (value === "Moyenne") element.classList.add("film-technical-medium");
    if (value === "Basse") element.classList.add("film-technical-low");
  }
}

function setupHoverExpand(titleId, filtersId, expandedKey) {
  const titleEl = document.getElementById(titleId);
  const filtersEl = document.getElementById(filtersId);
  if (!titleEl || !filtersEl) {
    return;
  }

  let openTimer = null;
  let closeTimer = null;

  const cancelOpen = () => {
    if (openTimer) {
      clearTimeout(openTimer);
      openTimer = null;
    }
  };

  const cancelClose = () => {
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer = setTimeout(() => {
      filtersEl.classList.add("hidden");
      const sidebarState = loadSidebarState();
      sidebarState[expandedKey] = false;
      saveSidebarState(sidebarState);
    }, SIDEBAR_HOVER_CLOSE_DELAY_MS);
  };

  titleEl.addEventListener("mouseenter", () => {
    cancelClose();
    if (!filtersEl.classList.contains("hidden")) {
      return;
    }
    cancelOpen();
    openTimer = setTimeout(() => {
      filtersEl.classList.remove("hidden");
      const sidebarState = loadSidebarState();
      sidebarState[expandedKey] = true;
      saveSidebarState(sidebarState);
    }, SIDEBAR_HOVER_OPEN_DELAY_MS);
  });

  titleEl.addEventListener("mouseleave", () => {
    cancelOpen();
    scheduleClose();
  });

  titleEl.addEventListener("click", () => {
    cancelOpen();
    cancelClose();
  });

  filtersEl.addEventListener("mouseenter", () => {
    cancelOpen();
    cancelClose();
  });

  filtersEl.addEventListener("mouseleave", () => {
    scheduleClose();
  });
}

function initFiltersSidebar(ecran) {
  const viewState = loadSidebarFiltersState();

  // Détecte si l'on est dans une collection (soit sur la page collections, soit en contexte collection sur l'écran films)
  const isCollectionContext =
    currentPage === "collections" ||
    (typeof isCollectionContextActive === "function" &&
      isCollectionContextActive());

  switch (currentPage) {
    case "collections":
      validAjouts = ["all", ...FILTER_AJOUTS.collections];
      tousLabel = "Toutes les collections";
      break;
    case "films":
      // Si on est dans une collection active, on retire "Nouveautés" des ajouts valides
      validAjouts = isCollectionContext
        ? [
            "all",
            ...FILTER_AJOUTS.films.filter((item) => item !== "Nouveautés"),
          ]
        : ["all", ...FILTER_AJOUTS.films];
      tousLabel = "Tous les films";
      break;
    case "tools":
      validAjouts = ["all", ...FILTER_AJOUTS.tools];
      tousLabel = "Tous les films";
      break;
    case "series":
      validAjouts = ["all", ...FILTER_AJOUTS.series];
      tousLabel = "Toutes les séries";
      break;
  }

  // Si on est en contexte collection sur la page films, on s'assure aussi de filtrer l'affichage du rendu des boutons
  if (isCollectionContext && currentPage === "films") {
    const ajoutsFiltresRestants = FILTER_AJOUTS.films.filter(
      (item) => item !== "Nouveautés",
    );
    renderSidebarFilters(
      "ajoutsFilters",
      ajoutsFiltresRestants,
      "ajouts",
      tousLabel,
    );
    renderSidebarFilters(
      "genreFilters",
      FILTER_GENRES,
      "genre",
      "Tous les genres",
    );
    renderSidebarFilters("typeFilters", FILTER_TYPES, "type", "Tous les types");
    renderSidebarFilters(
      "studioFilters",
      FILTER_STUDIOS,
      "studio",
      "Tous les studios",
    );
    renderSidebarFilters(
      "qualityFilters",
      FILTER_QUALITIES,
      "quality",
      "Toutes les qualités",
    );
  } else {
    renderAllSidebarFilters(tousLabel);
  }

  currentAjouts = viewState.ajouts || "all";
  if (!validAjouts.includes(currentAjouts)) {
    currentAjouts = "all";
  }
  currentGenre = viewState.genre || "all";
  currentType = viewState.type || "all";
  currentStudio = viewState.studio || "all";
  currentLanguage = viewState.language || "all";
  currentQuality = viewState.quality || "all";

  console.log("currentPage     =", currentPage);
  console.log("currentAjouts   = ", currentAjouts);
  console.log("currentGenre    = ", currentGenre);
  console.log("currentType     = ", currentType);
  console.log("currentStudio   = ", currentStudio);
  console.log("currentLanguage = ", currentLanguage);
  console.log("currentQuality  = ", currentQuality);

  document.querySelectorAll(".sidebar-link[data-ajouts]").forEach((button) => {
    button.onclick = () => selectAjouts(button.dataset.ajouts);
  });
  document.querySelectorAll(".sidebar-link[data-genre]").forEach((button) => {
    button.onclick = () => selectGenre(button.dataset.genre);
  });
  document.querySelectorAll(".sidebar-link[data-type]").forEach((button) => {
    button.onclick = () => selectType(button.dataset.type);
  });
  document.querySelectorAll(".sidebar-link[data-studio]").forEach((button) => {
    button.onclick = () => selectStudio(button.dataset.studio);
  });
  document
    .querySelectorAll(".sidebar-link[data-language]")
    .forEach((button) => {
      button.onclick = () => selectLanguage(button.dataset.language);
    });
  document.querySelectorAll(".sidebar-link[data-quality]").forEach((button) => {
    button.onclick = () => selectQuality(button.dataset.quality);
  });

  document
    .querySelector(`.sidebar-link[data-ajouts="${currentAjouts}"]`)
    ?.classList.add("active");
  document
    .querySelector(`.sidebar-link[data-genre="${currentGenre}"]`)
    ?.classList.add("active");
  document
    .querySelector(`.sidebar-link[data-type="${currentType}"]`)
    ?.classList.add("active");
  document
    .querySelector(`.sidebar-link[data-studio="${currentStudio}"]`)
    ?.classList.add("active");
  document
    .querySelector(`.sidebar-link[data-language="${currentLanguage}"]`)
    ?.classList.add("active");
  document
    .querySelector(`.sidebar-link[data-quality="${currentQuality}"]`)
    ?.classList.add("active");

  const state = loadSidebarState();

  if (!state.ajoutsExpanded) {
    document.getElementById("ajoutsFilters")?.classList.add("hidden");
  }
  if (!state.storageExpanded) {
    document.getElementById("storageActions")?.classList.add("hidden");
  }
  if (!state.genreExpanded) {
    document.getElementById("genreFilters")?.classList.add("hidden");
  }
  if (!state.typeExpanded) {
    document.getElementById("typeFilters")?.classList.add("hidden");
  }
  if (!state.studioExpanded) {
    document.getElementById("studioFilters")?.classList.add("hidden");
  }
  if (!state.languageExpanded) {
    document.getElementById("languageFilters")?.classList.add("hidden");
  }
  if (!state.qualityExpanded) {
    document.getElementById("qualityFilters")?.classList.add("hidden");
  }

  document.getElementById("ajoutsTitle").onclick = () => {
    const filters = document.getElementById("ajoutsFilters");
    filters.classList.toggle("hidden");

    const state = loadSidebarState();
    state.ajoutsExpanded = !filters.classList.contains("hidden");
    saveSidebarState(state);
  };

  const storageTitle = document.getElementById("storageTitle");
  if (storageTitle) {
    storageTitle.onclick = () => {
      const actions = document.getElementById("storageActions");
      actions.classList.toggle("hidden");
      const state = loadSidebarState();
      state.storageExpanded = !actions.classList.contains("hidden");
      saveSidebarState(state);
    };
  }

  document.getElementById("genreTitle").onclick = () => {
    const filters = document.getElementById("genreFilters");
    filters.classList.toggle("hidden");

    const state = loadSidebarState();
    state.genreExpanded = !filters.classList.contains("hidden");
    saveSidebarState(state);
  };

  document.getElementById("typeTitle").onclick = () => {
    const filters = document.getElementById("typeFilters");
    filters.classList.toggle("hidden");

    const state = loadSidebarState();
    state.typeExpanded = !filters.classList.contains("hidden");
    saveSidebarState(state);
  };

  document.getElementById("studioTitle").onclick = () => {
    const filters = document.getElementById("studioFilters");
    filters.classList.toggle("hidden");
    const state = loadSidebarState();
    state.studioExpanded = !filters.classList.contains("hidden");
    saveSidebarState(state);
  };

  const languageTitle = document.getElementById("languageTitle");
  languageTitle.onclick = () => {
    const filters = document.getElementById("languageFilters");
    filters.classList.toggle("hidden");
    const state = loadSidebarState();
    state.languageExpanded = !filters.classList.contains("hidden");
    saveSidebarState(state);
  };

  const qualityTitle = document.getElementById("qualityTitle");
  if (qualityTitle) {
    qualityTitle.onclick = () => {
      const filters = document.getElementById("qualityFilters");
      filters.classList.toggle("hidden");
      const state = loadSidebarState();
      state.qualityExpanded = !filters.classList.contains("hidden");
      saveSidebarState(state);
    };
  }

  setupHoverExpand("ajoutsTitle", "ajoutsFilters", "ajoutsExpanded");
  setupHoverExpand("storageTitle", "storageActions", "storageExpanded");
  setupHoverExpand("genreTitle", "genreFilters", "genreExpanded");
  setupHoverExpand("typeTitle", "typeFilters", "typeExpanded");
  setupHoverExpand("studioTitle", "studioFilters", "studioExpanded");
  setupHoverExpand("languageTitle", "languageFilters", "languageExpanded");
  setupHoverExpand("qualityTitle", "qualityFilters", "qualityExpanded");
}

function selectAjouts(ajouts) {
  currentAjouts = ajouts;
  document.querySelectorAll(".sidebar-link[data-ajouts]").forEach((button) => {
    button.classList.remove("active");
  });
  const activeButton = document.querySelector(
    `.sidebar-link[data-ajouts="${ajouts}"]`,
  );
  if (activeButton) {
    activeButton.classList.add("active");
  }

  if (ajouts === "Nouveautés") {
    currentGenre = "all";
    currentType = "all";
    currentStudio = "all";
    currentQuality = "all";

    document.querySelectorAll(".sidebar-link[data-genre]").forEach((button) => {
      button.classList.toggle("active", button.dataset.genre === "all");
    });
    document.querySelectorAll(".sidebar-link[data-type]").forEach((button) => {
      button.classList.toggle("active", button.dataset.type === "all");
    });
    document
      .querySelectorAll(".sidebar-link[data-studio]")
      .forEach((button) => {
        button.classList.toggle("active", button.dataset.studio === "all");
      });
    document
      .querySelectorAll(".sidebar-link[data-quality]")
      .forEach((button) => {
        button.classList.toggle("active", button.dataset.quality === "all");
      });

    updateSidebarTitle("genreTitle", "GENRE", currentGenre);
    updateSidebarTitle("typeTitle", "TYPE", currentType);
    updateSidebarTitle("studioTitle", "STUDIO", currentStudio);
    updateSidebarTitle("qualityTitle", "QUALITÉ", currentQuality);
  }

  saveSidebarFiltersState();

  document.getElementById("ajoutsFilters")?.classList.add("hidden");
  const state = loadSidebarState();
  state.ajoutsExpanded = false;
  saveSidebarState(state);
  updateSidebarTitle("ajoutsTitle", "SELECTION", currentAjouts);

  renderCurrentScreen();
}

function selectGenre(genre) {
  currentGenre = genre;
  document.querySelectorAll(".sidebar-link[data-genre]").forEach((button) => {
    button.classList.remove("active");
  });
  const activeButton = document.querySelector(
    `.sidebar-link[data-genre="${genre}"]`,
  );
  if (activeButton) {
    activeButton.classList.add("active");
  }
  saveSidebarFiltersState();

  document.getElementById("genreFilters")?.classList.add("hidden");
  const state = loadSidebarState();
  state.genreExpanded = false;
  saveSidebarState(state);
  updateSidebarTitle("genreTitle", "GENRE", currentGenre);

  renderCurrentScreen();
}

function selectType(type) {
  currentType = type;
  document.querySelectorAll(".sidebar-link[data-type]").forEach((button) => {
    button.classList.remove("active");
  });
  const activeButton = document.querySelector(
    `.sidebar-link[data-type="${type}"]`,
  );
  if (activeButton) {
    activeButton.classList.add("active");
  }
  saveSidebarFiltersState();

  document.getElementById("typeFilters")?.classList.add("hidden");
  const state = loadSidebarState();
  state.typeExpanded = false;
  saveSidebarState(state);
  updateSidebarTitle("typeTitle", "TYPE", currentType);

  renderCurrentScreen();
}
function selectStudio(studio) {
  currentStudio = studio;
  document.querySelectorAll(".sidebar-link[data-studio]").forEach((button) => {
    button.classList.remove("active");
  });
  const activeButton = document.querySelector(
    `.sidebar-link[data-studio="${studio}"]`,
  );
  if (activeButton) {
    activeButton.classList.add("active");
  }
  saveSidebarFiltersState();

  document.getElementById("studioFilters")?.classList.add("hidden");
  const state = loadSidebarState();
  state.studioExpanded = false;
  saveSidebarState(state);
  updateSidebarTitle("studioTitle", "STUDIO", currentStudio);

  renderCurrentScreen();
}
function selectLanguage(language) {
  currentLanguage = language;
  document
    .querySelectorAll(".sidebar-link[data-language]")
    .forEach((button) => {
      button.classList.remove("active");
    });
  const activeButton = document.querySelector(
    `.sidebar-link[data-language="${language}"]`,
  );
  if (activeButton) {
    activeButton.classList.add("active");
  }
  saveSidebarFiltersState();
  document.getElementById("languageFilters")?.classList.add("hidden");
  const state = loadSidebarState();
  state.languageExpanded = false;
  saveSidebarState(state);
  updateSidebarTitle("languageTitle", "LANGUES", currentLanguage);
  renderCurrentScreen();
}
function selectQuality(quality) {
  currentQuality = quality;
  document.querySelectorAll(".sidebar-link[data-quality]").forEach((button) => {
    button.classList.remove("active");
  });
  const activeButton = document.querySelector(
    `.sidebar-link[data-quality="${quality}"]`,
  );
  if (activeButton) {
    activeButton.classList.add("active");
  }
  saveSidebarFiltersState();
  document.getElementById("qualityFilters")?.classList.add("hidden");
  const state = loadSidebarState();
  state.qualityExpanded = false;
  saveSidebarState(state);
  updateSidebarTitle("qualityTitle", "QUALITÉ", currentQuality);
  renderCurrentScreen();
}
function matchesGenre(film) {
  if (currentGenre === "all") {
    return true;
  }
  if (!film.genre) {
    return false;
  }
  if (Array.isArray(film.genre)) {
    return film.genre.includes(currentGenre);
  }
  return film.genre === currentGenre;
}
function matchesType(film) {
  if (currentType === "all") {
    return true;
  }
  return film.type === currentType;
}
function matchesStudio(film) {
  if (currentStudio === "all") {
    return true;
  }
  return film.studio === currentStudio;
}
function matchesLanguage(film) {
  if (currentLanguage === "all") {
    return true;
  }
  const files = film.groupFiles?.length ? film.groupFiles : [film];
  return files.some((file) => {
    const languages = Array.isArray(file.langue) ? file.langue : [file.langue];
    return languages.includes(currentLanguage);
  });
}
function matchesQuality(film) {
  if (currentQuality === "all") {
    return true;
  }
  const files =
    Array.isArray(film.groupFiles) && film.groupFiles.length > 0
      ? film.groupFiles
      : [film];
  return files.some((item) => {
    const width = item.technique?.largeur;
    if (typeof width !== "number") {
      return false;
    }
    if (currentQuality === "Haute") {
      return width >= 1800;
    }
    if (currentQuality === "Moyenne") {
      return width >= 900 && width < 1800;
    }
    if (currentQuality === "Basse") {
      return width < 900;
    }
    return false;
  });
}

function renderCurrentScreen() {
  switch (currentPage) {
    case "collections":
      renderCollections();
      break;
    case "films":
      renderFilms();
      break;
    case "tools":
      renderTools();
      break;
    case "series":
      renderSeries();
      break;
  }
}

function initLanguageFilters() {
  document.querySelectorAll(".language-button").forEach((button) => {
    button.onclick = () => {
      const language = button.dataset.language;
      const isActive = button.classList.contains("active");

      button.classList.toggle("active");

      if (language === "VO") {
        document
          .querySelector('.language-button[data-language="VOST"]')
          ?.classList.toggle("active", !isActive);

        document
          .querySelector('.language-button[data-language="VOSTFR"]')
          ?.classList.toggle("active", !isActive);
      }

      saveSidebarFiltersState();
      renderFilms();
    };
  });
}

function getSelectedLanguages() {
  return [...document.querySelectorAll(".language-button.active")].map(
    (button) => button.dataset.language,
  );
}
