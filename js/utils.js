window.isWebContainer = typeof window.flutterTest === "function";
console.log("isWebContainer =", window.isWebContainer);
console.log("flutterTest =", typeof window.flutterTest);

let mediaServerAvailable =
  window.location.hostname !== "congelator.github.io" &&
  sessionStorage.getItem("mediaServerAvailable") === "true";

document.body.classList.add(
  mediaServerAvailable ? "mediaserver" : "no-mediaserver",
);

async function isMediaServerAvailable() {
  try {
    const response = await fetch("http://localhost:9876/get-resume-playback", {
      method: "POST",
    });

    mediaServerAvailable = response.ok;
    sessionStorage.setItem("mediaServerAvailable", mediaServerAvailable);
    document.body.classList.add("mediaserver");
    document.body.classList.remove("no-mediaserver");
    return mediaServerAvailable;
  } catch {
    mediaServerAvailable = false;
    sessionStorage.setItem("mediaServerAvailable", mediaServerAvailable);
    document.body.classList.add("no-mediaserver");
    document.body.classList.remove("mediaserver");
    return false;
  }
}

console.log("sessionStorage =", sessionStorage.getItem("mediaServerAvailable"));
isMediaServerAvailable();

function handleSearch() {
  const input = document.getElementById("searchInput");
  currentSearch = input ? input.value.trim().toLowerCase() : "";

  if (
    currentPage === "collections" &&
    typeof renderCollections === "function"
  ) {
    saveSidebarFiltersState();
    saveSearchText();
    renderCollections();
  }

  if (currentPage === "films" && typeof renderFilms === "function") {
    saveSidebarFiltersState();
    saveSearchText();
    renderFilms();
  }

  if (currentPage === "tools" && typeof renderTools === "function") {
    saveSidebarFiltersState();
    saveSearchText();
    renderTools();
  }

  if (currentPage === "series" && typeof renderSeries === "function") {
    saveSidebarFiltersState();
    saveSearchText();
    renderSeries();
  }
}

function matchesSearch(value) {
  if (!currentSearch) {
    return true;
  }
  return value.toLowerCase().includes(currentSearch);
}
function setText(id, value) {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = value;
  }
}
function formatNumber(value) {
  return String(value).padStart(2, "0");
}
function hashCode(value) {
  let hash = 0;
  for (let index = 0; index < value.length; index++) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return hash;
}

function formatFrenchDate(value) {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function showToast(message, type = "success") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add("visible");
  });

  setTimeout(() => {
    toast.classList.remove("visible");

    setTimeout(() => {
      toast.remove();
    }, 200);
  }, 1500);
}

function showUserPrompt() {
  const currentName = localStorage.getItem("demandeur") || "";
  const demandeur = prompt("Prénom :", currentName);
  if (demandeur === null) {
    return;
  }
  localStorage.setItem("demandeur", demandeur.trim());
  updateUserGreeting();
}

function updateUserGreeting() {
  const demandeur = localStorage.getItem("demandeur");
  const greeting = document.getElementById("userGreeting");
  const button = document.getElementById("userButton");
  if (!greeting || !button) {
    return;
  }
  if (demandeur) {
    button.textContent = demandeur.charAt(0).toUpperCase();
  } else {
    button.textContent = "?";
  }
  if (demandeur && document.body.dataset.activeMenu === "accueil") {
    greeting.textContent = `Bonjour ${demandeur}`;
    greeting.classList.remove("hidden");
  } else {
    greeting.classList.add("hidden");
  }
}
