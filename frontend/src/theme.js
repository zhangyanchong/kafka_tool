import { ref } from "vue";
const STORAGE_KEY = "kafka-tool.theme";
const supportedThemes = ["dark", "light", "forest"];
function loadTheme() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        return saved && supportedThemes.includes(saved) ? saved : "light";
    }
    catch {
        return "light";
    }
}
export const currentTheme = ref(loadTheme());
export function renderTheme(theme) {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme === "light" ? "light" : "dark";
}
export function applyTheme(theme) {
    currentTheme.value = theme;
    renderTheme(theme);
    try {
        localStorage.setItem(STORAGE_KEY, theme);
    }
    catch {
        // The theme still applies for this session when storage is unavailable.
    }
}
export function initializeTheme() {
    renderTheme(currentTheme.value);
}
