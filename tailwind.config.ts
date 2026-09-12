import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "float": "float 4s ease-in-out infinite",
      },
      colors: {
        background: "#12100E",
        foreground: "#E8E0D5",
        surface: {
          DEFAULT: "#1C1815",
          panel: "#221D1A",
          elevated: "#2C2521",
          border: "#3D342E",
          highlight: "#4F433A",
        },
        artisan: {
          brown: "#6B4931",
          crust: "#8B5A33",
          gold: "#C59B6D",
          cream: "#FAF6F0",
          amber: "#D48B4B",
          oven: "#D85C1C",
          wood: "#4A3525",
          temp: "#4A90E2",
          terracotta: "#C86A46",
        },
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-lora)", "Helvetica", "Arial", "sans-serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
        hand: ["var(--font-caveat)", "cursive"],
      },
      boxShadow: {
        clay: "0 4px 14px -2px rgba(0, 0, 0, 0.6)",
        "clay-lg": "0 10px 25px -5px rgba(0, 0, 0, 0.8)",
      },
    },
  },
  plugins: [],
};
export default config;
