import { FiMoon, FiSun } from "react-icons/fi";
import { useTheme } from "../../theme/ThemeProvider";

export const ThemeToggle = ({ className = "" }) => {
    const { theme, toggleTheme } = useTheme();
    const nextTheme = theme === "dark" ? "light" : "dark";

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${nextTheme} theme`}
            title={`Switch to ${nextTheme} theme`}
            className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl text-neutral-700 transition-colors hover:bg-neutral-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 ${className}`}
        >
            {theme === "dark" ? <FiSun aria-hidden="true" className="text-xl" /> : <FiMoon aria-hidden="true" className="text-xl" />}
        </button>
    );
};
