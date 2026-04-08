import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "var(--color-bg)",
        card: "var(--color-card)",
        "card-border": "var(--color-card-border)",
        "text-primary": "var(--color-text-primary)",
        "text-body": "var(--color-text-body)",
        "text-dim": "var(--color-text-dim)",
        health: "#34d399",
        finance: "#fbbf24",
        tech: "#22d3ee",
        devlog: "#a5a5ff",
        trending: "#fb923c",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "monospace"],
      },
    },
  },
  plugins: [],
};
export default config;
