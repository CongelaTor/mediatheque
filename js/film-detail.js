currentPage = "film-detail";

async function initFilmDetailPage() {
  currentPage = "film-detail";
  initSidebarToggle();
  updateUserGreeting();

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

  const params = new URLSearchParams(window.location.search);
  const tmdbId = Number(params.get("tmdbId"));

  if (!tmdbId) {
    window.location.href = "films.html";
    return;
  }

  await loadCatalog();
  await loadFilmSearchConfig();
  updateStats();
  initResumeButtons();
  updateResumeButtons();

  const films = catalog.films.filter((film) => film.tmdbId === tmdbId);
  if (films.length === 0) {
    const storedInfo = JSON.parse(
      sessionStorage.getItem("filmDetailInfo") || "{}",
    );
    setText("filmTitle", storedInfo.titreTmdb || "");
    setText(
      "filmInfo",
      storedInfo.anneeTmdb
        ? `${storedInfo.anneeTmdb} • ${filmFiles.length} fichier${filmFiles.length > 1 ? "s" : ""}`
        : `${filmFiles.length} fichier${filmFiles.length > 1 ? "s" : ""}`,
    );
    setText("filmInfoDescription", storedInfo.descriptionTmdb || "");

    const infoCard = document.getElementById("filmInfoCard");
    infoCard.classList.remove("hidden");

    const imageContainer = infoCard.querySelector(".serie-info-image");
    imageContainer.innerHTML = "";
    imageContainer.classList.add(...getFilmBorderClasses([]));

    if (storedInfo.image) {
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
        window.location.href = storedInfo.tmdbUrl;
      };

      imageContainer.appendChild(
        createPosterContent(
          storedInfo.image,
          storedInfo.titreTmdb,
          "film-detail",
        ),
      );
      imageContainer.appendChild(tmdbBadge);
      imageContainer.style.cursor = "pointer";
      imageContainer.onclick = () => {
        window.location.href = storedInfo.tmdbUrl;
      };
    }
    document.getElementById("filmTmdbButton").onclick = () => {
      window.location.href = storedInfo.tmdbUrl;
    };

    renderFilmFiles([]);

    return;
  }

  const referenceFilm = films[0];
  document.getElementById("filmSearchButton").onclick = () =>
    showFilmSearchModal(referenceFilm);

  console.log("tmdbId =", tmdbId);
  console.log("films =", films);
  console.log("referenceFilm =", referenceFilm);

  sessionStorage.setItem(
    "filmDetailInfo",
    JSON.stringify({
      titreTmdb: referenceFilm.titreTmdb || referenceFilm.titre,
      anneeTmdb: referenceFilm.anneeTmdb || referenceFilm.annee,
      descriptionTmdb: referenceFilm.descriptionTmdb,
      image: referenceFilm.image,
      tmdbUrl: referenceFilm.tmdbUrl,
    }),
  );

  setText("filmTitle", referenceFilm.titreTmdb || referenceFilm.titre);
  setText(
    "filmInfo",
    `${referenceFilm.anneeTmdb || referenceFilm.annee || "?"} • ${referenceFilm.dureeTmdb || "?"} min • ${films.length} fichier${films.length > 1 ? "s" : ""}`,
  );
  setText("filmInfoDescription", referenceFilm.descriptionTmdb || "");

  const infoCard = document.getElementById("filmInfoCard");
  infoCard.classList.remove("hidden");

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
    window.location.href = referenceFilm.tmdbUrl;
  };

  const imageContainer = infoCard.querySelector(".serie-info-image");
  imageContainer.innerHTML = "";
  imageContainer.classList.add(...getFilmBorderClasses(films));
  imageContainer.appendChild(
    createPosterContent(
      referenceFilm.image,
      referenceFilm.titre,
      referenceFilm.id,
    ),
  );
  imageContainer.appendChild(tmdbBadge);
  imageContainer.style.cursor = "pointer";
  imageContainer.onclick = () => {
    window.location.href = referenceFilm.tmdbUrl;
  };

  updateLanguageFilters(films);
  renderFilmFiles(films);
}

function showFilmMetadataChoices(field, label, choices, films) {
  const choicesContainer = document.getElementById("filmMetadataChoices");
  if (!choicesContainer.hidden && choicesContainer.dataset.field === field) {
    choicesContainer.hidden = true;
    choicesContainer.dataset.field = "";
    return;
  }
  choicesContainer.dataset.field = field;
  const currentValues = [
    ...new Set(
      films.flatMap((film) => {
        const value = film[field];
        return Array.isArray(value) ? value : value ? [value] : [];
      }),
    ),
  ];
  choicesContainer.hidden = false;
  choicesContainer.innerHTML = "";
  choicesContainer.classList.toggle(
    "film-metadata-choices-genres",
    field === "genre",
  );
  for (const choice of choices) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = choice;
    button.className = "language-button";
    button.classList.toggle("active", currentValues.includes(choice));
    button.onclick = async () => {
      const value =
        field === "studio" &&
        currentValues.length === 1 &&
        currentValues[0] === choice
          ? null
          : field === "genre"
            ? [choice]
            : choice;
      for (const film of films) {
        film[field] = value;
      }
      const response = await fetch("http://localhost:9876/save-film-metadata", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fichiers: films.map((film) => ({
            fichier: film.fichier,
            tmdbId: film.tmdbId || null,
            type: film.type || null,
            genre: film.genre || [],
            studio: film.studio || null,
          })),
        }),
      });
      if (!response.ok) {
        showToast(await response.text(), "error");
        return;
      }
      choicesContainer.hidden = true;
      choicesContainer.dataset.field = "";
    };
    choicesContainer.appendChild(button);
  }
}

document.addEventListener("click", (event) => {
  const choicesContainer = document.getElementById("filmMetadataChoices");
  if (choicesContainer.hidden) {
    return;
  }
  if (
    choicesContainer.contains(event.target) ||
    event.target.closest("#filmMetadataButtons")
  ) {
    return;
  }
  choicesContainer.hidden = true;
  choicesContainer.dataset.field = "";
});

function updateLanguageFilters(films) {
  const availableLanguages = new Set();
  for (const film of films) {
    const languages = Array.isArray(film.langue)
      ? film.langue
      : [film.langue || "TBD"];
    for (const language of languages) {
      availableLanguages.add(language || "TBD");
    }
  }
  document
    .querySelectorAll("#languageFilters .language-button")
    .forEach((button) => {
      button.classList.toggle(
        "hidden",
        !availableLanguages.has(button.dataset.language),
      );
    });
}

function renderFilmFiles(films) {
  const panel = document.getElementById("filmFilesPanel");
  panel.innerHTML = "";
  const filteredFilms = [...films].sort(
    (a, b) => (a.taille || 0) - (b.taille || 0),
  );

  setText(
    "film",
    `${filteredFilms.length} fichier${filteredFilms.length > 1 ? "s" : ""}`,
  );

  const filesList = document.createElement("div");
  filesList.className = "film-files-grid";

  for (const film of filteredFilms) {
    filesList.appendChild(createFilmFileCard(film));
  }

  panel.appendChild(filesList);
}
const {
  getNormalizedFilmFileName,
  getNormalizedFilmPath,
  formatFilmLanguages,
} = filmNormalization;

function formatTechnicalCodec(codec) {
  const codecs = {
    h264: "H.264",
    hevc: "H.265",
    h265: "H.265",
    av1: "AV1",
    mpeg4: "Xvid",
  };
  return codecs[codec?.toLowerCase()] || codec?.toUpperCase() || "";
}
function formatTechnicalBitrate(technique) {
  const bitrate = technique?.bitrateVideo || technique?.bitrateGlobal;
  if (!bitrate) {
    return "";
  }
  return `${(bitrate / 1000000).toFixed(2).replace(".", ",")} Mb/s`;
}
function formatTechnicalScreen(technique) {
  const zone = technique?.zoneUtile;
  if (!zone?.largeurUtile || !zone?.hauteurUtile) {
    return "Ratio à tester";
  }
  const videoRatio = zone.largeurUtile / zone.hauteurUtile;
  const screenRatio = 2560 / 1080;
  const tolerance = 0.03;
  if (Math.abs(videoRatio - screenRatio) <= tolerance) {
    return "Plein écran";
  }
  return videoRatio < screenRatio ? "Bandes latérales" : "Bandes horizontales";
}
function formatTechnicalLanguage(language) {
  const languages = {
    fr: "FR",
    fre: "FR",
    fra: "FR",
    en: "EN",
    eng: "EN",
    de: "DE",
    deu: "DE",
    ger: "DE",
  };
  return languages[language?.toLowerCase()] || "";
}
function getTechnicalLanguages(streams) {
  return [
    ...new Set(
      (streams || [])
        .map((stream) => formatTechnicalLanguage(stream.langue))
        .filter(Boolean),
    ),
  ];
}
function formatTechnicalDuration(seconds) {
  if (!seconds) {
    return "";
  }
  const totalSeconds = Math.round(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;
  return `${hours} h ${String(minutes).padStart(2, "0")} min ${String(remainingSeconds).padStart(2, "0")} s`;
}
function getTechnicalQualityClass(width) {
  if (width >= 1800) {
    return "film-technical-good";
  }
  if (width >= 900) {
    return "film-technical-medium";
  }
  return "film-technical-low";
}

function getFilmNormalizationClass(film) {
  const languages = Array.isArray(film.langue)
    ? film.langue
    : [film.langue || "TBD"];
  const audioLanguages = Array.isArray(film.languesAudio)
    ? film.languesAudio
    : getTechnicalLanguages(film.technique?.audio);
  const subtitleLanguages = Array.isArray(film.languesSousTitres)
    ? film.languesSousTitres
    : getTechnicalLanguages(film.technique?.sousTitres);
  if (languages.includes("TBD")) {
    return "film-technical-low";
  }
  const hasFrenchAudio = audioLanguages.includes("FR");
  const hasOriginalAudio = audioLanguages.some((language) => language !== "FR");
  const hasMatchingSubtitles =
    languages.includes("VOST") === subtitleLanguages.includes("eng") &&
    languages.includes("VOSTFR") === subtitleLanguages.includes("fre");
  if (!hasMatchingSubtitles) {
    return "film-technical-low";
  }
  if (
    (film.langueOriginale === "fr" &&
      languages.includes("VF") &&
      hasFrenchAudio) ||
    (languages.includes("VO") &&
      languages.includes("VF") &&
      hasFrenchAudio &&
      hasOriginalAudio)
  ) {
    return "film-technical-good";
  }
  return "film-technical-medium";
}

function updateFilmNormalizationClass(metadata, film) {
  metadata.classList.remove(
    "film-technical-good",
    "film-technical-medium",
    "film-technical-low",
  );
  metadata.classList.add(getFilmNormalizationClass(film));
}
function renderAudioLanguages(audioInfo, audioLanguages, metadata, film) {
  audioInfo.innerHTML = "";
  audioInfo.classList.remove("language-editor");
  metadata.classList.remove("language-metadata-hidden");
  const audioIcon = document.createElement("span");
  audioIcon.textContent = "🔊";
  audioInfo.appendChild(audioIcon);
  if (audioLanguages.length) {
    const sortedAudioLanguages = [...audioLanguages].sort(
      (a, b) => ["EN", "FR"].indexOf(a) - ["EN", "FR"].indexOf(b),
    );
    audioInfo.append(` ${sortedAudioLanguages.join(" · ")}`);
  }
  audioInfo.style.cursor = "pointer";
  audioInfo.onclick = (event) => {
    event.stopPropagation();
    renderAudioLanguageEditor(
      audioInfo,
      audioLanguages,
      metadata,
      film,
      audioInfo.closest(".film-file-card"),
    );
  };
}

function renderAudioLanguageEditor(
  audioInfo,
  audioLanguages,
  metadata,
  film,
  card,
) {
  audioInfo.innerHTML = "";
  audioInfo.classList.add("language-editor");
  const closeEditor = () => {
    document.removeEventListener("click", closeEditor);
    renderAudioLanguages(audioInfo, audioLanguages, metadata, film);
  };
  const validateButton = document.createElement("button");
  validateButton.type = "button";
  validateButton.textContent = "✓";
  validateButton.className = "language-button";
  validateButton.onclick = async (event) => {
    event.stopPropagation();
    audioLanguages.splice(
      0,
      audioLanguages.length,
      ...[...audioInfo.querySelectorAll(".language-button.active")].map(
        (button) => button.textContent,
      ),
    );
    const response = await fetch("http://127.0.0.1:9876/save-film-languages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fichier: film.fichier,
        type: "audio",
        languages: audioLanguages,
      }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const result = await response.json();
    const films = catalog.films.filter((item) => item.tmdbId === film.tmdbId);
    const oldBorderClasses = getFilmBorderClasses(films);
    film.languesAudio = [...audioLanguages];
    film.langue = result.langue;
    const languages = formatFilmLanguages(film.langue);
    metadata.textContent = `${languages} • ${formatFilmFileSize(film.taille)}`;
    updateFilmNormalizationClass(metadata, film);
    const imageContainer = document.querySelector(
      "#filmInfoCard .serie-info-image",
    );
    imageContainer.style.removeProperty("background");
    imageContainer.classList.remove(...oldBorderClasses);
    imageContainer.classList.add(...getFilmBorderClasses(films));
    updateLanguageFilters(films);
    document.removeEventListener("click", closeEditor);
    renderAudioLanguages(audioInfo, audioLanguages, metadata, film);
  };

  audioInfo.appendChild(validateButton);
  for (const language of ["EN", "FR"]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = language;
    button.className = "language-button";
    button.classList.toggle("active", audioLanguages.includes(language));
    button.onclick = (event) => {
      event.stopPropagation();
      button.classList.toggle("active");
    };
    audioInfo.appendChild(button);
  }
  setTimeout(() => document.addEventListener("click", closeEditor), 0);
}

function renderSubtitleLanguages(
  subtitleInfo,
  subtitleLanguages,
  metadata,
  film,
) {
  subtitleInfo.innerHTML = "";
  subtitleInfo.classList.remove("language-editor");
  metadata.classList.remove("language-metadata-hidden");

  const subtitleIcon = document.createElement("span");
  subtitleIcon.textContent = "💬";
  subtitleInfo.appendChild(subtitleIcon);
  if (subtitleLanguages.length) {
    const sortedSubtitleLanguages = [...subtitleLanguages].sort(
      (a, b) => ["EN", "FR"].indexOf(a) - ["EN", "FR"].indexOf(b),
    );
    subtitleInfo.append(` ${sortedSubtitleLanguages.join(" · ")}`);
  }
  subtitleInfo.style.cursor = "pointer";
  subtitleInfo.onclick = (event) => {
    event.stopPropagation();
    renderSubtitleLanguageEditor(
      subtitleInfo,
      subtitleLanguages,
      metadata,
      film,
    );
  };
}

function renderSubtitleLanguageEditor(
  subtitleInfo,
  subtitleLanguages,
  metadata,
  film,
) {
  subtitleInfo.innerHTML = "";
  subtitleInfo.classList.add("language-editor");
  const closeEditor = () => {
    document.removeEventListener("click", closeEditor);
    renderSubtitleLanguages(subtitleInfo, subtitleLanguages, metadata, film);
  };
  const validateButton = document.createElement("button");
  validateButton.type = "button";
  validateButton.textContent = "✓";
  validateButton.className = "language-button";
  validateButton.onclick = async (event) => {
    event.stopPropagation();
    subtitleLanguages.splice(
      0,
      subtitleLanguages.length,
      ...[...subtitleInfo.querySelectorAll(".language-button.active")].map(
        (button) => button.textContent,
      ),
    );
    const response = await fetch("http://127.0.0.1:9876/save-film-languages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fichier: film.fichier,
        type: "subtitles",
        languages: subtitleLanguages,
      }),
    });
    if (!response.ok) {
      throw new Error(await response.text());
    }
    const result = await response.json();
    film.languesSousTitres = [...subtitleLanguages];
    film.langue = result.langue;
    const languages = formatFilmLanguages(film.langue);
    metadata.textContent = `${languages} • ${formatFilmFileSize(film.taille)}`;
    updateFilmNormalizationClass(metadata, film);
    const films = catalog.films.filter((item) => item.tmdbId === film.tmdbId);
    updateLanguageFilters(films);
    document.removeEventListener("click", closeEditor);
    renderSubtitleLanguages(subtitleInfo, subtitleLanguages, metadata, film);
  };

  subtitleInfo.appendChild(validateButton);
  for (const language of ["EN", "FR"]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = language;
    button.className = "language-button";
    button.classList.toggle("active", subtitleLanguages.includes(language));
    button.onclick = (event) => {
      event.stopPropagation();
      button.classList.toggle("active");
    };
    subtitleInfo.appendChild(button);
  }
  setTimeout(() => document.addEventListener("click", closeEditor), 0);
}
function createFilmFileCard(film) {
  const card = document.createElement("article");
  card.className = "film-file-card";
  card.classList.add(...getFilmBorderClasses([film]));

  const languages = formatFilmLanguages(film.langue);

  const playbackRow = document.createElement("div");
  playbackRow.className = "film-file-row film-file-playback-row";

  const metadata = document.createElement("div");
  metadata.className = "film-file-meta";
  metadata.textContent = `${languages} • ${formatFilmFileSize(film.taille)}`;
  updateFilmNormalizationClass(metadata, film);

  const playButton = document.createElement("button");
  playButton.className =
    "tmdb-associate-button film-file-action-button mediaserver-only";
  playButton.innerHTML = '<span class="play-icon">▶</span>';
  playButton.title = "Lire";
  playButton.onclick = () => playFilm(film);

  const downloadButton = document.createElement("button");
  downloadButton.className =
    "tmdb-associate-button film-file-action-button download-only";
  //--------------------------
  // PLAY only si accès box via windows et si film sur disque de la box
  //--------------------------
  if (window.isWebContainer) {
    if (film.fichier.startsWith("/Box_")) {
      downloadButton.innerHTML = '<span class="play-icon">▶</span>';
      downloadButton.title = "Lire";
    } else {
      downloadButton.innerHTML = '<span class="play-icon">↓</span>';
      downloadButton.title = "Télécharger";
    }
  } else {
    downloadButton.innerHTML = '<span class="play-icon">↓</span>';
    downloadButton.title = "Télécharger";
  }
  downloadButton.onclick = () => {
    console.log("DWLD BUTTON CLICK", film.fichier);
    if (window.isWebContainer && film.fichier.startsWith("/Box_")) {
      console.log("WEBCONTAINER PLAY", film.nomFichier);
      window.flutterTest(film.nomFichier);
      return;
    }
    requestFilmDownload(film);
  };

  // const tmdbButton = document.createElement("button");
  // tmdbButton.className =
  //   "tmdb-associate-button film-file-action-button linux-hidden mediaserver-only";
  // tmdbButton.innerHTML = `
  //   <span class="play-icon film-link-icon">
  //     <svg viewBox="0 0 24 24"
  //         width="18"
  //         height="18"
  //         fill="none"
  //         stroke="currentColor"
  //         stroke-width="2"
  //         stroke-linecap="round"
  //         stroke-linejoin="round">
  //       <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11 4"/>
  //       <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 1 0 7.07 7.07L13 20"/>
  //     </svg>
  //   </span>`;
  // tmdbButton.title = "Réassocier TMDB";
  // tmdbButton.onclick = () => showTmdbFilmSearch(film);

  const locationButton = document.createElement("button");
  locationButton.className =
    "tmdb-associate-button film-file-action-button linux-hidden mediaserver-only";
  locationButton.innerHTML = '<span class="play-icon film-open-icon">🗁</span>';
  locationButton.title = "Ouvrir l'emplacement";
  locationButton.onclick = () => openFilmLocation(film);

  const moveButton = document.createElement("button");
  moveButton.className =
    "tmdb-associate-button film-file-action-button linux-hidden mediaserver-only";
  moveButton.innerHTML = `
      <svg viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round">
        <path d="M5 12h12"/>
        <path d="m13 8 4 4-4 4"/>
        <path d="M5 5v14"/>
      </svg>`;
  moveButton.title = "Déplacer le fichier";
  moveButton.onclick = async () => {
    moveButton.disabled = true;
    moveButton.style.backgroundColor = "#f9a8d4";
    try {
      await moveFilmFile(film, pathInfo);
    } finally {
      moveButton.disabled = false;
      moveButton.style.removeProperty("background-color");
    }
  };
  const tmdbButton = document.createElement("button");
  tmdbButton.className =
    "tmdb-associate-button film-file-action-button linux-hidden mediaserver-only";
  tmdbButton.innerHTML =
    '<span class="play-icon film-link-icon" style="transform: translateX(-2px)">TM</span>';
  tmdbButton.title = "Réassocier TMDB";
  tmdbButton.onclick = () => showTmdbFilmSearch(film);

  const deleteButton = document.createElement("button");
  deleteButton.className =
    "tmdb-associate-button film-file-action-button linux-hidden mediaserver-only";
  deleteButton.innerHTML = `
    <svg viewBox="0 0 24 24"
        width="18"
        height="18"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round">
      <path d="M3 6h18"/>
      <path d="M8 6V4h8v2"/>
      <path d="M19 6l-1 14H6L5 6"/>
      <path d="M10 11v5"/>
      <path d="M14 11v5"/>
    </svg>`;
  deleteButton.title = "Supprimer le fichier";
  deleteButton.onclick = async () => {
    const confirmed = confirm(
      `Supprimer définitivement ce fichier ?\n\n${film.nomFichier}`,
    );
    if (!confirmed) {
      return;
    }
    const response = await fetch("http://localhost:9876/delete-film-file", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fichier: film.fichier,
      }),
    });
    if (!response.ok) {
      showToast(await response.text(), "error");
      return;
    }
    showToast("Fichier supprimé");
    setTimeout(() => {
      window.location.reload();
    }, 1500);
    window.location.reload();
  };

  const rightActions = document.createElement("div");
  rightActions.className = "film-file-right-actions";
  rightActions.appendChild(locationButton);
  rightActions.appendChild(moveButton);
  rightActions.appendChild(tmdbButton);
  rightActions.appendChild(deleteButton);

  const technique = film.technique;
  const technicalVideo = document.createElement("div");
  technicalVideo.className = `film-technical-video ${getTechnicalQualityClass(technique?.largeur)}`;
  if (technique) {
    const quality =
      technique.largeur >= 1800
        ? "Haute"
        : technique.largeur >= 900
          ? "Moyenne"
          : "Basse";
    technicalVideo.textContent = document.body.classList.contains(
      "no-mediaserver",
    )
      ? `Qualité ${quality.toLowerCase()}`
      : quality;
    const technicalDetails = document.createElement("span");
    technicalDetails.className = "mediaserver-only";
    const videoParts = [
      technique.resolution,
      formatTechnicalCodec(technique.codecVideo),
      formatTechnicalBitrate(technique),
      formatTechnicalScreen(technique),
    ].filter(Boolean);
    if (videoParts.length) {
      technicalDetails.textContent = ` • ${videoParts.join(" • ")}`;
      technicalVideo.appendChild(technicalDetails);
    }
  }

  const leftInfo = document.createElement("div");
  leftInfo.className = "film-file-left-info";
  leftInfo.appendChild(playButton);
  leftInfo.appendChild(downloadButton);
  leftInfo.appendChild(metadata);

  const audioLanguages = Array.isArray(film.languesAudio)
    ? [...film.languesAudio]
    : getTechnicalLanguages(technique?.audio);
  const audioInfo = document.createElement("div");
  audioInfo.className = "film-technical-info";
  renderAudioLanguages(audioInfo, audioLanguages, metadata, film);

  const subtitleLanguages = Array.isArray(film.languesSousTitres)
    ? [...film.languesSousTitres]
    : getTechnicalLanguages(technique?.sousTitres);

  const subtitleInfo = document.createElement("div");
  subtitleInfo.className = "film-technical-info";
  renderSubtitleLanguages(subtitleInfo, subtitleLanguages, metadata, film);

  // const durationInfo = document.createElement("div");
  // durationInfo.className = "film-technical-info";
  // durationInfo.textContent = `⏱ ${formatTechnicalDuration(technique?.dureeFichier)}`;

  const leftColumn = document.createElement("div");
  leftColumn.className = "film-file-column";
  leftColumn.appendChild(leftInfo);
  leftColumn.appendChild(audioInfo);

  const centerColumn = document.createElement("div");
  centerColumn.className = "film-file-column";
  centerColumn.appendChild(technicalVideo);
  centerColumn.appendChild(subtitleInfo);

  const rightColumn = document.createElement("div");
  rightColumn.className = "film-file-column";
  rightColumn.appendChild(rightActions);
  // rightColumn.appendChild(durationInfo);

  playbackRow.appendChild(leftColumn);
  playbackRow.appendChild(centerColumn);
  playbackRow.appendChild(rightColumn);

  const originalPathInfo = document.createElement("div");
  originalPathInfo.className = "film-file-folder mediaserver-only";
  originalPathInfo.textContent = film.fichierOriginal || film.nomFichier;
  originalPathInfo.hidden = true;
  const pathInfo = document.createElement("div");
  pathInfo.className = "film-file-folder mediaserver-only";
  pathInfo.textContent = film.fichier;
  const normalizedFileName = getNormalizedFilmFileName(film);

  const normalizedPathInfo = document.createElement("div");
  normalizedPathInfo.className = "film-file-folder mediaserver-only";
  normalizedPathInfo.textContent = normalizedFileName;
  normalizedPathInfo.hidden = true;

  const fileMetadataButtons = document.createElement("div");
  fileMetadataButtons.className = "language-filters";
  const fileTypeButton = document.createElement("button");
  fileTypeButton.className = "language-button";
  fileTypeButton.textContent = film.type || "Type";
  const fileGenreButton = document.createElement("button");
  fileGenreButton.className = "language-button";
  fileGenreButton.textContent = Array.isArray(film.genre)
    ? film.genre[0] || "Genre"
    : film.genre || "Genre";
  const fileStudioButton = document.createElement("button");
  fileStudioButton.className = "language-button";
  fileStudioButton.textContent = film.studio || "Studio";
  fileStudioButton.style.background = film.studio ? "" : "#64748b";
  const fileMetadataChoices = document.createElement("div");
  fileMetadataChoices.className = "film-metadata-choices";
  fileMetadataChoices.hidden = true;
  const showFileMetadataChoices = (field, choices) => {
    if (
      !fileMetadataChoices.hidden &&
      fileMetadataChoices.dataset.field === field
    ) {
      fileMetadataChoices.hidden = true;
      fileMetadataChoices.dataset.field = "";
      return;
    }
    const currentValue = film[field];
    const currentValues = Array.isArray(currentValue)
      ? currentValue
      : currentValue
        ? [currentValue]
        : [];
    fileMetadataChoices.dataset.field = field;
    fileMetadataChoices.innerHTML = "";
    fileMetadataChoices.hidden = false;
    fileMetadataChoices.classList.toggle(
      "film-metadata-choices-genres",
      field === "genre",
    );
    for (const choice of choices) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = choice;
      button.className = "language-button";
      button.classList.toggle("active", currentValues.includes(choice));
      button.onclick = async () => {
        const value =
          field === "studio" &&
          currentValues.length === 1 &&
          currentValues[0] === choice
            ? null
            : field === "genre"
              ? [choice]
              : choice;
        film[field] = value;
        const response = await fetch(
          "http://localhost:9876/save-film-metadata",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fichiers: [
                {
                  fichier: film.fichier,
                  tmdbId: film.tmdbId || null,
                  type: film.type || null,
                  genre: film.genre || [],
                  studio: film.studio || null,
                },
              ],
            }),
          },
        );
        if (!response.ok) {
          showToast(await response.text(), "error");
          return;
        }
        card.replaceWith(createFilmFileCard(film));
      };
      fileMetadataChoices.appendChild(button);
    }
  };
  fileTypeButton.onclick = () => showFileMetadataChoices("type", FILTER_TYPES);
  fileGenreButton.onclick = () =>
    showFileMetadataChoices("genre", FILTER_GENRES);
  fileStudioButton.onclick = () =>
    showFileMetadataChoices("studio", FILTER_STUDIOS);
  fileMetadataButtons.appendChild(fileTypeButton);
  fileMetadataButtons.appendChild(fileGenreButton);
  fileMetadataButtons.appendChild(fileStudioButton);
  const normalizedPath = getNormalizedFilmPath(film);

  const isCurrentPathCorrect =
    film.fichier.replaceAll("\\", "/") ===
    normalizedPath?.replaceAll("\\", "/");
  const hasValidDestination = Array.isArray(film.genre)
    ? film.genre.length === 1 && Boolean(film.genre[0])
    : Boolean(film.genre);
  const hasValidType = Boolean(film.type);
  const films = catalog.films.filter((item) => item.tmdbId === film.tmdbId);
  const hasTypeError =
    !FILTER_TYPES.includes(film.type) ||
    new Set(films.map((item) => item.type).filter(Boolean)).size > 1;
  const hasGenreError =
    new Set(
      films.flatMap((item) =>
        Array.isArray(item.genre) ? item.genre : item.genre ? [item.genre] : [],
      ),
    ).size > 1;
  const hasStudioError =
    new Set(films.map((item) => item.studio).filter(Boolean)).size > 1;
  const hasMetadataError = hasTypeError || hasGenreError || hasStudioError;
  fileTypeButton.classList.toggle("metadata-error", hasTypeError);
  fileGenreButton.classList.toggle("metadata-error", hasGenreError);
  fileStudioButton.classList.toggle("metadata-error", hasStudioError);
  fileMetadataButtons.hidden = !hasMetadataError && isCurrentPathCorrect;
  pathInfo.style.color = isCurrentPathCorrect ? "#1ec98b" : "#ef4444";
  moveButton.classList.toggle(
    "move-available",
    !isCurrentPathCorrect && hasValidDestination && hasValidType,
  );
  pathInfo.onclick = () => {
    const showDetails = originalPathInfo.hidden;
    originalPathInfo.hidden = !showDetails;
    normalizedPathInfo.hidden = !showDetails;
    fileMetadataButtons.hidden = !showDetails && !hasMetadataError;
    fileMetadataChoices.hidden = true;
    fileMetadataChoices.dataset.field = "";
  };
  card.appendChild(playbackRow);
  card.appendChild(pathInfo);
  card.appendChild(originalPathInfo);
  card.appendChild(normalizedPathInfo);
  card.appendChild(fileMetadataButtons);
  card.appendChild(fileMetadataChoices);
  return card;
}
function formatFilmFileSize(size) {
  if (!size) {
    return "Taille inconnue";
  }

  const gigabytes = size / (1024 * 1024 * 1024);

  if (gigabytes > 1) {
    return `${gigabytes.toFixed(2)} Go`;
  }

  const megabytes = size / (1024 * 1024);
  return `${megabytes.toFixed(0)} Mo`;
}

function getFilmFolder(filePath) {
  if (!filePath) {
    return "Dossier inconnu";
  }
  const separatorIndex = filePath.lastIndexOf("/");
  return separatorIndex >= 0 ? filePath.substring(0, separatorIndex) : filePath;
}

// async function updateFilmFilePathStatus(film, pathInfo) {
//   const normalizedFileName = getNormalizedFilmFileName(film);
//   const currentPath = film.fichier.replaceAll("\\", "/");
//   const currentFileName = currentPath.substring(
//     currentPath.lastIndexOf("/") + 1,
//   );
//   if (currentFileName !== normalizedFileName) {
//     return;
//   }
//   const response = await fetch("http://localhost:9876/move-film-file", {
//     method: "POST",
//     headers: {
//       "Content-Type": "application/json",
//     },
//     body: JSON.stringify({
//       fichier: film.fichier,
//       preview: true,
//     }),
//   });
//   if (!response.ok) {
//     return;
//   }
//   const preview = await response.json();
//   const destinationPath = preview.destination.replaceAll("\\", "/");
//   if (currentPath === destinationPath) {
//     pathInfo.style.color = "#22c55e";
//   }
// }

async function openFilmLocation(film) {
  const folder = film.fichier.substring(0, film.fichier.lastIndexOf("/"));
  const response = await fetch("http://localhost:9876/open-file-location", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fichier: folder,
    }),
  });

  if (!response.ok) {
    console.error(await response.text());
  }
}

async function moveFilmFile(film, pathInfo) {
  console.log("moveFilmFile appelé", film);
  const normalizedFileName = getNormalizedFilmFileName(film);
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
  const card = pathInfo.closest(".film-file-card");
  card.replaceWith(createFilmFileCard(film));
  showToast("Fichier déplacé");
}

function requestFilmDownload(film) {
  const demandeurValue = localStorage.getItem("demandeur");
  if (!demandeurValue) {
    showToast("Identifiez-vous pour télécharger");
    return;
  }
  const demandeur = encodeURIComponent(demandeurValue);
  const titre = encodeURIComponent(film.titreTmdb || film.titre);
  const pathFichier = encodeURIComponent(film.fichier.replaceAll("/", "\\"));
  const urlFilm = encodeURIComponent(film.fichier.replaceAll("/", "\\"));
  const urlGoogleForm =
    `https://docs.google.com/forms/d/e/` +
    `1FAIpQLSe3uzQeDPyxNPscC1cBXq9_x6KWc_q0U9xojAakoUp8Imp_tA` +
    `/viewform?usp=pp_url` +
    `&entry.802088561=${demandeur}` +
    `&entry.257324969=${titre}` +
    `&entry.1329036869=${pathFichier}`;
  // https://docs.google.com/forms/d/e//viewform?usp=pp_url&entry.802088561=alain
  // &entry.1740534205=comment
  // &entry.257324969=titre
  // &entry.1329036869=chemin

  // Forms V1
  // `https://docs.google.com/forms/d/e/1FAIpQLSc4bsOBKlNGPC5pVSz-TMDYFLoSCyUJ6bUxCchSQXsHcl5aWg/viewform` +
  // `?usp=pp_url` +
  // `&entry.989827274=${demandeur}` +
  // `&entry.75537578=${titre}` +
  // `&entry.287740096=${pathFichier}`;
  window.open(urlGoogleForm, "_blank");
}

window.addEventListener("pageshow", (event) => {
  if (event.persisted) {
    window.location.reload();
  }
});
