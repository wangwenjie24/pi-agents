import { create } from "zustand";

type Theme = "light" | "dark";

interface ThemeState {
  theme: Theme;
  toggle: () => void;
  initFromStorage: () => void;
}

const LS_KEY = "pi-chat:theme";

function applyTheme(theme: Theme) {
  const html = document.documentElement;
  if (theme === "dark") {
    html.classList.add("dark");
  } else {
    html.classList.remove("dark");
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: "light",

  toggle() {
    const next = get().theme === "light" ? "dark" : "light";
    applyTheme(next);
    try {
      localStorage.setItem(LS_KEY, next);
    } catch {
      /* noop */
    }
    set({ theme: next });
  },

  initFromStorage() {
    let stored: Theme | null = null;
    try {
      stored = localStorage.getItem(LS_KEY) as Theme | null;
    } catch {
      /* noop */
    }
    const theme = stored ?? "light";
    applyTheme(theme);
    set({ theme });
  },
}));
