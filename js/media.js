function createPosterContent(imagePath, title, seed) {
  if (imagePath && isWebSafeImagePath(imagePath)) {
    const img = document.createElement("img");
    img.src = imagePath;
    img.alt = title;
    img.onerror = () => {
      const fallback = createMissingPoster(title);
      img.replaceWith(fallback);
    };
    return img;
  }
  return createMissingPoster(title);
}
function createMissingPoster(seed) {
  const div = document.createElement("div");
  div.className = "missing-poster";
  div.style.background =
    "linear-gradient(135deg, #1b3045 0%, #20364c 30%, #233b54 60%, #284060 100%)";
  const text = document.createElement("span");
  text.textContent = seed;
  div.appendChild(text);
  return div;
}
function isWebSafeImagePath(imagePath) {
  if (!imagePath) {
    return false;
  }
  if (imagePath.startsWith("http://") || imagePath.startsWith("https://")) {
    return true;
  }
  if (
    imagePath.startsWith("img/") ||
    imagePath.startsWith("./img/") ||
    imagePath.startsWith("images/")
  ) {
    return true;
  }
  return false;
}

function getFilmBorderClasses(files) {
  let hasHigh = false;
  let hasMedium = false;
  let hasLow = false;
  let hasFiles = false;
  let needsLanguageCheck = false;
  for (const file of files) {
    const languages = Array.isArray(file.langue)
      ? file.langue
      : [file.langue || "TBD"];
    const hasTbd = languages.includes("TBD");
    const hasVo = languages.includes("VO");
    const hasVf = languages.includes("VF");
    const originalLanguage = file.langueOriginale?.toLowerCase();
    if (
      file.fichier &&
      (hasTbd ||
        !originalLanguage ||
        (originalLanguage === "fr" && !hasVf) ||
        (originalLanguage !== "fr" && (!hasVo || !hasVf)))
    ) {
      needsLanguageCheck = true;
    }
    const width = file.technique?.largeur;
    if (width !== undefined && width !== null) {
      hasFiles = true;
      if (width >= 1920) {
        hasHigh = true;
      } else if (width >= 960) {
        hasMedium = true;
      } else {
        hasLow = true;
      }
    }
  }
  const classes = [];
  if (!hasFiles) {
    classes.push("quality-none");
  } else if (hasLow && hasMedium && hasHigh) {
    classes.push("quality-full-range");
  } else if (hasLow && hasHigh) {
    classes.push("quality-low-high");
  } else if (hasLow && hasMedium) {
    classes.push("quality-low-medium");
  } else if (hasMedium && hasHigh) {
    classes.push("quality-medium-high");
  } else if (hasLow) {
    classes.push("quality-low");
  } else if (hasMedium) {
    classes.push("quality-medium");
  } else if (hasHigh) {
    classes.push("quality-high");
  } else {
    classes.push("quality-none");
  }
  if (needsLanguageCheck) {
    classes.push("language-check");
  }
  return classes;
}
