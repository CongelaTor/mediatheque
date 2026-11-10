function playFilm(film) {
  saveResumeFilm(film);
  updateResumePlayback("film", film);
  updateResumeButtons();

  requestLocalPlay({
    type: "film",
    titre: film.titre,
    fichier: film.fichier,
  });
}

function playEpisode(serie, saison, episode) {
  const episodes = [...serie.saisons]
    .sort((a, b) => a.numero - b.numero)
    .flatMap((item) =>
      [...item.episodes]
        .filter((episodeItem) => episodeMatchesDetailLanguage(episodeItem))
        .sort((a, b) => a.numero - b.numero),
    );
  const selectedEpisodeIndex = episodes.findIndex(
    (item) => item.fichier === episode.fichier,
  );
  const fichiers = episodes
    .slice(selectedEpisodeIndex, selectedEpisodeIndex + 11)
    .map((item) => item.fichier);
  saveResumeSerie(serie, saison, episode);
  updateResumePlayback("serie", episode);
  requestLocalPlay({
    type: "serie",
    titre: serie.titre,
    saison: saison.numero,
    episode: episode.numero,
    fichier: episode.fichier,
    fichiers: fichiers,
  });
}
function requestLocalPlay(payload) {
  fetch("http://localhost:9876", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })
    .then((response) => response.text())
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
}

function syncResumePlayback(type) {
  fetch("http://localhost:9876/sync-resume-playback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: type,
    }),
  })
    .then((response) => response.text())
    .then((result) => {
      console.log(result);
      updateResumeButtons();
    })
    .catch((error) => console.error(error));
}

function requestResumePlayback(type) {
  fetch("http://localhost:9876/resume-playback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: type,
    }),
  })
    .then((response) => response.text())
    .then((result) => console.log(result))
    .catch((error) => console.error(error));
}

function updateResumePlayback(type, media) {
  fetch("http://localhost:9876/update-resume-playback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: type,
      catalogPath: media.fichier,
      durationSeconds: 0,
    }),
  })
    .then((response) => response.text())
    .then((result) => {
      console.log(result);
      updateResumeButtons();
    })
    .catch((error) => console.error(error));
}
function saveResumeFilm(film) {
  const title = film.titreTmdb || film.titre;
  localStorage.setItem(
    "maVideotheque.resumeFilm",
    JSON.stringify({
      titre: title,
      fichier: film.fichier,
      date: new Date().toISOString(),
    }),
  );
  updateResumeButtons();
}
function saveResumeSerie(serie, saison, episode) {
  localStorage.setItem(
    "maVideotheque.resumeSerie",
    JSON.stringify({
      titre: serie.titre,
      saison: saison.numero,
      episode: episode.numero,
      fichier: episode.fichier,
      date: new Date().toISOString(),
    }),
  );
  updateResumeButtons();
}

function resumeFilm() {
  requestResumePlayback("film");

  const tmdbId = document.getElementById("resumeFilmButton")?.dataset.tmdbId;
  if (tmdbId) {
    window.location.href = `film-detail.html?tmdbId=${tmdbId}`;
  }
}

function resumeSerie() {
  requestResumePlayback("serie");

  const resumeSerie = getResumeSerie();
  if (!resumeSerie) {
    return;
  }

  const serie = catalog.series.find((item) => item.titre === resumeSerie.titre);
  if (serie?.id) {
    window.location.href = `episodes.html?id=${encodeURIComponent(serie.id)}`;
  }
}

function updateResumeButtons() {
  const resumeCollection = getResumeCollection();
  const resumeFilm = getResumeFilm();
  const resumeSerie = getResumeSerie();
  const resumeCollectionButton = document.getElementById(
    "resumeCollectionButton",
  );
  const resumeFilmButton = document.getElementById("resumeFilmButton");
  const resumeSerieButton = document.getElementById("resumeSerieButton");
  if (!mediaServerAvailable) {
    resumeCollectionButton?.classList.add("hidden");
    if (resumeFilmButton) {
      if (resumeFilm) {
        resumeFilmButton.classList.remove("hidden");
        setText("resumeFilmText", resumeFilm.titre);
      } else {
        resumeFilmButton.classList.add("hidden");
      }
    }
    resumeSerieButton?.classList.add("hidden");
    return;
  }
  if (resumeCollectionButton) {
    if (resumeCollection) {
      resumeCollectionButton.classList.remove("hidden");
      setText("resumeCollectionText", resumeCollection.titre);
      const resumeCollectionPlay = document.getElementById(
        "resumeCollectionPlay",
      );
      const positionSeconds = Number(resumeCollection.positionSeconds) || 0;
      const durationSeconds = Number(resumeCollection.durationSeconds) || 0;
      const isFinished =
        durationSeconds > 0 && positionSeconds / durationSeconds >= 0.95;
      resumeCollectionPlay?.classList.toggle("hidden", isFinished);
    } else {
      resumeCollectionButton.classList.add("hidden");
    }
  }

  const isCollectionFilmDetail =
    window.location.pathname.endsWith("/film-detail.html") &&
    isCollectionContextActive();
  const isCollectionFilms =
    window.location.pathname.endsWith("/films.html") &&
    isCollectionContextActive();
  const displayedFilmResume =
    isCollectionFilmDetail || isCollectionFilms ? resumeCollection : resumeFilm;

    if (resumeFilmButton) {
    if (displayedFilmResume) {
      resumeFilmButton.classList.remove("hidden");
      setText("resumeFilmText", displayedFilmResume.titre);
      const resumeFilmPlay =
        resumeFilmButton.querySelector(".home-resume-play");
      const positionSeconds = Number(displayedFilmResume.positionSeconds) || 0;
      const durationSeconds = Number(displayedFilmResume.durationSeconds) || 0;
      const isFinished =
        isCollectionFilmDetail &&
        durationSeconds > 0 &&
        positionSeconds / durationSeconds >= 0.95;
      resumeFilmPlay?.classList.toggle("hidden", isFinished);
      if (displayedFilmResume.tmdbId) {
        resumeFilmButton.dataset.tmdbId = displayedFilmResume.tmdbId;
      } else {
        delete resumeFilmButton.dataset.tmdbId;
      }
    } else {
      resumeFilmButton.classList.add("hidden");
    }
  }
  resumeSerieButton?.classList.add("hidden");
  fetch("http://localhost:9876/get-resume-playback", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: "{}",
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      return response.json();
    })
    .then((resumeData) => {
      if (resumeData.film?.catalogPath) {
        // const position = new Date(
        //   (Number(resumeData.film.positionSeconds) || 0) * 1000,
        // )
        //   .toISOString()
        //   .substring(11, 19);
        const film = catalog.films.find(
          (item) => item.fichier === resumeData.film.catalogPath,
        );
        if (film?.collectionId) {
          localStorage.setItem(
            "maVideotheque.resumeCollection",
            JSON.stringify({
              titre: film.titreTmdb || film.titre || "Film",
              fichier: film.fichier,
              tmdbId: film.tmdbId,
              collectionId: film.collectionId,
              positionSeconds: Number(resumeData.film.positionSeconds) || 0,
              durationSeconds: (Number(film.dureeTmdb) || 0) * 60,
              date: new Date().toISOString(),
            }),
          );
          if (resumeCollectionButton) {
            resumeCollectionButton.classList.remove("hidden");
            setText(
              "resumeCollectionText",
              film.titreTmdb || film.titre || "Film",
            );
          }
        } else if (film && !isCollectionFilmDetail) {
          localStorage.setItem(
            "maVideotheque.resumeFilm",
            JSON.stringify({
              titre: film.titreTmdb || film.titre || "Film",
              fichier: film.fichier,
              tmdbId: film.tmdbId,
              date: new Date().toISOString(),
            }),
          );
          if (resumeFilmButton) {
            if (film.tmdbId) {
              resumeFilmButton.dataset.tmdbId = film.tmdbId;
            } else {
              delete resumeFilmButton.dataset.tmdbId;
            }
            resumeFilmButton.classList.remove("hidden");
            setText("resumeFilmText", film.titreTmdb || film.titre || "Film");
          }
        }
      }
      if (resumeSerieButton && resumeData.serie?.catalogPath && resumeSerie) {
        const position = new Date(
          (Number(resumeData.serie.positionSeconds) || 0) * 1000,
        )
          .toISOString()
          .substring(11, 19);
        resumeSerieButton.classList.remove("hidden");
        setText("resumeSerieText", resumeSerie.titre);
      }
    })
    .catch((error) => console.error(error));
}

function resumeCollection() {
  const resumeCollection = getResumeCollection();
  if (!resumeCollection?.collectionId) {
    return;
  }
  const positionSeconds = Number(resumeCollection.positionSeconds) || 0;
  const durationSeconds = Number(resumeCollection.durationSeconds) || 0;
  const isFinished =
    durationSeconds > 0 && positionSeconds / durationSeconds >= 0.95;
  if (!isFinished) {
    requestResumePlayback("film");
    return;
  }
  const film = catalog.films.find(
    (item) => item.collectionId === resumeCollection.collectionId,
  );
  sessionStorage.setItem("selectedCollectionId", resumeCollection.collectionId);
  sessionStorage.setItem("selectedCollectionName", film?.collectionNom || "");
  sessionStorage.setItem("collectionMode", "true");
  setActiveCollectionContext();
  window.location.href = "films.html";
}

function getResumeCollection() {
  const value = localStorage.getItem("maVideotheque.resumeCollection");
  if (!value) {
    return null;
  }
  return JSON.parse(value);
}

function getResumeFilm() {
  const value = localStorage.getItem("maVideotheque.resumeFilm");
  if (!value) {
    return null;
  }
  return JSON.parse(value);
}
function getResumeSerie() {
  const value = localStorage.getItem("maVideotheque.resumeSerie");
  if (!value) {
    return null;
  }
  return JSON.parse(value);
}

function initResumeButtons() {
  const syncFilmButton = document.getElementById("syncFilmButton");
  if (syncFilmButton) {
    syncFilmButton.onclick = () => {
      syncResumePlayback("film");
    };
  }

  const syncSerieButton = document.getElementById("syncSerieButton");
  if (syncSerieButton) {
    syncSerieButton.onclick = () => {
      syncResumePlayback("serie");
    };
  }
}
