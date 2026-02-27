import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        "osha-yellow": "#F5A623",
        "osha-orange": "#E85D04",
        "risk-low": "#22C55E",
        "risk-medium": "#EAB308",
        "risk-high": "#EF4444",
      },
    },
  },
  plugins: [],
};

export default config;
