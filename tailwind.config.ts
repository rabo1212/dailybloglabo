import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: "#09090b",
        card: "#141418",
        "card-border": "#1f1f26",
        "text-primary": "#fafafa",
        "text-body": "#cdcdd6",
        "text-dim": "#6b6b7b",
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
