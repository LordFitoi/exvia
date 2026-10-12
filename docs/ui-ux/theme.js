// Theme switcher for the style guide: cycles system -> light -> dark.
const THEMES = ["system", "light", "dark"];
const STORAGE_KEY = "exvia-guide-theme";

function readStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) || "system";
  } catch {
    return "system";
  }
}

function applyTheme(theme, button) {
  if (theme === "system") {
    document.documentElement.removeAttribute("data-theme");
  } else {
    document.documentElement.dataset.theme = theme;
  }
  button.textContent = `Theme: ${theme}`;
}

function handleThemeClick(event) {
  const button = event.currentTarget;
  const next = THEMES[(THEMES.indexOf(readStoredTheme()) + 1) % THEMES.length];
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    // Storage can be blocked (private mode); the theme still applies for this view.
  }
  applyTheme(next, button);
}

const themeButton = document.getElementById("theme-toggle");
applyTheme(readStoredTheme(), themeButton);
themeButton.addEventListener("click", handleThemeClick);
