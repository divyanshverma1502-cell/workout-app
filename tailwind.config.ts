import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
    "./src/store/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        coal: "#080b0f",
        panel: "#11161d",
        line: "rgba(255,255,255,0.09)",
        lift: "#38e1a2",
        amber: "#f5b74f",
        steel: "#92a2b8",
      },
      boxShadow: {
        glow: "0 16px 60px rgba(56, 225, 162, 0.14)",
      },
    },
  },
  plugins: [],
};

export default config;
