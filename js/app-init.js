// Menu actif
function initActiveMenu() {
  let activeMenu = document.body.dataset.activeMenu;
  console.log("activeMenu = ", activeMenu);
  if (!activeMenu) {
    activeMenu = isCollectionContextActive() ? "collections" : "films";
  }
  console.log("activeMenu2 = ", activeMenu);
  document.querySelectorAll(".nav-button.active").forEach((button) => {
    button.classList.remove("active");
  });
  document
    .querySelector(`.nav-button[data-page="${activeMenu}"]`)
    ?.classList.add("active");
}

// Navigation menu actif
const topbarContainer = document.getElementById("topbarContainer");
if (topbarContainer) {
  const topbarObserver = new MutationObserver(() => {
    if (topbarContainer.querySelector(".nav-button")) {
      topbarObserver.disconnect();
      initActiveMenu();
    }
  });
  topbarObserver.observe(topbarContainer, {
    childList: true,
    subtree: true,
  });
}

// Taille de la police dans l'application
const savedFontScale = localStorage.getItem("fontScale");
if (savedFontScale) {
  document.documentElement.style.setProperty("--font-scale", savedFontScale);
}

async function initHomePage() {
  await loadCatalog();
  updateStats();
  updateUserGreeting();
  await isMediaServerAvailable();

  const context = calculContext.calculateContext({
    mediaServerAvailable,
  });
  console.log("context =", context);

  const scanButton = document.querySelector(".refresh-button");
  scanButton.classList.toggle("hidden", !context.permissions.canScan);

  const resumeFilmButton = document.getElementById("resumeFilmButton");
  resumeFilmButton.classList.toggle("hidden", !context.permissions.canPlay);

  const resumeSerieButton = document.getElementById("resumeSerieButton");
  resumeSerieButton.classList.toggle("hidden", !context.permissions.canPlay);

  initResumeButtons();
  updateResumeButtons();
}

function initSidebarToggle() {
  if (
    window.location.pathname.endsWith("index.html") ||
    window.location.pathname === "/"
  ) {
    return;
  }

  if (localStorage.getItem("sidebarHidden") === "true") {
    document.body.classList.add("sidebar-hidden");
  }

  document.querySelector(".brand")?.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-hidden");
    localStorage.setItem(
      "sidebarHidden",
      document.body.classList.contains("sidebar-hidden"),
    );
  });
}

//--------------------------
// ZOOM TEXTE MOLETTE SOURIS
//--------------------------
let fontZoomActive = false;
const fontZoomButton = document.getElementById("fontZoomButton");
if (fontZoomButton) {
  fontZoomButton.addEventListener("mouseenter", () => {
    fontZoomActive = true;
  });
  fontZoomButton.addEventListener("mouseleave", () => {
    fontZoomActive = false;
  });

  window.addEventListener(
    "wheel",
    (event) => {
      if (!fontZoomActive) {
        return;
      }
      event.preventDefault();

      const root = document.documentElement;
      let scale =
        parseFloat(getComputedStyle(root).getPropertyValue("--font-scale")) ||
        1;
      if (event.deltaY < 0) {
        scale += 0.1;
      } else {
        scale -= 0.1;
      }
      scale = Math.max(0.7, Math.min(3, scale));
      root.style.setProperty("--font-scale", scale);
      root.style.setProperty("--font-scale", scale);
      localStorage.setItem("fontScale", scale);
    },
    { passive: false },
  );
}
