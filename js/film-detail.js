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

  renderFilmFiles(films);
}

function renderFilmFiles(films) {
  const panel = document.getElementById("filmFilesPanel");
  panel.innerHTML = "";

  const selectedLanguages = [
    ...document.querySelectorAll(".language-button.active"),
  ].map((button) => button.dataset.language);

  const filteredFilms = films
    .filter((film) => {
      const languages = Array.isArray(film.langue)
        ? film.langue
        : [film.langue || "TBD"];

      return languages.some((language) => selectedLanguages.includes(language));
    })
    .sort((a, b) => (a.taille || 0) - (b.taille || 0));

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
  if (width >= 1920) {
    return "film-technical-good";
  }
  if (width >= 960) {
    return "film-technical-medium";
  }
  return "film-technical-low";
}

function renderAudioLanguages(audioInfo, audioLanguages, metadata, film) {
  audioInfo.innerHTML = "";
  audioInfo.classList.remove("language-editor");
  metadata.classList.remove("language-metadata-hidden");
  const audioIcon = document.createElement("span");
  audioIcon.textContent = "🔊";
  audioIcon.style.cursor = "pointer";
  audioIcon.onclick = (event) => {
    event.stopPropagation();
    renderAudioLanguageEditor(audioInfo, audioLanguages, metadata, film);
  };
  audioInfo.appendChild(audioIcon);
  if (audioLanguages.length) {
    audioInfo.append(` ${audioLanguages.join(" · ")}`);
  }
}
function renderAudioLanguageEditor(audioInfo, audioLanguages, metadata, film) {
  audioInfo.innerHTML = "";
  audioInfo.classList.add("language-editor");
  metadata.classList.add("language-metadata-hidden");
  const closeEditor = () => {
    document.removeEventListener("click", closeEditor);
    renderAudioLanguages(audioInfo, audioLanguages, metadata);
  };
  for (const language of ["FR", "EN"]) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = language;
    button.className = "language-button";
    button.classList.toggle("active", audioLanguages.includes(language));
    button.onclick = async (event) => {
      event.stopPropagation();
      button.classList.toggle("active");
      audioLanguages.splice(
        0,
        audioLanguages.length,
        ...[...audioInfo.querySelectorAll(".language-button.active")].map(
          (button) => button.textContent,
        ),
      );
      document.removeEventListener("click", closeEditor);
      renderAudioLanguages(audioInfo, audioLanguages, metadata, film);
      const response = await fetch(
        "http://127.0.0.1:9876/save-film-languages",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            fichier: film.fichier,
            type: "audio",
            languages: audioLanguages,
          }),
        },
      );
      if (!response.ok) {
        throw new Error(await response.text());
      }
    };
    audioInfo.appendChild(button);
  }
  setTimeout(() => document.addEventListener("click", closeEditor), 0);
}

function createFilmFileCard(film) {
  const card = document.createElement("article");
  card.className = "film-file-card";
  const languages = Array.isArray(film.langue)
    ? film.langue.join(", ")
    : film.langue || "TBD";
  const playbackRow = document.createElement("div");
  playbackRow.className = "film-file-row film-file-playback-row";
  const metadata = document.createElement("div");
  metadata.className = "film-file-meta";
  metadata.textContent = `${languages} • ${formatFilmFileSize(film.taille)}`;

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
  const tmdbButton = document.createElement("button");
  tmdbButton.className =
    "tmdb-associate-button film-file-action-button linux-hidden mediaserver-only";
  tmdbButton.innerHTML = `
    <span class="play-icon film-link-icon">
      <svg viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round">
        <path d="M10 13a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11 4"/>
        <path d="M14 11a5 5 0 0 0-7.07 0L4.1 13.83a5 5 0 1 0 7.07 7.07L13 20"/>
      </svg>
    </span>`;
  tmdbButton.title = "Réassocier TMDB";
  tmdbButton.onclick = () => showTmdbFilmSearch(film);
  const locationButton = document.createElement("button");
  locationButton.className =
    "tmdb-associate-button film-file-action-button linux-hidden mediaserver-only";
  locationButton.innerHTML = '<span class="play-icon film-open-icon">🗁</span>';
  locationButton.title = "Ouvrir l'emplacement";
  locationButton.onclick = () => openFilmLocation(film);
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
  rightActions.appendChild(tmdbButton);
  rightActions.appendChild(deleteButton);

  const technique = film.technique;
  const technicalVideo = document.createElement("div");
  technicalVideo.className = `film-technical-video ${getTechnicalQualityClass(technique?.largeur)}`;
  if (technique) {
    const quality =
      technique.largeur >= 1920
        ? "Haute"
        : technique.largeur >= 960
          ? "Moyenne"
          : "Basse";
    const videoParts = [
      quality,
      technique.resolution,
      formatTechnicalCodec(technique.codecVideo),
      formatTechnicalBitrate(technique),
      formatTechnicalScreen(technique),
    ].filter(Boolean);
    technicalVideo.textContent = videoParts.join(" · ");
  }

  const leftInfo = document.createElement("div");
  leftInfo.className = "film-file-left-info";
  leftInfo.appendChild(playButton);
  leftInfo.appendChild(downloadButton);
  leftInfo.appendChild(metadata);

  const audioLanguages = Array.isArray(film.languesAudio)
    ? [...film.languesAudio]
    : [];
  const audioInfo = document.createElement("div");
  audioInfo.className = "film-technical-info";
  renderAudioLanguages(audioInfo, audioLanguages, metadata, film);

  const subtitleLanguages = getTechnicalLanguages(technique?.sousTitres);
  const subtitleInfo = document.createElement("div");
  subtitleInfo.className = "film-technical-info";
  subtitleInfo.textContent = `💬${subtitleLanguages.length ? ` ${subtitleLanguages.join(" · ")}` : ""}`;

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

  const pathInfo = document.createElement("div");
  pathInfo.className = "film-file-folder";
  pathInfo.textContent = `${getFilmFolder(film.fichier)}/${film.nomFichier}`;

  card.appendChild(playbackRow);
  card.appendChild(pathInfo);
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
