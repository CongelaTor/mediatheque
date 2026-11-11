const scanType = process.argv[2] || "all";
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const mediathequeRoot = path.join(__dirname, "..");
const mediaServerDir = "Z:\\01_mediaServer";

const configPath = path.join(mediaServerDir, "config", "config.json");
const ignoreWordsPath = path.join(mediaServerDir, "config", "ignoreWords.json");
const languageAliasesPath = path.join(
  mediaServerDir,
  "config",
  "languageAliases.json",
);

const jsonCatalogPath = path.join(mediathequeRoot, "data", "catalog.json");

const config = readJson(configPath);
const ignoreWordsConfig = readJson(ignoreWordsPath);
const languageAliases = readJson(languageAliasesPath);
const existingCatalog = readJson(jsonCatalogPath);

normalizeIgnoreWordsConfig(ignoreWordsConfig);
writeJson(ignoreWordsPath, ignoreWordsConfig);

const existingFilmByPath = buildExistingFilmByPath(existingCatalog);
const existingFilmsByName = buildExistingFilmsByName(existingCatalog);
const existingEpisodeByPath = buildExistingEpisodeByPath(existingCatalog);
const existingSerieByKey = buildExistingSerieByKey(existingCatalog);

// --------------------------------------
//  conserver la partie du catalog qui n'est pas rescannée
// --------------------------------------
const syncedCatalog = {
  version: existingCatalog.version || 1,
  dateDernierScan: null,
  collections: [...(existingCatalog.collections || [])],
  films:
    scanType === "series"
      ? [...(existingCatalog.films || [])]
      : (existingCatalog.films || []).filter((film) => !film.fichier),
  series: scanType === "films" ? [...(existingCatalog.series || [])] : [],
};

let totalVideos = 0;
let totalNewFilms = 0;
let totalNewEpisodes = 0;
let totalKeptFilms = 0;
let totalKeptEpisodes = 0;

const scanSources = process.env.MEDIA_SCAN_SOURCES
  ? JSON.parse(process.env.MEDIA_SCAN_SOURCES)
  : config.sources;
syncedCatalog.stockage = getStorageInfo(scanSources);
// console.log("config.sources =", config.sources);
console.log("scanSources =", scanSources);
const sourcesToScan = scanSources.filter((source) => {
  if (scanType === "all") {
    return true;
  }
  return source.type === scanType.slice(0, -1);
});

// Parcours des disques
for (const source of sourcesToScan) {
  for (const sourcePath of source.paths) {
    console.log("");
    console.log(`Scan de : ${sourcePath}`);

    if (!fs.existsSync(sourcePath)) {
      console.log(`Dossier introuvable : ${sourcePath}`);
      continue;
    }
    const fichiers = scanDirectory(sourcePath, config.extensions);
    console.log(`${fichiers.length} vidéo(s) trouvée(s)`);
    totalVideos += fichiers.length;
    for (const fichier of fichiers) {
      const analyse = analyzeVideoFile(fichier, {
        ...source,
        path: sourcePath,
      });
      if (analyse.type === "film") {
        analyse.technique = extractVideoMetadata(
          probeVideoFile(fichier.fichier),
        );
        const result = syncFilm(syncedCatalog, analyse);
        if (result === "new") {
          totalNewFilms++;
        }
        if (result === "kept") {
          totalKeptFilms++;
        }
      } else if (analyse.type === "serie") {
        const result = syncEpisode(syncedCatalog, analyse);
        if (result === "new") {
          totalNewEpisodes++;
        }
        if (result === "kept") {
          totalKeptEpisodes++;
        }
      }
    }
  }
}

removeEmptySeries(syncedCatalog);
recomputeDuplicates(syncedCatalog);
sortCatalog(syncedCatalog);
syncedCatalog.dateDernierScan = new Date().toISOString();
writeJson(jsonCatalogPath, syncedCatalog);
function logStat(label, value) {
  console.log(`${label.padEnd(29)} : ${value}`);
}
console.log("");
if (scanType === "films") {
  logStat("Vidéos analysées", totalVideos);
  console.log("");
  logStat("Fichiers de film ajoutés", totalNewFilms);
  logStat("Fichiers de film conservés", totalKeptFilms);
  logStat("Fichiers de film au catalogue", syncedCatalog.films.length);
  console.log("");
} else if (scanType === "series") {
  logStat("Vidéos analysées", totalVideos);
  console.log("");
  logStat("Épisodes ajoutés", totalNewEpisodes);
  logStat("Épisodes conservés", totalKeptEpisodes);
  logStat("Séries au catalogue", syncedCatalog.series.length);
  console.log("");
} else {
  logStat("Vidéos analysées", totalVideos);
  console.log("");
  logStat("Fichiers de film ajoutés", totalNewFilms);
  logStat("Fichiers de film conservés", totalKeptFilms);
  logStat("Fichiers de film au catalogue", syncedCatalog.films.length);
  console.log("");
  logStat("Épisodes ajoutés", totalNewEpisodes);
  logStat("Épisodes conservés", totalKeptEpisodes);
  logStat("Séries au catalogue", syncedCatalog.series.length);
  console.log("");
}
console.log("Catalogue synchronisé.");

function getStorageInfo(sources) {
  const storageByRoot = new Map();
  for (const source of sources) {
    for (const sourcePath of source.paths || []) {
      if (!fs.existsSync(sourcePath)) {
        continue;
      }
      const root = path.parse(sourcePath).root;
      const rootKey = root.toLowerCase();
      if (storageByRoot.has(rootKey)) {
        continue;
      }
      const stats = fs.statfsSync(sourcePath);
      storageByRoot.set(rootKey, {
        lecteur: root.replace(/[\\/:]+$/, ""),
        espaceLibre: stats.bavail * stats.bsize,
        capaciteTotale: stats.blocks * stats.bsize,
      });
    }
  }
  return [...storageByRoot.values()].sort((a, b) =>
    a.lecteur.localeCompare(b.lecteur, "fr"),
  );
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 4), "utf8");
}
function normalizeIgnoreWordsConfig(ignoreWordsConfig) {
  ignoreWordsConfig.ignoreWords = normalizeList(
    ignoreWordsConfig.ignoreWords || [],
  );
  ignoreWordsConfig.patterns = normalizeList(ignoreWordsConfig.patterns || []);
}
function normalizeList(list) {
  return [
    ...new Set(
      list
        .map((item) => item.toUpperCase().trim())
        .filter((item) => item.length > 0),
    ),
  ].sort();
}

function buildExistingFilmByPath(catalog) {
  const map = new Map();
  for (const film of catalog.films || []) {
    if (film.fichier) {
      map.set(pathKey(film.fichier.replace(/^[A-Z]:/i, "")), film);
    }
  }
  return map;
}

function buildExistingFilmsByName(catalog) {
  const map = new Map();
  for (const film of catalog.films || []) {
    if (!film.nomFichier || !film.fichier) {
      continue;
    }
    const key = film.nomFichier.toLowerCase();
    if (!map.has(key)) {
      map.set(key, []);
    }
    map.get(key).push(film);
  }
  return map;
}

function buildExistingEpisodeByPath(catalog) {
  const map = new Map();
  for (const serie of catalog.series || []) {
    for (const saison of serie.saisons || []) {
      for (const episode of saison.episodes || []) {
        if (episode.fichier) {
          map.set(pathKey(episode.fichier), episode);
        }
      }
    }
  }
  return map;
}
function buildExistingSerieByKey(catalog) {
  const map = new Map();
  for (const serie of catalog.series || []) {
    map.set(normalizeKey(serie.titre), serie);
  }
  return map;
}

function buildCatalogPath(fullPath) {
  const normalizedFullPath = fullPath.replaceAll("\\", "/");
  if (!buildCatalogPath.logCount) {
    buildCatalogPath.logCount = 0;
  }
  for (const source of scanSources)
    for (const sourcePath of source.paths) {
      const normalizedSourcePath = sourcePath.replaceAll("\\", "/");
      if (buildCatalogPath.logCount < 3) {
        buildCatalogPath.logCount++;
      }

      if (normalizedFullPath.startsWith(`${normalizedSourcePath}/`)) {
        const rootName = normalizedSourcePath.split("/").pop();

        if (buildCatalogPath.logCount < 3) {
          // console.log("rootName =", rootName);
          const catalogPath = `/${rootName}${normalizedFullPath.substring(normalizedSourcePath.length)}`;
          // console.log("catalogPath =", catalogPath);
        }
        return `/${rootName}${normalizedFullPath.substring(normalizedSourcePath.length)}`;
      }
    }
  return normalizedFullPath;
}

function scanDirectory(directory, extensions, results = []) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      scanDirectory(fullPath, extensions, results);
    } else {
      const extension = path.extname(entry.name).toLowerCase();
      if (extensions.includes(extension)) {
        results.push({
          fichier: fullPath,
          nom: entry.name,
          taille: fs.statSync(fullPath).size,
        });
      }
    }
  }
  return results;
}
function probeVideoFile(filePath) {
  try {
    const output = execFileSync(
      "ffprobe",
      ["-v", "error", "-show_format", "-show_streams", "-of", "json", filePath],
      {
        encoding: "utf8",
        windowsHide: true,
      },
    );
    return JSON.parse(output);
  } catch (error) {
    console.log(`FFprobe impossible : ${filePath}`);
    return null;
  }
}
function extractVideoMetadata(probe) {
  if (!probe) {
    return null;
  }
  const video = probe.streams?.find((stream) => stream.codec_type === "video");
  const audioStreams =
    probe.streams?.filter((stream) => stream.codec_type === "audio") || [];
  const subtitleStreams =
    probe.streams?.filter((stream) => stream.codec_type === "subtitle") || [];
  const width = Number(video?.width) || null;
  const height = Number(video?.height) || null;
  const frameRateParts = video?.avg_frame_rate?.split("/") || [];
  const frameRate =
    frameRateParts.length === 2 && Number(frameRateParts[1])
      ? Number(frameRateParts[0]) / Number(frameRateParts[1])
      : null;
  return {
    largeur: width,
    hauteur: height,
    resolution: width && height ? `${width}x${height}` : null,
    ratioImage: width && height ? Number((width / height).toFixed(3)) : null,
    codecVideo: video?.codec_name || null,
    profilVideo: video?.profile || null,
    pixelFormat: video?.pix_fmt || null,
    bitsParComposante: Number(video?.bits_per_raw_sample) || null,
    bitrateVideo: Number(video?.bit_rate) || null,
    framerate: frameRate ? Number(frameRate.toFixed(3)) : null,
    espaceCouleur: video?.color_space || null,
    transfertCouleur: video?.color_transfer || null,
    primairesCouleur: video?.color_primaries || null,
    hdr:
      video?.color_transfer === "smpte2084" ||
      video?.color_transfer === "arib-std-b67",
    dureeFichier: Number(probe.format?.duration) || null,
    bitrateGlobal: Number(probe.format?.bit_rate) || null,
    formatConteneur: probe.format?.format_name || null,
    audio: audioStreams.map((audio) => ({
      codec: audio.codec_name || null,
      profil: audio.profile || null,
      canaux: Number(audio.channels) || null,
      disposition: audio.channel_layout || null,
      bitrate: Number(audio.bit_rate) || null,
      frequence: Number(audio.sample_rate) || null,
      langue: audio.tags?.language || audio.tags?.LANGUAGE || null,
    })),
    sousTitres: subtitleStreams.map((subtitle) => ({
      codec: subtitle.codec_name || null,
      langue: subtitle.tags?.language || subtitle.tags?.LANGUAGE || null,
      titre: subtitle.tags?.title || null,
    })),
  };
}

function analyzeVideoFile(fichier, source) {
  const nomSansExtension = path.parse(fichier.nom).name;
  const episodeInfo = detectEpisode(nomSansExtension);
  const annee = detectYear(nomSansExtension);
  const langue = detectLanguage(fichier.fichier);
  let titreBrut = nomSansExtension;
  if (source.type === "serie") {
    titreBrut =
      getSeriesTitleFromPath(fichier.fichier, source.path) || nomSansExtension;
  } else if (source.type === "film" && annee) {
    titreBrut = nomSansExtension.replace(String(annee), " ");
  }
  const titre = cleanTitle(titreBrut);

  return {
    type: source.type,
    id: buildId(titre, annee),
    titre: titre,
    annee: annee,
    langue: langue,
    saison: episodeInfo ? episodeInfo.saison : null,
    episode: episodeInfo ? episodeInfo.episode : null,
    nomFichier: fichier.nom,
    fichier: buildCatalogPath(fichier.fichier),
    taille: fichier.taille,
    image: findAssociatedImage(fichier.fichier),
  };
}
function getSeriesTitleFromPath(videoPath, sourcePath) {
  const directory = path.dirname(videoPath);
  const relativePath = path.relative(sourcePath, directory);
  const parts = relativePath
    .split(path.sep)
    .filter((part) => part && part !== ".");
  for (const part of parts) {
    if (isSeriesTechnicalFolder(part)) {
      continue;
    }
    return part;
  }
  return null;
}
function isSeriesTechnicalFolder(value) {
  const normalized = cleanTitle(value).toUpperCase();
  if (["VO", "VF", "VOST", "VOSTFR"].includes(normalized)) {
    return true;
  }
  if (/^S\d{1,2}/i.test(normalized)) {
    return true;
  }
  if (/^SAISON\s+\d+/i.test(normalized)) {
    return true;
  }
  return false;
}
function detectLanguage(filePath) {
  const upperPath = filePath.toUpperCase();

  for (const [keyword, languages] of Object.entries(languageAliases)) {
    const regex = new RegExp(`(^|[^A-Z0-9])${keyword}([^A-Z0-9]|$)`);

    if (regex.test(upperPath)) {
      return languages;
    }
  }
  return ["TBD"];
}
function detectYear(value) {
  const matchAnnee = value.match(/\b(19|20)\d{2}\b/);
  if (!matchAnnee) {
    return null;
  }
  return parseInt(matchAnnee[0], 10);
}
function detectEpisode(value) {
  const matchSxxExx = value.match(/S(\d{2})E(\d{2})/i);
  if (matchSxxExx) {
    return {
      pattern: matchSxxExx[0],
      index: matchSxxExx.index,
      saison: parseInt(matchSxxExx[1], 10),
      episode: parseInt(matchSxxExx[2], 10),
    };
  }
  const matchX = value.match(/(\d)x(\d{2})/i);
  if (matchX) {
    return {
      pattern: matchX[0],
      index: matchX.index,
      saison: parseInt(matchX[1], 10),
      episode: parseInt(matchX[2], 10),
    };
  }
  const match3Digits = value.match(/\b([1-9])(\d{2})\b/);
  if (match3Digits) {
    return {
      pattern: match3Digits[0],
      index: match3Digits.index,
      saison: parseInt(match3Digits[1], 10),
      episode: parseInt(match3Digits[2], 10),
    };
  }
  return null;
}
function cleanTitle(value) {
  value = value
    .replace(/\[[^\]]*\]/g, " ")
    .replace(/^\d+\s+(.+)$/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
  const words = cleanSeparators(value)
    .split(" ")
    .filter((word) => word.trim().length > 0);

  const cleanedWords = [];
  for (const word of words) {
    const upperWord = word.toUpperCase();
    if (ignoreWordsConfig.ignoreWords.includes(upperWord)) {
      continue;
    }
    if (wordMatchesPattern(upperWord, ignoreWordsConfig.patterns)) {
      continue;
    }
    cleanedWords.push(word);
  }
  return cleanedWords.join(" ").trim();
}
function cleanSeparators(value) {
  return value.replace(/[._-]/g, " ").replace(/\s+/g, " ").trim();
}
function wordMatchesPattern(word, patterns) {
  for (const pattern of patterns) {
    const regex = patternToRegex(pattern);
    if (regex.test(word)) {
      return true;
    }
  }
  return false;
}
function patternToRegex(pattern) {
  const escapedPattern = pattern
    .replace(/[.*+^${}()|[\]\\]/g, "\\$&")
    .replace(/\?/g, ".");
  return new RegExp(`^${escapedPattern}$`, "i");
}
function buildId(titre, annee) {
  let base = removeAccents(titre)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (annee) {
    base += "_" + annee;
  }
  return base;
}
function removeAccents(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}
function findAssociatedImage(videoPath) {
  const directory = path.dirname(videoPath);
  const baseName = path.parse(videoPath).name;
  for (const extension of config.imageExtensions) {
    const imagePath = path.join(directory, baseName + extension);
    if (fs.existsSync(imagePath)) {
      return imagePath;
    }
  }
  return null;
}
function syncFilm(catalog, analyse) {
  let existing = existingFilmByPath.get(
    pathKey(analyse.fichier.replace(/^[A-Z]:/i, "")),
  );
  if (!existing && analyse.nomFichier) {
    const sameNameFilms =
      existingFilmsByName.get(analyse.nomFichier.toLowerCase()) || [];
    const sameFile = sameNameFilms.find(
      (film) => Number(film.taille) === Number(analyse.taille),
    );
    if (sameFile) {
      existing = sameFile;
    }
  }
  if (existing) {
    catalog.films.push({
      ...existing,
      fichier: analyse.fichier,
      technique: analyse.technique,
    });
    return "kept";
  }

  catalog.films.push({
    id: analyse.id,
    titre: analyse.titre,
    annee: analyse.annee,
    langue: analyse.langue,
    taille: analyse.taille,
    genre: null,
    image: analyse.image,
    fichier: analyse.fichier,
    nomFichier: analyse.nomFichier,

    imdbId: null,
    tmdbId: null,
    tmdbUrl: null,
    doublonExact: false,
    doublonProbable: false,
    groupeDoublon: null,
    dateAjout: new Date().toISOString(),

    technique: analyse.technique,
  });
  return "new";
}

function syncEpisode(catalog, analyse) {
  if (!analyse.saison || !analyse.episode) {
    return false;
  }
  const serieKey = normalizeKey(analyse.titre);
  let serie = catalog.series.find(
    (item) => normalizeKey(item.titre) === serieKey,
  );
  if (!serie) {
    const existingSerie = existingSerieByKey.get(serieKey);
    if (existingSerie) {
      const { saisons, ...serieMetadata } = existingSerie;
      serie = {
        ...serieMetadata,
        id: existingSerie.id || buildId(analyse.titre, null),
        titre: existingSerie.titre || analyse.titre,
        saisons: [],
      };
    } else {
      serie = {
        id: buildId(analyse.titre, null),
        titre: analyse.titre,
        image: null,
        imdbId: null,
        tmdbId: null,
        tmdbUrl: null,
        saisons: [],
        dateAjout: new Date().toISOString(),
      };
    }
    catalog.series.push(serie);
  }
  let saison = serie.saisons.find((item) => item.numero === analyse.saison);
  if (!saison) {
    saison = {
      numero: analyse.saison,
      episodes: [],
    };
    serie.saisons.push(saison);
  }
  const existing = existingEpisodeByPath.get(pathKey(analyse.fichier));
  if (existing) {
    saison.episodes.push({
      ...existing,
      numero: analyse.episode,

      langue: analyse.langue,
      // langue: existing.langue ?? analyse.langue,

      fichier: analyse.fichier,
      nomFichier: analyse.nomFichier,
      taille: analyse.taille,
    });
    return "kept";
  }
  saison.episodes.push({
    numero: analyse.episode,
    langue: analyse.langue,
    fichier: analyse.fichier,
    nomFichier: analyse.nomFichier,
    taille: analyse.taille,
    doublonExact: false,
    doublonProbable: false,
    dateAjout: new Date().toISOString(),
  });
  return "new";
}
function removeEmptySeries(catalog) {
  catalog.series = catalog.series.filter((serie) => {
    serie.saisons = serie.saisons.filter(
      (saison) => saison.episodes.length > 0,
    );
    return serie.saisons.length > 0;
  });
}
function recomputeDuplicates(catalog) {
  for (const film of catalog.films) {
    film.doublonExact = false;
    film.doublonProbable = false;
    film.groupeDoublon = null;
  }
  for (let index = 0; index < catalog.films.length; index++) {
    for (
      let compareIndex = index + 1;
      compareIndex < catalog.films.length;
      compareIndex++
    ) {
      const film = catalog.films[index];
      const other = catalog.films[compareIndex];
      const sameFileName =
        film.nomFichier &&
        other.nomFichier &&
        film.nomFichier.toLowerCase() === other.nomFichier.toLowerCase();
      const sameSize = film.taille === other.taille;
      const sameTitle = normalizeKey(film.titre) === normalizeKey(other.titre);
      const sameYear =
        film.annee === other.annee ||
        film.annee === null ||
        other.annee === null;
      const sameTmdbGroup =
        film.tmdbId && other.tmdbId
          ? film.tmdbId === other.tmdbId
          : !film.tmdbId && !other.tmdbId && sameTitle && sameYear;

      if (sameFileName && sameSize && sameTmdbGroup) {
        film.doublonExact = true;
        other.doublonExact = true;
      }
      if (sameTitle && sameYear && sameTmdbGroup) {
        const group = normalizeKey(film.titre);
        film.doublonProbable = true;
        other.doublonProbable = true;
        film.groupeDoublon = group;
        other.groupeDoublon = group;
      }
    }
  }
  for (const serie of catalog.series) {
    for (const saison of serie.saisons) {
      for (const episode of saison.episodes) {
        episode.doublonExact = false;
        episode.doublonProbable = false;
      }
    }
    const allEpisodes = [];
    for (const saison of serie.saisons) {
      for (const episode of saison.episodes) {
        allEpisodes.push({ saison, episode });
      }
    }
    for (let index = 0; index < allEpisodes.length; index++) {
      for (
        let compareIndex = index + 1;
        compareIndex < allEpisodes.length;
        compareIndex++
      ) {
        const current = allEpisodes[index];
        const other = allEpisodes[compareIndex];
        const sameFileName =
          current.episode.nomFichier &&
          other.episode.nomFichier &&
          current.episode.nomFichier.toLowerCase() ===
            other.episode.nomFichier.toLowerCase();
        const sameSize = current.episode.taille === other.episode.taille;
        const sameEpisode =
          current.saison.numero === other.saison.numero &&
          current.episode.numero === other.episode.numero;
        if (sameFileName && sameSize) {
          current.episode.doublonExact = true;
          other.episode.doublonExact = true;
        }
        if (sameEpisode) {
          current.episode.doublonProbable = true;
          other.episode.doublonProbable = true;
        }
      }
    }
  }
}
function sortCatalog(catalog) {
  catalog.films.sort((a, b) => a.titre.localeCompare(b.titre, "fr"));
  catalog.series.sort((a, b) => a.titre.localeCompare(b.titre, "fr"));
  for (const serie of catalog.series) {
    serie.saisons.sort((a, b) => a.numero - b.numero);
    for (const saison of serie.saisons) {
      saison.episodes.sort((a, b) => a.numero - b.numero);
    }
  }
}
function normalizeKey(value) {
  return removeAccents(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}
function pathKey(value) {
  return path.normalize(value).toLowerCase();
}
function samePath(path1, path2) {
  return pathKey(path1) === pathKey(path2);
}
