async function initSerieDetailPage() {
  currentPage = "episodes";
  await loadCatalog();
  initSidebarToggle();
  updateUserGreeting();
  initializeLanguageFilters();
  updateStats();
  initResumeButtons();
  updateResumeButtons();
  const serieId = new URLSearchParams(window.location.search).get("id");
  const serie = catalog.series.find((item) => item.id === serieId);
  if (!serie) {
    setText("seriesTitle", "Série introuvable");
    setText("seriesCount", "0 épisode");
    return;
  }
  showSerieDetails(serie);
}

async function sendMissingEpisodeFlags(serieId, missingSeasonNumbers) {
  await fetch("http://localhost:9876/save-missing-episode-flags", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      serieId: serieId,
      missingSeasonNumbers: [...missingSeasonNumbers],
    }),
  });
}

async function showSerieDetails(serie, requestedSeasonNumber = null) {
  if (currentSerie?.id !== serie.id) {
    activeEpisodesLanguages.clear();
  }

  currentSerie = serie;

  const serieLanguages = getSerieLanguages(serie);
  if (activeSeriesLanguages.size === 1) {
    const selectedLanguage = [...activeSeriesLanguages][0];
    if (serieLanguages.includes(selectedLanguage)) {
      activeDetailLanguage = selectedLanguage;
    }
  }
  window.scrollTo(0, 0);
  setText("seriesTitle", serie.titre);
  renderSerieInfoCard(serie);
  const backButton = document.getElementById("backToSeriesButton");
  if (backButton) {
    backButton.classList.remove("hidden");
  }

  const episodesPanel = document.getElementById("episodesPanel");
  episodesPanel.innerHTML = "";

  updateLanguageButtons();

  const allEpisodesButton = document.getElementById("allEpisodesButton");

  const missingEpisodesMenuButton = document.getElementById(
    "missingEpisodesMenuButton",
  );

  if (allEpisodesButton && missingEpisodesMenuButton) {
    allEpisodesButton.onclick = () => {
      showMissingEpisodesOnly = false;
      allEpisodesButton.classList.add("active");
      missingEpisodesMenuButton.classList.remove("active");
      renderSeason(
        currentSerie.saisons.find((s) => s.numero === currentSeason),
      );
    };

    missingEpisodesMenuButton.onclick = () => {
      showMissingEpisodesOnly = true;
      missingEpisodesMenuButton.classList.add("active");
      allEpisodesButton.classList.remove("active");
      renderSeason(
        currentSerie.saisons.find((s) => s.numero === currentSeason),
      );
    };
  }

  const sortedSeasons = [...serie.saisons].sort((a, b) => a.numero - b.numero);
  if (sortedSeasons.length === 0) {
    setText("seriesCount", "0 épisode");
    return;
  }
  const seasonsBar = document.createElement("div");
  seasonsBar.className = "seasons-bar";

  const episodesGrid = document.createElement("div");
  episodesGrid.className = "episode-list";
  episodesPanel.appendChild(seasonsBar);
  episodesPanel.appendChild(episodesGrid);

  async function renderSeason(selectedSeason) {
    currentSeason = selectedSeason.numero;
    updateLanguageButtons();
    seasonsBar.querySelectorAll(".season-button").forEach((button) => {
      button.classList.remove("active");
    });
    const activeButton = seasonsBar.querySelector(
      `[data-season="${selectedSeason.numero}"]`,
    );
    if (activeButton) {
      activeButton.classList.add("active");
    }
    episodesGrid.innerHTML = "";
    const tmdbEpisodes = await getTmdbSeasonEpisodes(
      serie,
      selectedSeason.numero,
    );
    const sortedEpisodes = [...selectedSeason.episodes]
      .filter((episode) => episodeMatchesDetailLanguage(episode))
      .sort((a, b) => a.numero - b.numero);
    setText(
      "seriesCount",
      `${serie.anneeTmdb || ""} • ${sortedEpisodes.length} épisode${sortedEpisodes.length > 1 ? "s" : ""}`,
    );

    const allEpisodes = [];
    for (const episode of sortedEpisodes) {
      allEpisodes.push({
        numero: episode.numero,
        episode: episode,
        tmdbEpisode: tmdbEpisodes.get(episode.numero),
      });
    }

    for (const [episodeNumber, tmdbEpisode] of tmdbEpisodes) {
      const existsLocally = sortedEpisodes.some(
        (episode) => episode.numero === episodeNumber,
      );
      if (existsLocally) {
        continue;
      }
      allEpisodes.push({
        numero: episodeNumber,
        episode: {
          numero: episodeNumber,
          missing: true,
        },
        tmdbEpisode: tmdbEpisode,
      });
    }

    allEpisodes.sort((a, b) => a.numero - b.numero);
    for (const item of allEpisodes) {
      if (showMissingEpisodesOnly && !item.episode.missing) {
        continue;
      }
      episodesGrid.appendChild(
        createEpisodeCard(
          serie,
          selectedSeason,
          item.episode,
          item.tmdbEpisode,
        ),
      );
    }
  }

  const missingSeasonNumbers = new Set();
  for (const saison of sortedSeasons) {
    const tmdbEpisodes = await getTmdbSeasonEpisodes(serie, saison.numero);
    const localEpisodeNumbers = new Set(
      saison.episodes.map((episode) => episode.numero),
    );
    for (const episodeNumber of tmdbEpisodes.keys()) {
      if (!localEpisodeNumbers.has(episodeNumber)) {
        missingSeasonNumbers.add(saison.numero);
        break;
      }
    }
  }

  sendMissingEpisodeFlags(serie.id, missingSeasonNumbers);
  serie.hasMissingEpisodes = missingSeasonNumbers.size > 0;
  for (const saison of serie.saisons) {
    saison.hasMissingEpisodes = missingSeasonNumbers.has(saison.numero);
  }

  for (const saison of sortedSeasons) {
    const button = document.createElement("button");
    button.className = "season-button";
    button.dataset.season = saison.numero;
    button.textContent = `Saison ${saison.numero}`;
    if (missingSeasonNumbers.has(saison.numero)) {
      const dot = document.createElement("span");
      dot.className = "season-missing-dot";
      button.appendChild(dot);
    }
    button.onclick = () => {
      renderSeason(saison);
    };
    seasonsBar.appendChild(button);
  }
  const selectedSeason =
    sortedSeasons.find((saison) => saison.numero === requestedSeasonNumber) ||
    sortedSeasons[0];
  renderSeason(selectedSeason);
}

function renderSerieInfoCard(serie) {
  const card = document.getElementById("serieInfoCard");
  if (!card) {
    return;
  }
  const imageZone = card.querySelector(".serie-info-image");
  imageZone.innerHTML = "";
  imageZone.appendChild(
    createPosterContent(serie.image, serie.titre, serie.id),
  );

  if (serie.tmdbId) {
    const tmdbBadge = document.createElement("button");
    tmdbBadge.className = "play-button";
    tmdbBadge.innerHTML = "🔍";
    tmdbBadge.style.width = "32px";
    tmdbBadge.style.height = "32px";
    tmdbBadge.style.fontSize = "14px";
    tmdbBadge.style.right = "6px";
    tmdbBadge.style.bottom = "6px";
    tmdbBadge.onclick = (event) => {
      event.stopPropagation();
      window.location.href = `${tmdbBaseUrl}/tv/${serie.tmdbId}`;
    };

    imageZone.appendChild(tmdbBadge);
    imageZone.style.cursor = "pointer";
    imageZone.onclick = () => {
      window.location.href = `${tmdbBaseUrl}/tv/${serie.tmdbId}`;
    };
  }

  setText(
    "serieInfoDescription",
    serie.descriptionTmdb || "Aucune description disponible.",
  );
  card.classList.remove("hidden");
}

function createEpisodeCard(serie, saison, episode, tmdbEpisode = null) {
  const card = document.createElement("article");
  card.className = "episode-card";

  const imageZone = document.createElement("div");
  imageZone.className = "episode-image-zone";
  if (!episode.missing) {
    imageZone.onclick = () => playEpisode(serie, saison, episode);
  }
  if (tmdbEpisode && tmdbEpisode.image) {
    const img = document.createElement("img");
    img.src = tmdbEpisode.image;
    img.alt = tmdbEpisode.titre || `Épisode ${episode.numero}`;
    imageZone.appendChild(img);
  } else {
    imageZone.appendChild(createMissingPoster(`Épisode ${episode.numero}`));
  }

  if (episode.missing) {
    const warningButton = document.createElement("button");
    warningButton.className = "episode-warning-button";
    warningButton.innerHTML = '<span class="play-icon"></span>';
    warningButton.title = "Épisode absent du disque";
    imageZone.appendChild(warningButton);
  } else {
    const playButton = document.createElement("button");
    playButton.className = "play-button mediaserver-only";
    playButton.innerHTML = '<span class="play-icon">▶</span>';
    playButton.onclick = (event) => {
      event.stopPropagation();
      playEpisode(serie, saison, episode);
    };
    imageZone.appendChild(playButton);

    if (episode.numero === 1) {
      const downloadButton = document.createElement("button");
      downloadButton.className = "play-button download-only";
      downloadButton.innerHTML = '<span class="play-icon">↓</span>';
      downloadButton.title = `Télécharger la saison ${saison.numero}`;
      downloadButton.onclick = (event) => {
        event.stopPropagation();
        requestSeasonDownload(serie, saison, episode);
      };
      imageZone.appendChild(downloadButton);
    }
  }
  const info = document.createElement("div");
  info.className = "episode-info";

  const header = document.createElement("div");
  header.className = "episode-header";

  const titleBlock = document.createElement("div");

  const title = document.createElement("div");
  title.className = "episode-title";
  title.textContent =
    tmdbEpisode && tmdbEpisode.titre
      ? `Épisode ${episode.numero} - ${tmdbEpisode.titre}`
      : `Épisode ${episode.numero}`;

  const meta = document.createElement("div");
  meta.className = "episode-meta";

  const metaParts = [];
  if (tmdbEpisode && tmdbEpisode.dateDiffusion) {
    metaParts.push(formatFrenchDate(tmdbEpisode.dateDiffusion));
  }
  if (tmdbEpisode && tmdbEpisode.duree) {
    metaParts.push(`${tmdbEpisode.duree} min`);
  }
  meta.textContent = metaParts.join(" • ");

  titleBlock.appendChild(title);
  titleBlock.appendChild(meta);

  const tmdbButton = document.createElement("button");
  tmdbButton.className = "tmdb-associate-button";
  tmdbButton.textContent = "TMDB";

  tmdbButton.onclick = () => {
    if (tmdbEpisode && tmdbEpisode.tmdbUrl) {
      window.location.href = tmdbEpisode.tmdbUrl;
    }
  };

  header.appendChild(titleBlock);
  header.appendChild(tmdbButton);

  const description = document.createElement("div");
  description.className = "episode-description";
  description.textContent =
    tmdbEpisode && tmdbEpisode.description
      ? tmdbEpisode.description
      : "Aucune description disponible.";

  info.appendChild(header);

  card.appendChild(imageZone);
  card.appendChild(info);
  card.appendChild(description);
  return card;
}

function requestSeasonDownload(serie, saison, episode) {
  const demandeurValue = localStorage.getItem("demandeur");
  if (!demandeurValue) {
    showToast("Identifiez-vous pour télécharger");
    return;
  }
  const demandeur = encodeURIComponent(demandeurValue);
  const titre = encodeURIComponent(`${serie.titre} - Saison ${saison.numero}`);
  const dernierSeparateur = episode.fichier.lastIndexOf("/");
  const repertoire = encodeURIComponent(
    episode.fichier.substring(0, dernierSeparateur).replaceAll("/", "\\"),
  );
  const url =
    `https://docs.google.com/forms/d/e/` +
    `1FAIpQLSe3uzQeDPyxNPscC1cBXq9_x6KWc_q0U9xojAakoUp8Imp_tA` +
    `/viewform?usp=pp_url` +
    `&entry.802088561=${demandeur}` +
    `&entry.257324969=${titre}` +
    `&entry.1329036869=${repertoire}`;

  // "https://docs.google.com/forms/d/e/1FAIpQLSc4bsOBKlNGPC5pVSz-TMDYFLoSCyUJ6bUxCchSQXsHcl5aWg/viewform" +
  // `?usp=pp_url` +
  // `&entry.989827274=${demandeur}` +
  // `&entry.75537578=${titre}` +
  // `&entry.287740096=${repertoire}`;

  window.open(url, "_blank");
}
