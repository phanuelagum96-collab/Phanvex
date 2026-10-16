"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type ThemePreference = "light" | "dark" | "system";

type ThemeContextType = {
  theme: ThemePreference;
  setTheme: (theme: ThemePreference) => void;
  resolvedTheme: "light" | "dark";
};

const STORAGE_KEY = "phanvex-theme";

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getSystemTheme(): "light" | "dark" {
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
}

function applyTheme(theme: "light" | "dark") {
  const root = document.documentElement;

  root.classList.toggle("dark", theme === "dark");
  root.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemePreference>("system");
  const [resolvedTheme, setResolvedTheme] =
    useState<"light" | "dark">("light");
  const [ready, setReady] = useState(false);

  const setTheme = useCallback((nextTheme: ThemePreference) => {
    setThemeState(nextTheme);

    try {
      localStorage.setItem(STORAGE_KEY, nextTheme);
    } catch {
      // The theme still works for the current session if storage is unavailable.
    }

    const resolved = nextTheme === "system" ? getSystemTheme() : nextTheme;

    setResolvedTheme(resolved);
    applyTheme(resolved);
  }, []);

  useEffect(() => {
    let storedTheme: ThemePreference = "system";

    try {
      const stored = localStorage.getItem(STORAGE_KEY);

      if (stored === "light" || stored === "dark" || stored === "system") {
        storedTheme = stored;
      }
    } catch {
      // Use the system preference when local storage is unavailable.
    }

    setThemeState(storedTheme);

    const resolved =
      storedTheme === "system" ? getSystemTheme() : storedTheme;

    setResolvedTheme(resolved);
    applyTheme(resolved);
    setReady(true);

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemChange = (event: MediaQueryListEvent) => {
      if (storedTheme === "system") {
        const next = event.matches ? "dark" : "light";
        setResolvedTheme(next);
        applyTheme(next);
      }
    };

    media.addEventListener("change", handleSystemChange);

    return () => {
      media.removeEventListener("change", handleSystemChange);
    };
  }, []);

  useEffect(() => {
    if (!ready) return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");

    const handleSystemChange = (event: MediaQueryListEvent) => {
      if (theme === "system") {
        const next = event.matches ? "dark" : "light";
        setResolvedTheme(next);
        applyTheme(next);
      }
    };

    media.addEventListener("change", handleSystemChange);

    return () => {
      media.removeEventListener("change", handleSystemChange);
    };
  }, [theme, ready]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
}