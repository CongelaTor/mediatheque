let tmdbSearchWords = [];
let tmdbCurrentFilm = null;

function openTmdbForFilm(film) {
  if (film.titreTmdb) {
    window.location.href = `${tmdbBaseUrl}/movie/${film.tmdbId}`;
    return;
  }
  window.location.href = `${tmdbSearchBaseUrl}?query=${encodeURIComponent(film.titre)}`;
}
function openTmdbForSerie(serie) {
  if (serie.tmdbId) {
    window.location.href = `${tmdbBaseUrl}/tv/${serie.tmdbId}`;
    return;
  }
  showTmdbSerieSearch(serie);
}
async function showTmdbSerieSearch(serie) {
  const modal = document.getElementById("tmdbModal");
  const title = document.getElementById("tmdbModalTitle");
  const resultsContainer = document.getElementById("tmdbResults");
  title.textContent = `Résultats TMDB pour ${serie.titre}`;
  resultsContainer.innerHTML = '<div class="tmdb-empty">div>';
  modal.classList.remove("hidden");
  modal.onclick = (event) => {
    if (event.target === modal) {
      closeTmdbModal();
    }
  };
  const results = await searchTmdbSerie(serie.titre);
  renderTmdbSerieResults(serie, results);
}
async function showTmdbFilmSearch(film) {
  tmdbCurrentFilm = film;

  const modal = document.getElementById("tmdbModal");
  const title = document.getElementById("tmdbModalTitle");
  const input = document.getElementById("tmdbSearchInput");
  const tokensContainer = document.getElementById("tmdbSearchTokens");
  const resultsContainer = document.getElementById("tmdbResults");

  title.textContent = "Résultats TMDB";
  tokensContainer.innerHTML = "";
  resultsContainer.innerHTML = "";

  const ignoreWordsResponse = await fetch(
    "http://localhost:9876/get-ignore-words",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: "{}",
    },
  );

  const ignoreWords = ignoreWordsResponse.ok
    ? await ignoreWordsResponse.json()
    : [];

  const ignoredWordsSet = new Set(
    ignoreWords.map((word) => word.toUpperCase()),
  );

  const sourceTitle = (film.nomFichier || film.titre)
    .replace(/\.[^.]+$/, "")
    .replace(/[._-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  tmdbSearchWords = sourceTitle
    .split(" ")
    .filter((word) => word.trim() !== "")
    .map((word) => ({
      text: word,
      state: ignoredWordsSet.has(word.toUpperCase())
        ? "pinned"
        : word.length === 1
          ? "inactive"
          : "active",
    }));

  const firstPinnedAtEnd = findFirstPinnedWordAtEnd();

  let leftPinnedIndex = firstPinnedAtEnd - 1;

  while (
    leftPinnedIndex >= 0 &&
    tmdbSearchWords[leftPinnedIndex].state === "active"
  ) {
    leftPinnedIndex--;
  }

  if (
    leftPinnedIndex > 0 &&
    tmdbSearchWords[leftPinnedIndex].state === "pinned"
  ) {
    for (let index = leftPinnedIndex + 1; index < firstPinnedAtEnd; index++) {
      const wordToPin = tmdbSearchWords[index];

      if (
        wordToPin.state === "active" &&
        !/^[A-Za-z0-9]$/.test(wordToPin.text)
      ) {
        wordToPin.state = "pinned";
        await setTmdbIgnoreWord(wordToPin.text, true);
      }
    }
  }

  updateTmdbFilmSearchInputFromTokens();
  renderTmdbFilmSearchTokens();

  input.onkeydown = (event) => {
    if (event.key === "Enter") {
      searchTmdbFilmFromInput();
    }
  };

  modal.classList.remove("hidden");
  modal.onclick = (event) => {
    console.log("TMDB CLICK =>", event.target);
  };
  // modal.onclick = (event) => {
  //   if (event.target === modal) {
  //     closeTmdbModal();
  //   }
  // };

  await searchTmdbFilmFromInput();
}

function findFirstPinnedWordAtEnd() {
  let index = tmdbSearchWords.length - 1;

  while (index >= 0 && tmdbSearchWords[index].state === "pinned") {
    index--;
  }

  return index + 1;
}

function renderTmdbFilmSearchTokens() {
  const tokensContainer = document.getElementById("tmdbSearchTokens");
  tokensContainer.innerHTML = "";

  for (const word of tmdbSearchWords) {
    const button = document.createElement("button");
    button.type = "button";

    const isYear = word.state === "pinned" && /^(19|20)\d{2}$/.test(word.text);
    button.className =
      `tmdb-search-token ${word.state}` + (isYear ? " year-pinned" : "");

    const wordText = document.createElement("span");
    wordText.textContent = word.text;
    button.appendChild(wordText);

    if (word.state === "pinned") {
      const pinnedIcon = document.createElement("span");
      pinnedIcon.className = "tmdb-search-token-pin";
      pinnedIcon.textContent = "📌";
      button.appendChild(pinnedIcon);
    }

    button.onclick = async () => {
      if (word.state === "active") {
        if (/^[A-Za-z0-9]$/.test(word.text)) {
          word.state = "inactive";
        } else {
          word.state = "pinned";
          await setTmdbIgnoreWord(word.text, true);
        }
      } else if (word.state === "pinned") {
        word.state = "inactive";
        await setTmdbIgnoreWord(word.text, false);
      } else {
        word.state = "active";
      }

      updateTmdbFilmSearchInputFromTokens();
      renderTmdbFilmSearchTokens();
      await searchTmdbFilmFromInput();
    };

    tokensContainer.appendChild(button);
  }
}

function updateTmdbFilmSearchInputFromTokens() {
  const input = document.getElementById("tmdbSearchInput");

  input.value = tmdbSearchWords
    .filter((word) => word.state === "active")
    .map((word) => word.text)
    .join(" ");
}

async function setTmdbIgnoreWord(word, ignored) {
  const response = await fetch("http://localhost:9876/set-ignore-word", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      word,
      ignored,
    }),
  });

  if (!response.ok) {
    console.error(await response.text());
  }
}

async function searchTmdbFilmFromInput() {
  const input = document.getElementById("tmdbSearchInput");
  const resultsContainer = document.getElementById("tmdbResults");
  const searchText = input.value.trim();

  if (!searchText) {
    resultsContainer.innerHTML =
      '<div class="tmdb-empty">Saisissez une recherche.</div>';
    return;
  }

  resultsContainer.innerHTML = "";

  const results = await searchTmdbFilm(searchText);

  renderTmdbFilmResults(tmdbCurrentFilm, results);
}

function renderTmdbSerieResults(serie, results) {
  const resultsContainer = document.getElementById("tmdbResults");
  resultsContainer.innerHTML = "";
  if (!results || results.length === 0) {
    resultsContainer.innerHTML =
      '<div class="tmdb-empty">Aucun résultat trouvé.</div>';
    return;
  }

  for (const result of results) {
    const card = document.createElement("article");
    card.className = "tmdb-result-card";
    const imageZone = document.createElement("div");
    if (result.image) {
      const img = document.createElement("img");
      img.src = result.image;
      img.alt = result.titre;
      imageZone.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "tmdb-result-placeholder";
      placeholder.textContent = "Sans affiche";
      imageZone.appendChild(placeholder);
    }
    const info = document.createElement("div");

    const title = document.createElement("a");
    title.className = "tmdb-result-title tmdb-result-link";
    title.textContent = result.titre;
    title.href = result.tmdbUrl;
    title.target = "_self";
    title.rel = "noopener noreferrer";

    const year = document.createElement("div");
    year.className = "tmdb-result-year";
    year.textContent = result.annee || "Année inconnue";

    const description = document.createElement("div");
    description.className = "tmdb-result-description";
    description.textContent =
      result.description || "Aucune description disponible.";
    info.appendChild(title);
    info.appendChild(year);
    info.appendChild(description);

    const button = document.createElement("button");
    button.className = "tmdb-associate-button";
    button.textContent = "Associer";
    button.onclick = () => associateTmdbSerie(serie, result);
    card.appendChild(imageZone);
    card.appendChild(info);
    card.appendChild(button);
    resultsContainer.appendChild(card);
  }
}

function renderTmdbFilmResults(film, results) {
  const resultsContainer = document.getElementById("tmdbResults");
  resultsContainer.innerHTML = "";

  if (!results || results.length === 0) {
    resultsContainer.innerHTML = `
    <div class="tmdb-no-result">
      <div>Aucun résultat trouvé.</div>
    </div>
  `;
  }

  const actionContainer = document.createElement("div");
  actionContainer.className = "tmdb-no-result";

  const button = document.createElement("button");
  button.className = "tmdb-associate-button film-file-action-button";
  button.innerHTML = '<span class="play-icon film-open-icon">🗁</span>';
  button.title = "Relancer un scan des disques en cas de modification";
  button.onclick = async () => {
    const fichiers =
      Array.isArray(film.groupFiles) && film.groupFiles.length > 0
        ? film.groupFiles
        : [film];

    for (const currentFilm of fichiers) {
      const folder = currentFilm.fichier.substring(
        0,
        currentFilm.fichier.lastIndexOf("/"),
      );

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
  };

  const label = document.createElement("span");
  label.textContent = "Relancer un scan des disques en cas de modification";

  const openRow = document.createElement("div");
  openRow.className = "tmdb-open-row";
  openRow.appendChild(button);
  openRow.appendChild(label);
  actionContainer.appendChild(openRow);
  resultsContainer.appendChild(actionContainer);

  if (!results || results.length === 0) return;

  for (const result of results) {
    const card = document.createElement("article");
    card.className = "tmdb-result-card";

    const imageZone = document.createElement("div");

    if (result.image) {
      const img = document.createElement("img");
      img.src = result.image;
      img.alt = result.titre;
      imageZone.appendChild(img);
    } else {
      const placeholder = document.createElement("div");
      placeholder.className = "tmdb-result-placeholder";
      placeholder.textContent = "Sans affiche";
      imageZone.appendChild(placeholder);
    }

    const info = document.createElement("div");

    const title = document.createElement("a");
    title.className = "tmdb-result-title tmdb-result-link";
    title.textContent = result.titre;
    title.href = result.tmdbUrl;
    title.target = "_self";
    title.rel = "noopener noreferrer";

    const year = document.createElement("div");
    year.className = "tmdb-result-year";
    year.textContent = result.annee || "Année inconnue";

    const description = document.createElement("div");
    description.className = "tmdb-result-description";
    description.textContent =
      result.description || "Aucune description disponible.";

    info.appendChild(title);
    info.appendChild(year);
    info.appendChild(description);

    const button = document.createElement("button");
    button.className = "tmdb-associate-button";
    button.textContent = "Associer";
    button.onclick = () => associateTmdbFilm(film, result);

    card.appendChild(imageZone);
    card.appendChild(info);
    card.appendChild(button);

    resultsContainer.appendChild(card);
  }
}

async function associateTmdbSerie(serie, result) {
  const response = await fetch("http://localhost:9876/associate-tmdb-serie", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      serieId: serie.id,
      titreTmdb: result.titre,
      anneeTmdb: result.annee,
      descriptionTmdb: result.description,
      tmdbId: result.tmdbId,
      tmdbUrl: result.tmdbUrl,
      image: result.image,
    }),
  });
  if (!response.ok) {
    console.error(await response.text());
    return;
  }
  serie.tmdbId = result.tmdbId;
  serie.tmdbUrl = result.tmdbUrl;
  serie.image = result.image;
  serie.titreTmdb = result.titre;
  serie.anneeTmdb = result.annee;
  serie.descriptionTmdb = result.description;
  closeTmdbModal();
  if (currentPage === "episodes" && typeof showSerieDetails === "function") {
    showSerieDetails(serie, currentSeason);
    return;
  }
  if (typeof renderSeries === "function") {
    const currentScrollY = window.scrollY;
    renderSeries();
    setTimeout(() => {
      window.scrollTo(0, currentScrollY);
    }, 0);
  }
}

async function associateTmdbFilm(film, result) {
  const detailsResponse = await fetch(
    `https://api.themoviedb.org/3/movie/${result.tmdbId}?api_key=${appConstants.tmdbApiKey}&language=fr-FR`,
  );

  const details = await detailsResponse.json();

  const genres = details.genres
    ? details.genres.map((genre) => genre.name)
    : [];

  const collectionId = details.belongs_to_collection
    ? details.belongs_to_collection.id
    : null;

  const collectionNom = details.belongs_to_collection
    ? details.belongs_to_collection.name
    : null;

  let collectionDescription = null;
  let collectionImage = null;
  let collectionTmdbUrl = null;

  if (collectionId) {
    const collectionResponse = await fetch(
      `https://api.themoviedb.org/3/collection/${collectionId}?api_key=${appConstants.tmdbApiKey}&language=fr-FR`,
    );
    if (collectionResponse.ok) {
      const collectionDetails = await collectionResponse.json();
      collectionDescription = collectionDetails.overview || null;
      collectionImage = collectionDetails.poster_path
        ? `https://image.tmdb.org/t/p/w500${collectionDetails.poster_path}`
        : null;
      collectionTmdbUrl = `https://www.themoviedb.org/collection/${collectionId}`;
    }
  }

  const dureeTmdb = details.runtime || null;

  const fichiers =
    currentPage === "films" && Array.isArray(film.groupFiles)
      ? film.groupFiles.map((item) => item.fichier)
      : [film.fichier];

  const response = await fetch("http://localhost:9876/associate-tmdb-film", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filmId: film.id,
      fichiers: fichiers,
      titreTmdb: result.titre,
      titreOriginal: result.titreOriginal,
      langueOriginale: details.original_language || null,
      anneeTmdb: result.annee,
      dureeTmdb: dureeTmdb,
      genre: genres,

      collectionId: collectionId,
      collectionNom: collectionNom,
      collectionDescription: collectionDescription,
      collectionImage: collectionImage,
      collectionTmdbUrl: collectionTmdbUrl,

      tmdbId: result.tmdbId,
      tmdbUrl: result.tmdbUrl,
      image: result.image,
      descriptionTmdb: result.description,
    }),
  });

  if (!response.ok) {
    console.error(await response.text());
    return;
  }

  film.titreTmdb = result.titre;
  film.titreOriginal = result.titreOriginal;
  film.langueOriginale = details.original_language || null;
  film.anneeTmdb = result.annee;
  film.dureeTmdb = dureeTmdb;
  film.genre = genres;

  film.collectionId = collectionId;
  film.collectionNom = collectionNom;
  film.collectionDescription = collectionDescription;
  film.collectionImage = collectionImage;
  film.collectionTmdbUrl = collectionTmdbUrl;

  film.tmdbId = result.tmdbId;
  film.tmdbUrl = result.tmdbUrl;
  film.image = result.image;
  film.descriptionTmdb = result.description;

  sessionStorage.setItem("filmsScrollY", String(window.scrollY));

  closeTmdbModal();

  if (currentPage === "film-detail") {
    window.location.reload();
    return;
  }

  if (typeof renderFilms === "function") {
    renderFilms();

    setTimeout(() => {
      const savedScrollY = Number(
        sessionStorage.getItem("filmsScrollY") || "0",
      );

      window.scrollTo(0, savedScrollY);
    }, 100);
  }
}

function closeTmdbModal() {
  document.getElementById("tmdbModal").classList.add("hidden");
}
async function searchTmdbSerie(title) {
  const response = await fetch(
    `https://api.themoviedb.org/3/search/tv?api_key=${appConstants.tmdbApiKey}&language=fr-FR&query=${encodeURIComponent(title)}`,
  );
  const data = await response.json();
  if (!data.results) {
    console.error(data);
    return [];
  }

  return data.results.map((item) => ({
    tmdbId: item.id,
    titre: item.name,
    annee: item.first_air_date ? item.first_air_date.substring(0, 4) : "",
    description: item.overview,
    image: item.poster_path
      ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
      : null,
    tmdbUrl: `https://www.themoviedb.org/tv/${item.id}`,
  }));
}

async function getTmdbSeasonEpisodes(serie, seasonNumber) {
  if (!serie.tmdbId) {
    return new Map();
  }
  const response = await fetch(
    `https://api.themoviedb.org/3/tv/${serie.tmdbId}/season/${seasonNumber}?api_key=${appConstants.tmdbApiKey}&language=fr-FR`,
  );
  const data = await response.json();
  if (!data.episodes) {
    console.error(data);
    return new Map();
  }
  const episodes = new Map();
  for (const item of data.episodes) {
    episodes.set(item.episode_number, {
      titre: item.name || "",
      description: item.overview || "",
      image: item.still_path
        ? `https://image.tmdb.org/t/p/w300${item.still_path}`
        : null,
      dateDiffusion: item.air_date || "",
      duree: item.runtime || "",
      tmdbUrl: `https://www.themoviedb.org/tv/${serie.tmdbId}/season/${seasonNumber}/episode/${item.episode_number}`,
    });
  }
  return episodes;
}

async function searchTmdbFilm(title) {
  const response = await fetch(
    `https://api.themoviedb.org/3/search/movie?api_key=${appConstants.tmdbApiKey}&language=fr-FR&query=${encodeURIComponent(title)}`,
  );

  const data = await response.json();

  if (!data.results) {
    console.error(data);
    return [];
  }

  return data.results.map((item) => ({
    tmdbId: item.id,
    titre: item.title,
    titreOriginal: item.original_title,
    annee: item.release_date ? item.release_date.substring(0, 4) : "",
    description: item.overview,
    image: item.poster_path
      ? `https://image.tmdb.org/t/p/w342${item.poster_path}`
      : null,
    tmdbUrl: `https://www.themoviedb.org/movie/${item.id}`,
  }));
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const modal = document.getElementById("tmdbModal");

    if (!modal.classList.contains("hidden")) {
      closeTmdbModal();
    }
  }
});
