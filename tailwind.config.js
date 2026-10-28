/** @type {import('tailwindcss').Config} */

// The single source of truth for the app palette. Tailwind, DaisyUI, the CSS
// variables in src/index.css, and the primitives all derive from these values.
const palette = {
    brand: {
        50: "#e6fdf9",
        100: "#c2f2f0",
        200: "#9bdcc8",
        300: "#6fc6b6",
        400: "#48DAB3",
        500: "#00747f",
        600: "#00636d",
        700: "#00525b",
        800: "#00404a",
        900: "#00343c",
    },
    neutral: {
        50: "#F4F7FA",
        100: "#F1F5F9",
        200: "#E2E8F0",
        300: "#CBD5E1",
        400: "#94A3B8",
        500: "#64748B",
        600: "#475569",
        700: "#334155",
        800: "#1E293B",
        900: "#0F172A",
        950: "#020617",
    },
    success: {
        50: "#f0fdf4",
        100: "#dcfce7",
        200: "#bbf7d0",
        300: "#86efac",
        400: "#48DAB3",
        500: "#34D399",
        600: "#22C55E",
        700: "#16A34A",
        800: "#15803D",
        900: "#166534",
    },
    warning: {
        50: "#fffbeb",
        100: "#fef3c7",
        200: "#fde68a",
        300: "#fcd34d",
        400: "#fbbf24",
        500: "#f59e0b",
        600: "#d97706",
        700: "#b45309",
        800: "#92400e",
        900: "#78350f",
    },
    danger: {
        50: "#fef2f2",
        100: "#fee2e2",
        200: "#fecaca",
        300: "#fca5a5",
        400: "#ef4444",
        500: "#dc2626",
        600: "#b91c1c",
        700: "#991b1b",
        800: "#7f1d1d",
        900: "#450a0a",
    },
    info: {
        50: "#e0f2fe",
        100: "#bae6fd",
        200: "#7dd3fc",
        300: "#38bdf8",
        400: "#0ea5e9",
        500: "#0284c7",
        600: "#0369a1",
        700: "#075985",
        800: "#0c4a6e",
        900: "#082f49",
    },
};

// DaisyUI registers flat `neutral-*` colours from Tailwind's default palette,
// which shadow a nested `colors.neutral` scale. Re-emit the same flat keys
// from our palette so `bg-neutral-*`, `text-neutral-*`, and friends resolve to
// the Nexus neutrals instead of the framework defaults.
const neutralShades = Object.fromEntries(
    Object.entries(palette.neutral).map(([shade, value]) => [
        `neutral-${shade}`,
        value,
    ])
);

const lightTheme = {
    primary: palette.brand[500],
    "primary-content": "#FFFFFF",
    secondary: palette.neutral[900],
    "secondary-content": "#FFFFFF",
    accent: palette.neutral[700],
    "accent-content": "#FFFFFF",
    neutral: palette.neutral[700],
    "neutral-content": "#FFFFFF",
    info: palette.info[600],
    "info-content": "#FFFFFF",
    success: palette.success[800],
    "success-content": "#FFFFFF",
    warning: palette.warning[700],
    "warning-content": "#FFFFFF",
    error: palette.danger[600],
    "error-content": "#FFFFFF",
    "base-100": "#FFFFFF",
    "base-200": palette.neutral[50],
    "base-300": palette.neutral[200],
    "base-content": palette.neutral[900],
};

const darkTheme = {
    primary: palette.brand[500],
    "primary-content": "#FFFFFF",
    secondary: palette.neutral[50],
    "secondary-content": palette.neutral[900],
    accent: palette.neutral[300],
    "accent-content": palette.neutral[900],
    neutral: palette.neutral[800],
    "neutral-content": "#FFFFFF",
    info: palette.info[600],
    "info-content": "#FFFFFF",
    success: palette.success[400],
    "success-content": palette.neutral[900],
    warning: palette.warning[500],
    "warning-content": palette.neutral[900],
    error: palette.danger[400],
    "error-content": palette.neutral[900],
    "base-100": palette.neutral[900],
    "base-200": palette.neutral[800],
    "base-300": palette.neutral[700],
    "base-content": palette.neutral[50],
};

module.exports = {
    content: ["./src/**/*.{js,jsx,ts,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                sans: ["Albert Sans", "sans-serif"],
                display: ["Albert Sans", "sans-serif"],
                gilroy: ["Albert Sans", "sans-serif"],
            },
            fontSize: {
                heading: "16px",
                content: "14px",
                paragraph: "13px",
            },
            spacing: {
                gutter: "24px",
                margin: "32px",
            },
            borderRadius: {
                none: "0",
                sm: "0.125rem",
                base: "0.25rem",
                md: "0.375rem",
                lg: "0.5rem",
                xl: "0.75rem",
                "2xl": "1rem",
                "3xl": "1.5rem",
                "4xl": "2rem",
                full: "9999px",
                pill: "9999px",
            },
            boxShadow: {
                sm: "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                base: "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                md: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                lg: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
                xl: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
                "2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                inner: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)",
                none: "none",
                card: "0 1px 3px rgb(15 23 42 / 0.06), 0 8px 24px rgb(15 23 42 / 0.04)",
            },
            colors: {
                primary: {
                    DEFAULT: palette.brand[500],
                    ...palette.brand,
                },
                neutral: palette.neutral,
                ...neutralShades,
                success: palette.success,
                warning: palette.warning,
                danger: palette.danger,
                // DaisyUI calls this "error"; keep one semantic name per role.
                error: {
                    DEFAULT: palette.danger[600],
                    ...palette.danger,
                },
                info: palette.info,
                ink: palette.neutral[900],
                muted: palette.neutral[500],
                line: palette.neutral[200],
                canvas: palette.neutral[50],
                surface: "#FFFFFF",
                navy: "#00163b",
            },
            animation: {
                "fade-in": "fadeIn 0.3s ease-in-out",
                "slide-up": "slideUp 0.3s ease-out",
                "slide-down": "slideDown 0.3s ease-out",
                "slide-in-right": "slideInRight 0.3s ease-out",
                "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
                "spin-slow": "spin 2s linear infinite",
                "shimmer": "shimmer 2s linear infinite",
            },
            zIndex: {
                dropdown: "30",
                sticky: "40",
                overlay: "50",
                modal: "60",
                toast: "70",
            },
            keyframes: {
                fadeIn: {
                    "0%": { opacity: "0" },
                    "100%": { opacity: "1" },
                },
                slideUp: {
                    "0%": { opacity: "0", transform: "translateY(10px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                slideDown: {
                    "0%": { opacity: "0", transform: "translateY(-10px)" },
                    "100%": { opacity: "1", transform: "translateY(0)" },
                },
                slideInRight: {
                    "0%": { opacity: "0", transform: "translateX(-10px)" },
                    "100%": { opacity: "1", transform: "translateX(0)" },
                },
                shimmer: {
                    "0%": { backgroundPosition: "-200% 0" },
                    "100%": { backgroundPosition: "200% 0" },
                },
            },
        },
    },
    plugins: [require("daisyui")],
    daisyui: {
        themes: [
            { nexus: lightTheme },
            { dark: darkTheme },
        ],
    },
};
