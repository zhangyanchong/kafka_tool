import { ref } from "vue";

export type AppTheme = "dark" | "light" | "forest";

const STORAGE_KEY = "kafka-tool.theme";
const supportedThemes: AppTheme[] = ["dark", "light", "forest"];

function loadTheme(): AppTheme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY) as AppTheme | null;
    return saved && supportedThemes.includes(saved) ? saved : "light";
  } catch {
    return "light";
  }
}

export const currentTheme = ref<AppTheme>(loadTheme());

export function renderTheme(theme: AppTheme) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
}

export function applyTheme(theme: AppTheme) {
  currentTheme.value = theme;
  renderTheme(theme);
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // The theme still applies for this session when storage is unavailable.
  }
}

export function initializeTheme() {
  renderTheme(currentTheme.value);
}
