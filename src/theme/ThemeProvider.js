import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

const ThemeContext = createContext(null);
export const THEME_STORAGE_KEY = "nexus-theme";

const readInitialTheme = () => {
    if (typeof window === "undefined") return "light";
    try {
        const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
        if (stored === "dark" || stored === "light") return stored;
    } catch {
        // Storage can be unavailable; fall through to the DOM/system state.
    }
    if (document.documentElement.getAttribute("data-theme") === "dark") return "dark";
    if (document.documentElement.getAttribute("data-theme") === "nexus") return "light";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const ThemeProvider = ({ children }) => {
    const [theme, setThemeState] = useState(readInitialTheme);

    const applyTheme = useCallback((nextTheme) => {
        if (typeof document === "undefined") return;
        document.documentElement.setAttribute(
            "data-theme",
            nextTheme === "dark" ? "dark" : "nexus"
        );
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            meta.setAttribute("content", nextTheme === "dark" ? "#080f1e" : "#f4f7fa");
        }
    }, []);

    useEffect(() => {
        applyTheme(theme);
    }, [theme, applyTheme]);

    useEffect(() => {
        if (typeof window === "undefined" || !window.matchMedia) return undefined;
        const media = window.matchMedia("(prefers-color-scheme: dark)");
        const handleChange = (event) => {
            let hasExplicitChoice = false;
            try {
                hasExplicitChoice = Boolean(window.localStorage.getItem(THEME_STORAGE_KEY));
            } catch {
                hasExplicitChoice = false;
            }
            if (!hasExplicitChoice) {
                setThemeState(event.matches ? "dark" : "light");
            }
        };
        media.addEventListener?.("change", handleChange);
        return () => media.removeEventListener?.("change", handleChange);
    }, []);

    const setTheme = useCallback((nextTheme) => {
        const normalised = nextTheme === "dark" ? "dark" : "light";
        try {
            window.localStorage.setItem(THEME_STORAGE_KEY, normalised);
        } catch {
            // The theme still applies for this page even if persistence fails.
        }
        setThemeState(normalised);
    }, []);

    const toggleTheme = useCallback(() => {
        setTheme(theme === "dark" ? "light" : "dark");
    }, [theme, setTheme]);

    const value = useMemo(
        () => ({ theme, setTheme, toggleTheme }),
        [theme, setTheme, toggleTheme]
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
    const value = useContext(ThemeContext);
    if (!value) {
        throw new Error("useTheme must be used inside ThemeProvider");
    }
    return value;
};
