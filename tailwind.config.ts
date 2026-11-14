import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./content/**/*.{js,ts,jsx,tsx,mdx}",
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
        // Semantik "Atölye Kremi" token'ları (T-01, docs/MARKA.md §8)
        bg: "rgb(var(--bg-rgb, 246 238 223) / <alpha-value>)",
        "cream-surface": "rgb(var(--surface-rgb, 251 246 236) / <alpha-value>)",
        ink: {
          DEFAULT: "rgb(var(--ink-rgb, 59 30 26) / <alpha-value>)",
          muted: "rgb(var(--ink-muted-rgb, 110 81 72) / <alpha-value>)",
        },
        line: "rgb(var(--line-rgb, 226 211 189) / <alpha-value>)",
        accent: {
          DEFAULT: "rgb(var(--accent-rgb, 180 83 42) / <alpha-value>)",
        },
        good: "rgb(var(--color-good-rgb, 94 127 62) / <alpha-value>)",
        warn: "rgb(var(--color-warn-rgb, 200 134 44) / <alpha-value>)",
        bad: "rgb(var(--color-bad-rgb, 155 44 31) / <alpha-value>)",
        dough: "rgb(var(--color-dough-rgb, 234 211 162) / <alpha-value>)",

        background: "#12100E",
        foreground: "#E8E0D5",
        surface: {
          DEFAULT: "#1C1815",
          panel: "#221D1A",
          elevated: "#2C2521",
          border: "#3D342E",
          highlight: "#4F433A",
          cream: "var(--surface)",
        },
        // Artisan Cream & Warm Linen Design System tokens
        linen: {
          DEFAULT: "#F4EFEA",
          surface: "#FFFFFF",
          subtle: "#EBE3D8",
          border: "#DFD5C6",
          borderSubtle: "#E8E0D4",
        },
        espresso: {
          DEFAULT: "#211A14",
          light: "#3A2F25",
          wheat: "#615347",
          muted: "#8C7D70",
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
          terracotta: "#C85A32",
          "terracotta-dark": "#B34B26",
          "terracotta-soft": "#F7ECE6",
        },
      },
      fontFamily: {
        serif: ["var(--font-fraunces)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "Helvetica", "Arial", "sans-serif"],
        lora: ["var(--font-fraunces)", "Georgia", "serif"],
        mono: ["var(--font-jetbrains-mono)", "monospace"],
        hand: ["var(--font-fraunces)", "Georgia", "serif"],
      },
      boxShadow: {
        "2xs": "0 1px 1px 0 rgb(59 30 26 / 0.04)",
        xs: "0 1px 2px 0 rgb(59 30 26 / 0.06)",
        clay: "0 4px 14px -2px rgba(0, 0, 0, 0.6)",
        "clay-lg": "0 10px 25px -5px rgba(0, 0, 0, 0.8)",
      },
      backdropBlur: {
        xs: "2px",
      },
      scale: {
        98: "0.98",
        108: "1.08",
      },
    },
  },
  plugins: [],
};
export default config;
