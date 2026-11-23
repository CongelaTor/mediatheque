(function (global) {
  function formatFilmLanguages(languages) {
    const order = ["VO", "VF", "VOST", "VOSTFR"];
    const values = Array.isArray(languages)
      ? [...languages]
      : [languages || "TBD"];
    return values
      .sort((a, b) => {
        const indexA = order.indexOf(a);
        const indexB = order.indexOf(b);
        return (
          (indexA === -1 ? order.length : indexA) -
          (indexB === -1 ? order.length : indexB)
        );
      })
      .join(" ");
  }
  function getNormalizedFilmFileName(film) {
    const extensionIndex = film.nomFichier.lastIndexOf(".");
    const extension =
      extensionIndex >= 0 ? film.nomFichier.substring(extensionIndex) : "";
    const title = (film.titreTmdb || film.titre || "")
      .replace(/[\\/:*?"<>|]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const year = film.anneeTmdb || film.annee || "";
    const languages = formatFilmLanguages(film.langue).replaceAll(" ", "_");
    const parts =
      film.collectionNom && !film.ignoreInCollection
        ? [year, title, languages]
        : [title, year, languages];
    return parts.filter(Boolean).join("_") + extension;
  }
  function sanitizeFolderName(value) {
    return String(value || "")
      .replace(/[<>:"/\\|?*]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/[. ]+$/g, "");
  }
  function getNormalizedFilmPath(film) {
    const isMarvel =
      String(film.studio || "")
        .trim()
        .toLowerCase() === "marvel";
    const filmType = String(film.type || "")
      .trim()
      .toLowerCase();
    const isAnimation = filmType === "animation";
    const isAnime = filmType === "anime";
    const isSpectacle = filmType === "spectacle";
    const genres = Array.isArray(film.genre)
      ? film.genre.filter(Boolean)
      : film.genre
        ? [film.genre]
        : [];
    if (
      !isMarvel &&
      !isAnimation &&
      !isAnime &&
      !isSpectacle &&
      genres.length !== 1
    ) {
      return null;
    }
    const destinationCategory = isMarvel
      ? "Marvel"
      : isAnimation
        ? "Animation"
        : isAnime
          ? "Anime"
          : isSpectacle
            ? "Spectacle"
            : sanitizeFolderName(genres[0]);
            
    const collectionName = sanitizeFolderName(
      String(film.collectionNom || "").replace(/\s*-\s*saga\s*$/i, ""),
    );
    const filmsRootName = String(film.fichier || "").split("/")[1];
    if (!filmsRootName || !destinationCategory) {
      return null;
    }
    const fileName = getNormalizedFilmFileName(film);
    return collectionName
      ? `/${filmsRootName}/${destinationCategory}/${collectionName}/${fileName}`
      : `/${filmsRootName}/${destinationCategory}/${fileName}`;
  }
  const filmNormalization = {
    formatFilmLanguages,
    getNormalizedFilmFileName,
    getNormalizedFilmPath,
  };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = filmNormalization;
  }
  global.filmNormalization = filmNormalization;
})(typeof window !== "undefined" ? window : globalThis);
