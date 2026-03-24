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
        devlog: "#a5a5ff",
        ainews: "#22d3ee",
        crypto: "#fbbf24",
        stocks: "#34d399",
        hottopic: "#fb923c",
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
