async function initSeriesPage() {
  currentPage = "series";

  initSidebarToggle();
  updateUserGreeting();

  await loadCatalog();

  initFiltersSidebar();
  initializeLanguageFilters();

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

  updateSidebarTitle("ajoutsTitle", "SELECTION", currentAjouts);
  updateSidebarTitle("genreTitle", "GENRE", currentGenre);
  updateSidebarTitle("typeTitle", "TYPE", currentType);
  updateSidebarTitle("studioTitle", "STUDIO", currentStudio);

  //------------------------------
  // SET LANGUAGE FILTERS
  //------------------------------
  const stateLg = loadSeriesViewState();
  if (stateLg.languages) {
    activeSeriesLanguages = new Set(stateLg.languages);
  }

  if (stateLg.languages) {
    document.querySelectorAll(".language-button").forEach((button) => {
      button.classList.toggle(
        "active",
        stateLg.languages.includes(button.dataset.language),
      );
    });
  }

  //------------------------------
  // RENDER SCREEN
  //------------------------------
  renderSeries();
}

function initializeLanguageFilters() {
  document
    .querySelectorAll("#languageFilters .language-button")
    .forEach((button) => {
      button.onclick = () => handleLanguageButtonClick(button);
    });
}

function handleLanguageButtonClick(button) {
  const language = button.dataset.language;
  if (button.classList.contains("hidden")) {
    return;
  }
  if (currentSerie) {
    if (button.classList.contains("active")) {
      if (activeEpisodesLanguages.size === 1) {
        return;
      }
      activeEpisodesLanguages.delete(language);
    } else {
      activeEpisodesLanguages.add(language);
    }

    updateLanguageButtons();
    showSerieDetails(currentSerie, currentSeason);
    return;
  }
  if (button.classList.contains("active")) {
    if (activeSeriesLanguages.size === 1) {
      return;
    }
    activeSeriesLanguages.delete(language);
    if (language === "VO") {
      activeSeriesLanguages.delete("VOST");
      activeSeriesLanguages.delete("VOSTFR");
    }
  } else {
    activeSeriesLanguages.add(language);
    if (language === "VO") {
      activeSeriesLanguages.add("VOST");
      activeSeriesLanguages.add("VOSTFR");
    }
  }
  saveSeriesViewState();
  updateLanguageButtons();
  if (currentPage === "series") {
    renderSeries();
  }
}

function getSerieLanguages(serie) {
  const languages = new Set();

  for (const saison of serie.saisons) {
    for (const episode of saison.episodes) {
      if (!episode.langue) {
        languages.add("TBD");
        continue;
      }

      const episodeLanguages = Array.isArray(episode.langue)
        ? episode.langue
        : [episode.langue];

      for (const language of episodeLanguages) {
        languages.add(language || "TBD");
      }
    }
  }

  return languageOrder.filter((language) => languages.has(language));
}

function getSeasonLanguages(saison) {
  const languages = new Set();

  for (const episode of saison.episodes) {
    if (!episode.langue) {
      languages.add("TBD");
      continue;
    }

    const episodeLanguages = Array.isArray(episode.langue)
      ? episode.langue
      : [episode.langue];

    for (const language of episodeLanguages) {
      languages.add(language || "TBD");
    }
  }

  return languageOrder.filter((language) => languages.has(language));
}
function updateLanguageButtons() {
  if (currentSerie) {
    updateDetailLanguageButtons();
    return;
  }
  updateSeriesLanguageButtons();
}
function updateSeriesLanguageButtons() {
  document
    .querySelectorAll("#languageFilters .language-button")
    .forEach((button) => {
      const language = button.dataset.language;
      button.classList.remove("hidden");
      button.classList.toggle("active", activeSeriesLanguages.has(language));
    });
}

function updateDetailLanguageButtons() {
  const saison = currentSerie?.saisons?.find(
    (item) => item.numero === currentSeason,
  );
  const availableLanguages = saison
    ? getSeasonLanguages(saison)
    : getSerieLanguages(currentSerie);

  if (activeEpisodesLanguages.size === 0 && availableLanguages.length > 0) {
    const matchingLanguages = availableLanguages.filter((language) =>
      activeSeriesLanguages.has(language),
    );

    activeEpisodesLanguages = new Set(
      matchingLanguages.length > 0 ? matchingLanguages : availableLanguages,
    );
  }

  document
    .querySelectorAll("#languageFilters .language-button")
    .forEach((button) => {
      const language = button.dataset.language;
      const isVisible =
        button.id === "missingEpisodesButton" ||
        availableLanguages.includes(language);

      button.classList.toggle("hidden", !isVisible);

      button.classList.toggle(
        "active",
        isVisible && activeEpisodesLanguages.has(language),
      );
    });
}
function episodeMatchesDetailLanguage(episode) {
  const languages = Array.isArray(episode.langue)
    ? episode.langue
    : [episode.langue || "TBD"];

  return languages.some((language) =>
    activeEpisodesLanguages.has(language || "TBD"),
  );
}
function serieMatchesSeriesLanguages(serie) {
  let hasLanguage = false;

  for (const saison of serie.saisons) {
    for (const episode of saison.episodes) {
      if (!episode.langue) {
        continue;
      }

      hasLanguage = true;

      const langues = Array.isArray(episode.langue)
        ? episode.langue
        : [episode.langue];
      if (langues.some((langue) => activeSeriesLanguages.has(langue))) {
        return true;
      }
    }
  }

  return !hasLanguage;
}
function renderSeries() {
  currentPage = "series";
  currentSerie = null;
  currentSeason = null;
  activeDetailLanguage = null;
  updateLanguageButtons();

  const grid = document.getElementById("seriesGrid");
  grid.innerHTML = "";
  const series = catalog.series
    .filter((serie) => serieMatchesSeriesLanguages(serie))
    .filter((serie) => matchesSearch(serie.titre))
    .sort((a, b) => a.titre.localeCompare(b.titre, "fr"));

  setText(
    "seriesCount",
    `${series.length} série${series.length > 1 ? "s" : ""}`,
  );
  for (const serie of series) {
    grid.appendChild(createSerieCard(serie));
  }
  updateResumeButtons();
}
function createSerieCard(serie) {
  const card = document.createElement("article");
  card.className = "media-card";
  const posterZone = document.createElement("div");
  posterZone.className = "poster-zone";
  posterZone.onclick = () => {
    if (!serie.tmdbId) {
      showTmdbSerieSearch(serie);
      return;
    }
    window.location.href = `episodes.html?id=${encodeURIComponent(serie.id)}`;
  };
  posterZone.appendChild(
    createPosterContent(serie.image, serie.titre, serie.id),
  );
  if (serie.hasMissingEpisodes) {
    const missingDot = document.createElement("span");
    missingDot.className = "serie-missing-dot";
    posterZone.appendChild(missingDot);
  }
  card.appendChild(posterZone);
  return card;
}
