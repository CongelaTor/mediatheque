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
  const filmNormalization = {
    formatFilmLanguages,
    getNormalizedFilmFileName,
  };
  if (typeof module !== "undefined" && module.exports) {
    module.exports = filmNormalization;
  }
  global.filmNormalization = filmNormalization;
})(typeof window !== "undefined" ? window : globalThis);