let showFile = false;
let showType = true;
let showGenre = true;
let showStudio = true;
let applyToAll = false;

async function initToolsPage() {
  currentPage = "tools";
  const state = loadSidebarFiltersState();
  currentAjouts = state.ajouts ?? "all";
  currentGenre = state.genre ?? "all";
  currentType = state.type ?? "all";
  currentStudio = state.studio ?? "all";
  currentLanguage = state.language ?? "all";
  currentQuality = state.quality ?? "all";
  updateUserGreeting();
  await isMediaServerAvailable();
  await loadCatalog();
  showUnknownGenres();

  updateStats();

  const sideCollectionsEl = document.getElementById("sideCollections");
  if (sideCollectionsEl) {
    const sideCollectionsRow =
      sideCollectionsEl.closest("div, li, a, button") || sideCollectionsEl;
    sideCollectionsRow.style.cursor = "pointer";
    sideCollectionsRow.onclick = () => {
      selectAjouts("all");
    };
  }

  const erreursCount = getMetadataErrorCount();
  setText("sideErreurs", erreursCount);
  document.getElementById("sideErreurs").nextSibling.textContent =
    erreursCount > 1 ? " Erreurs" : " Erreur";
  initResumeButtons();
  updateResumeButtons();
  initFiltersSidebar();
  initLanguageFilters();
  updateSidebarTitle("ajoutsTitle", "SELECTION", currentAjouts);
  updateSidebarTitle("genreTitle", "GENRE", currentGenre);
  updateSidebarTitle("typeTitle", "TYPE", currentType);
  updateSidebarTitle("studioTitle", "STUDIO", currentStudio);
  updateSidebarTitle("languageTitle", "LANGUE", currentLanguage);
  updateSidebarTitle("qualityTitle", "QUALITÉ", currentQuality);
  updateToolsSidebarHeight();
  document.getElementById("searchInput").value = loadSearchText();
  currentSearch = loadSearchText();
  document.getElementById("searchInput").addEventListener("input", (event) => {
    currentSearch = event.target.value;
    saveSearchText(currentSearch);
    renderTools();
  });
  document.getElementById("searchInput").addEventListener("focus", (event) => {
    event.target.select();
  });
  document.addEventListener("click", (event) => {
    if (
      event.target.closest(
        ".nav-button, #topbarContainer a, #topbarContainer button",
      )
    ) {
      document.getElementById("searchInput")?.blur();
    }
  });

  const toolsState = loadToolsButtonsState();
  showType = toolsState.showType ?? true;
  showGenre = toolsState.showGenre ?? true;
  showStudio = toolsState.showStudio ?? true;
  showFile = toolsState.showFile ?? false;

  window.selectedCollectionId = isCollectionContextActive()
    ? sessionStorage.getItem("selectedCollectionId")
    : null;

  // Déplacement des fichiers de la liste au clic sur le bouton "Déplacer"
  const moveFilesButton = document.getElementById("moveFilesButton");
  if (moveFilesButton) {
    moveFilesButton.onclick = async () => {
      await moveDisplayedFilmFiles(moveFilesButton);
    };
  }

  document.getElementById("applyToAllButton").onclick = () => {
    applyToAll = !applyToAll;
    document
      .getElementById("applyToAllButton")
      .classList.toggle("active", applyToAll);
    document.getElementById("applyToAllButton").textContent = applyToAll
      ? "Appliquer à tous 📌"
      : "Appliquer à tous";
  };

  document.getElementById("showFileButton").onclick = () => {
    showFile = !showFile;
    document
      .getElementById("showFileButton")
      .classList.toggle("active", showFile);
    saveToolsFiltersState();
    renderTools();
  };
  document.getElementById("showTypeButton").onclick = () => {
    showType = !showType;
    document
      .getElementById("showTypeButton")
      .classList.toggle("active", showType);
    saveToolsFiltersState();
    renderTools();
  };
  document.getElementById("showGenreButton").onclick = () => {
    showGenre = !showGenre;
    document
      .getElementById("showGenreButton")
      .classList.toggle("active", showGenre);
    saveToolsFiltersState();
    renderTools();
  };
  document.getElementById("showStudioButton").onclick = () => {
    showStudio = !showStudio;
    document
      .getElementById("showStudioButton")
      .classList.toggle("active", showStudio);
    saveToolsFiltersState();
    renderTools();
  };

  document
    .getElementById("showFileButton")
    .classList.toggle("active", showFile);

  document
    .getElementById("showTypeButton")
    .classList.toggle("active", showType);

  document
    .getElementById("showGenreButton")
    .classList.toggle("active", showGenre);

  document
    .getElementById("showStudioButton")
    .classList.toggle("active", showStudio);
  renderTools();
}

function initToolsLanguageFilters() {
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
      saveToolsFiltersState();
      renderTools();
    };
  });
}

function openFilmsNouveautes() {
  setActiveFilmsContext();
  saveSidebarFiltersState({ ajouts: "Nouveautés" });
  window.location.href = "films.html";
}
window.openFilmsNouveautes = openFilmsNouveautes;

function updateToolsSidebarHeight() {
  requestAnimationFrame(() => {
    const scrollbarHeight =
      window.innerHeight - document.documentElement.clientHeight;
    document.documentElement.style.setProperty(
      "--horizontal-scrollbar-height",
      `${scrollbarHeight}px`,
    );
  });
}

function hasMetadataError(fichier, category) {
  if (!fichier || fichier.fichier === null) {
    return false;
  }
  const categoryValue = fichier[category];
  const valueCount = Array.isArray(categoryValue)
    ? categoryValue.length
    : categoryValue
      ? 1
      : 0;
  if (category === "type" || category === "genre") {
    return valueCount !== 1;
  }
  if (category === "studio") {
    return fichier.type === "Animation" ? valueCount !== 1 : valueCount > 1;
  }
  return false;
}

function getMetadataErrorCount() {
  return catalog.films.filter(
    (fichier) =>
      hasMetadataError(fichier, "type") ||
      hasMetadataError(fichier, "genre") ||
      hasMetadataError(fichier, "studio"),
  ).length;
}

function renderToolButtons(values, category, fichier) {
  const hasError = hasMetadataError(fichier, category);
  return values
    .map((value) => {
      let isActive = false;
      if (category === "genre" && Array.isArray(fichier.genre)) {
        isActive = fichier.genre.includes(value);
      }
      if (category === "type") {
        isActive = fichier.type === value;
      }
      if (category === "studio") {
        isActive = fichier.studio === value;
      }
      return `
            <button
                class="language-button ${isActive ? "active" : ""} ${hasError ? "metadata-error" : ""}"
                data-category="${category}"
                data-value="${value}"
                data-fichier="${fichier.fichier || ""}"
                data-tmdb-id="${fichier.tmdbId || ""}">
                ${value}
            </button>
            `;
    })
    .join("");
}

function filmHasMetadataError(fichier) {
  const genreCount = Array.isArray(fichier.genre)
    ? fichier.genre.length
    : fichier.genre
      ? 1
      : 0;
  const typeCount = fichier.type ? 1 : 0;
  const studioCount = fichier.studio ? 1 : 0;
  return genreCount !== 1 || typeCount !== 1 || studioCount > 1;
}

function getSelectedLanguages() {
  return [...document.querySelectorAll(".language-button.active")].map(
    (button) => button.dataset.language,
  );
}

function filmMatchesAjouts(fichier) {
  if (currentAjouts === "all") {
    return true;
  }
  if (currentAjouts === "Nouveautés") {
    return isFilmNouveaute(fichier);
  }
  if (currentAjouts === "Récents") {
    return true;
  }
  if (currentAjouts === "Erreurs") {
    return (
      (showType && hasMetadataError(fichier, "type")) ||
      (showGenre && hasMetadataError(fichier, "genre")) ||
      (showStudio && hasMetadataError(fichier, "studio"))
    );
  }
  if (currentAjouts === "À déplacer") {
    const normalizedPath = filmNormalization.getNormalizedFilmPath(fichier);
    return normalizedPath && fichier.fichier !== normalizedPath;
  }
  return false;
}

function filmMatchesGenre(fichier) {
  if (currentGenre === "all") {
    return true;
  }
  if (!fichier.genre) {
    return false;
  }
  if (Array.isArray(fichier.genre)) {
    return fichier.genre.includes(currentGenre);
  }
  return fichier.genre === currentGenre;
}

function filmMatchesType(fichier) {
  if (currentType === "all") {
    return true;
  }
  return fichier.type === currentType;
}

function filmMatchesStudio(fichier) {
  if (currentStudio === "all") {
    return true;
  }
  return fichier.studio === currentStudio;
}

async function saveFilmMetadata(fichiers) {
  const response = await fetch("http://localhost:9876/save-film-metadata", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fichiers: fichiers.map((fichier) => ({
        fichier: fichier.fichier,
        tmdbId: fichier.tmdbId || null,
        type: fichier.type || null,
        genre: fichier.genre || [],
        studio: fichier.studio || null,
      })),
    }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
}

let displayedFiles = [];

// Déplacement d'un fichier de film
async function moveToolFilmFile(film) {
  if (!film?.fichier) {
    return;
  }
  const previousFileName =
    film.nomFichier ||
    film.fichier.substring(film.fichier.lastIndexOf("/") + 1);

  const previousPath = film.fichier;
  const normalizedFileName = filmNormalization.getNormalizedFilmFileName(film);
  const response = await fetch("http://localhost:9876/move-film-file", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fichier: film.fichier,
      nomFichier: normalizedFileName,
    }),
  });
  if (!response.ok) {
    showToast(await response.text(), "error", 5000);
    return;
  }
  const result = await response.json();
  film.fichierOriginal = film.fichierOriginal || film.nomFichier;
  film.fichier = result.fichier;
  film.nomFichier = result.nomFichier;
  console.log("Déplacer", {
    nomFichierAvant: previousFileName,
    nomFichierApres: film.nomFichier,
    cheminAvant: previousPath,
    cheminApres: film.fichier,
  });
  return true;
}

async function moveDisplayedFilmFiles(button) {
  const filesToMove = applyToAll
    ? [...displayedFiles]
    : displayedFiles.slice(0, 1);
  if (filesToMove.length === 0) {
    showToast("Aucun fichier à déplacer");
    return;
  }
  if (button) {
    button.disabled = true;
    button.style.backgroundColor = "#f9a8d4";
  }
  let movedCount = 0;
  try {
    for (let index = 0; index < filesToMove.length; index += 1) {
      const film = filesToMove[index];
      const moved = await moveToolFilmFile(film);
      if (moved) {
        movedCount += 1;
      }
    }
    renderTools();
    showToast(
      `${movedCount} fichier${movedCount > 1 ? "s" : ""} déplacé${movedCount > 1 ? "s" : ""} sur ${filesToMove.length}`,
    );
  } finally {
    if (button) {
      button.disabled = false;
      button.style.removeProperty("background-color");
    }
  }
}

function findUnknownGenres() {
  const knownGenres = new Set([...FILTER_GENRES, ...TMDB_IGNORE_GENRES]);

  const unknownGenres = new Set();

  for (const film of catalog.films) {
    const genres = Array.isArray(film.genre)
      ? film.genre
      : film.genre
        ? [film.genre]
        : [];

    for (const genre of genres) {
      if (!knownGenres.has(genre)) {
        unknownGenres.add(genre);
      }
    }
  }

  const result = [...unknownGenres].sort();
  console.log("Genres inconnus :", result);
  alert(result.length === 0 ? "Aucun genre inconnu" : result.join("\n"));
}

function renderTools() {
  const container = document.getElementById("toolsContainer");
  let fichiers = catalog.films
    .filter((fichier) => fichier.fichier !== null)
    .filter((fichier) => filmMatchesAjouts(fichier))
    .filter((fichier) => filmMatchesGenre(fichier))
    .filter((fichier) => filmMatchesType(fichier))
    .filter((fichier) => filmMatchesStudio(fichier))
    .filter((fichier) => matchesLanguage(fichier))
    .filter((fichier) => matchesQuality(fichier))
    .filter((fichier) => {
      const filtre = document
        .getElementById("searchInput")
        ?.value?.toLowerCase()
        ?.trim();

      if (!filtre) {
        return true;
      }

      const titre = (fichier.titreTmdb || fichier.titre || "").toLowerCase();
      const chemin = (fichier.fichier || "").toLowerCase();

      return titre.includes(filtre) || chemin.includes(filtre);
    });

  if (currentAjouts === "Récents") {
    fichiers = fichiers.sort(
      (a, b) =>
        new Date(b.dateAjout).getTime() - new Date(a.dateAjout).getTime(),
    );
  } else {
    fichiers = fichiers.sort((a, b) => {
      const valeurA = showFile ? a.fichier : a.titreTmdb || a.titre;
      const valeurB = showFile ? b.fichier : b.titreTmdb || b.titre;
      return valeurA.localeCompare(valeurB, "fr");
    });
  }

  displayedFiles = fichiers;

  setText(
    "filmsCount",
    `${fichiers.length} fichier${fichiers.length > 1 ? "s" : ""}`,
  );

  setText("filmsSubtitle", "Correction rapide");

  const titleCounts = {};

  fichiers.forEach((fichier) => {
    const titre = fichier.titreTmdb || fichier.titre;
    titleCounts[titre] = (titleCounts[titre] || 0) + 1;
  });

  let previousTitle = "";

  container.innerHTML = fichiers
    .map((fichier, index) => {
      const titre = showFile
        ? fichier.fichier
        : fichier.titreTmdb || fichier.titre;

      const nextFichier = fichiers[index + 1];

      const currentTitle = titre;
      const nextTitle = nextFichier
        ? nextFichier.titreTmdb || nextFichier.titre
        : null;

      const separatorBefore =
        titleCounts[currentTitle] > 1 && previousTitle !== currentTitle
          ? '<div class="tool-duplicate-separator"></div>'
          : "";

      const separatorAfter =
        titleCounts[currentTitle] > 1 && nextTitle !== currentTitle
          ? '<div class="tool-duplicate-separator"></div>'
          : "";

      previousTitle = currentTitle;

      return `
        ${separatorBefore}
            <div class="tool-film">
                <div class="tool-film-title">
                ${titre}
                </div>

                ${
                  showType
                    ? `
                <span class="tool-group">
                    ${renderToolButtons(FILTER_TYPES, "type", fichier)}
                </span>
                `
                    : ""
                }

                ${
                  showGenre
                    ? `
                <span class="tool-group">
                    ${renderToolButtons(
                      [
                        ...FILTER_GENRES,
                        ...TMDB_IGNORE_GENRES.filter((genre) =>
                          fichier.genre?.includes(genre),
                        ),
                      ],
                      "genre",
                      fichier,
                    )}
                </span>
                `
                    : ""
                }

                ${
                  showStudio
                    ? `
                <span class="tool-group">
                    ${renderToolButtons(FILTER_STUDIOS, "studio", fichier)}
                </span>
                `
                    : ""
                }
            </div>
        ${separatorAfter}    
        `;
    })
    .join("");

  container
    .querySelectorAll(".language-button[data-category]")
    .forEach((button) => {
      button.onclick = async () => {
        if (applyToAll) {
          showToast(`Mise à jour de ${displayedFiles.length} fichiers...`);
        }

        const fichierPath = button.dataset.fichier;
        const tmdbId = button.dataset.tmdbId;
        const fichier = catalog.films.find((item) =>
          fichierPath
            ? item.fichier === fichierPath
            : !item.fichier && Number(item.tmdbId) === Number(tmdbId),
        );
        if (!fichier) {
          return;
        }

        const fichiersToUpdate = applyToAll ? displayedFiles : [fichier];
        const category = button.dataset.category;
        const value = button.dataset.value;
        const shouldActivate = !button.classList.contains("active");
        for (const fichierToUpdate of fichiersToUpdate) {
          if (category === "type") {
            if (!shouldActivate) {
              fichierToUpdate.type = null;
            } else {
              fichierToUpdate.type = value;
            }
          }
          if (category === "studio") {
            if (!shouldActivate) {
              fichierToUpdate.studio = null;
            } else {
              fichierToUpdate.studio = value;
            }
          }
          if (category === "genre") {
            const genres = Array.isArray(fichierToUpdate.genre)
              ? [...fichierToUpdate.genre]
              : [];
            if (!shouldActivate) {
              fichierToUpdate.genre = genres.filter((g) => g !== value);
            } else {
              fichierToUpdate.genre = [value];
            }
          }
        }
        if (applyToAll) {
          await saveFilmMetadata(fichiersToUpdate);
        } else {
          await saveFilmMetadata([fichier]);
        }
        renderTools();
      };
    });
}

function showUnknownGenres() {
  const knownGenres = new Set([...FILTER_GENRES, ...TMDB_IGNORE_GENRES]);
  const unknownGenres = new Set();
  for (const film of catalog.films) {
    const genres = Array.isArray(film.genre)
      ? film.genre
      : film.genre
        ? [film.genre]
        : [];
    for (const genre of genres) {
      if (!knownGenres.has(genre)) {
        unknownGenres.add(genre);
      }
    }
  }
  if (unknownGenres.size === 0) {
    return;
  }
  const result = [...unknownGenres].sort();
  console.log("Genres inconnus à ajouter dans TMDB_IGNORE_GENRES :", result);
}
