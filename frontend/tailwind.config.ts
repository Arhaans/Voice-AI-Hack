import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
    "./src/hooks/**/*.{ts,tsx}",
    "./src/lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Libertinus Mono"', "monospace"],
        sans: ["Jost", '"Noto Sans"', "sans-serif"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        surface: "hsl(var(--surface))",
        "surface-raised": "hsl(var(--surface-raised))",
        card: "hsl(var(--surface))",
        "card-foreground": "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        "border-subtle": "hsl(var(--border-subtle))",
        muted: "hsl(var(--muted))",
        "muted-foreground": "hsl(var(--muted-foreground))",
        primary: "hsl(var(--primary))",
        "primary-foreground": "hsl(var(--primary-foreground))",
        orange: {
          DEFAULT: "hsl(var(--orange))",
          deep: "hsl(var(--orange-deep))",
          light: "hsl(var(--orange-light))",
        },
      },
      boxShadow: {
        "orb-orange":
          "0 0 32px rgba(249,115,22,0.35), 0 0 80px rgba(249,115,22,0.18), 0 8px 32px rgba(0,0,0,0.08)",
        "orb-dark":
          "0 0 40px rgba(10,10,10,0.18), 0 8px 32px rgba(0,0,0,0.12)",
        card: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
      },
      animation: {
        float: "float 6s ease-in-out infinite",
        shimmer: "shimmer 2s linear infinite",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-10px)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% center" },
          "100%": { backgroundPosition: "200% center" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
