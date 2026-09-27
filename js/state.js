let catalog = null;
let currentPage = "home";

let currentSerie = null;
let currentSeason = null;

let currentAjouts = "all";
let currentGenre = "all";
let currentType = "all";
let currentStudio = "all";

let currentSearch = "";

const languageOrder = ["VO", "VF", "VOST", "VOSTFR", "TBD"];
const seriesViewStateKey = "seriesViewState";
const savedSeriesViewState = JSON.parse(
  localStorage.getItem(seriesViewStateKey) ?? "{}",
);
let activeSeriesLanguages = Array.isArray(savedSeriesViewState.languages)
  ? new Set(savedSeriesViewState.languages)
  : new Set(languageOrder);
let activeEpisodesLanguages = new Set();
const tmdbBaseUrl = "https://www.themoviedb.org";
const tmdbSearchBaseUrl = "https://www.themoviedb.org/search";
let showMissingEpisodesOnly = false;
const filmsViewStateKey = "filmsViewState";
const toolsButtonsStateKey = "toolsButtonsState";

function setActiveFilmsContext() {
  const currentFile = window.location.pathname.split("/").pop();
  if (
    isCollectionContextActive() &&
    (currentFile === "films.html" || currentFile === "film-detail.html")
  ) {
    const currentUrl = currentFile + window.location.search;
    console.log("currentFile =", currentFile);
    sessionStorage.setItem("collectionReturnUrl", currentUrl);
  }
  sessionStorage.setItem("activeFilmsContext", "films");
}

function setActiveCollectionContext() {
  console.log("setActiveCollectionContext >>>>> = collection");
  sessionStorage.setItem("activeFilmsContext", "collection");
}

function openCollectionContext() {
  setActiveCollectionContext();
  const collectionReturnUrl = sessionStorage.getItem("collectionReturnUrl");
  const selectedCollectionId = sessionStorage.getItem("selectedCollectionId");

  console.log(
    "collectionReturnUrl =",
    sessionStorage.getItem("collectionReturnUrl"),
  );

  console.log(
    "selectedCollectionId =",
    sessionStorage.getItem("selectedCollectionId"),
  );

  if (selectedCollectionId && collectionReturnUrl) {
    window.location.href = collectionReturnUrl;
    return;
  }
  window.location.href = "collections.html";
}

function isCollectionContextActive() {
  return sessionStorage.getItem("activeFilmsContext") === "collection";
}

function getSearchTextKey() {
  let key;
  switch (currentPage) {
    case "collections":
      key = "searchCollections";
      break;
    case "films":
      key = isCollectionContextActive()
        ? "searchFilmsCollection"
        : "searchFilmsHorsCollection";
      break;
    case "tools":
      key = isCollectionContextActive()
        ? "searchFilmsCollection"
        : "searchFilmsHorsCollection";
      break;
    case "series":
      key = "searchSeries";
      break;
  }
  return key;
}

function saveSearchText() {
  const key = getSearchTextKey();
  if (!key) {
    return;
  }
  localStorage.setItem(key, document.getElementById("searchInput").value ?? "");
}

function loadSearchText() {
  const key = getSearchTextKey();
  if (!key) {
    return "";
  }
  return localStorage.getItem(key) ?? "";
}

function saveSidebarFiltersState() {
  const state = {
    ajouts: currentAjouts,
    genre: currentGenre,
    type: currentType,
    studio: currentStudio,
    languages: [...document.querySelectorAll(".language-button.active")].map(
      (button) => button.dataset.language,
    ),
  };
  localStorage.setItem(filmsViewStateKey, JSON.stringify(state));
}

function saveToolsButtonsState() {
  const state = {
    showType,
    showGenre,
    showStudio,
    showFile,
  };
  localStorage.setItem(toolsButtonsStateKey, JSON.stringify(state));
}
function saveToolsFiltersState() {
  if (currentAjouts !== "ACorriger") {
    const state = loadSidebarFiltersState();
    state.ajouts = currentAjouts;
    state.genre = currentGenre;
    state.type = currentType;
    state.studio = currentStudio;
    localStorage.setItem(filmsViewStateKey, JSON.stringify(state));
  }

  saveToolsButtonsState();
}
function loadSidebarFiltersState() {
  return JSON.parse(localStorage.getItem(filmsViewStateKey) ?? "{}");
}
function loadToolsButtonsState() {
  return JSON.parse(localStorage.getItem(toolsButtonsStateKey) ?? "{}");
}
function saveSeriesViewState() {
  const state = {
    languages: [...activeSeriesLanguages],
  };

  localStorage.setItem(seriesViewStateKey, JSON.stringify(state));
}

function loadSeriesViewState() {
  return JSON.parse(localStorage.getItem(seriesViewStateKey) ?? "{}");
}
