const FILTER_AJOUTS = {
  collections: ["Nouveautés", "Récents", "À compléter"],
  films: ["Nouveautés", "Récents", "Doublons"],
  tools: ["Nouveautés", "Récents", "Doublons"],
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
  "Espionnage",
  "Guerre",
  "Policier",
  "Science-Fiction",
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
const FILTER_STUDIOS = ["DC", "Disney", "Disney Classic", "Marvel", "Pixar"];

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
    genreExpanded: false,
    typeExpanded: false,
    studioExpanded: false,
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
    "qualityFilters",
    FILTER_QUALITIES,
    "quality",
    "Toutes les qualités",
  );
}

function updateSidebarTitle(elementId, label, value) {
  const element = document.getElementById(elementId);
  if (!element) {
    return;
  }
  element.textContent = value === "all" ? label : `${label} (${value})`;
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

function initFiltersSidebar(ecran) {
  const viewState = loadSidebarFiltersState();

  switch (currentPage) {
    case "collections":
      validAjouts = ["all", "Nouveautés", "Récents", "A compléter"];
      tousLabel = "Toutes les collections";
      break;
    case "films":
      validAjouts = ["all", "Nouveautés", "Récents", "Doublons"];
      tousLabel = "Tous les films";
      break;
    case "tools":
      validAjouts = ["all", "Nouveautés", "Récents", "Doublons"];
      tousLabel = "Tous les films";
      break;
    case "series":
      validAjouts = ["all", "Nouveautés", "Récents", "À compléter"];
      tousLabel = "Toutes les séries";
      break;
  }

  renderAllSidebarFilters(tousLabel);

  currentAjouts = viewState.ajouts || "all";
  if (!validAjouts.includes(currentAjouts)) {
    currentAjouts = "all";
  }
  currentGenre = viewState.genre || "all";
  currentType = viewState.type || "all";
  currentStudio = viewState.studio || "all";
  currentQuality = viewState.quality || "all";

  console.log("currentPage =", currentPage);
  console.log("currentAjouts = ", currentAjouts);
  console.log("currentAjouts = ", currentAjouts);
  console.log("currentGenre = ", currentGenre);
  console.log("currentType = ", currentType);
  console.log("currentStudio = ", currentStudio);

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
    .querySelector(`.sidebar-link[data-quality="${currentQuality}"]`)
    ?.classList.add("active");

  const state = loadSidebarState();

  if (!state.ajoutsExpanded) {
    document.getElementById("ajoutsFilters")?.classList.add("hidden");
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

function matchesQuality(film) {
  if (currentQuality === "all") {
    return true;
  }
  const width = film.technique?.largeur;
  if (currentQuality === "Haute") {
    return width >= 1920;
  }
  if (currentQuality === "Moyenne") {
    return width >= 960 && width < 1920;
  }
  if (currentQuality === "Basse") {
    return width < 960;
  }
  return true;
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
      renderFilms();
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
