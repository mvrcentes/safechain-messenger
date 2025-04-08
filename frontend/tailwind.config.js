import animate from "tailwindcss-animate"

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "oklch(var(--background) / <alpha-value>)",
        foreground: "oklch(var(--foreground) / <alpha-value>)",
        primary: "oklch(var(--primary) / <alpha-value>)",
        "primary-foreground":
          "oklch(var(--primary-foreground) / <alpha-value>)",
        secondary: "oklch(var(--secondary) / <alpha-value>)",
        "secondary-foreground":
          "oklch(var(--secondary-foreground) / <alpha-value>)",
        accent: "oklch(var(--accent) / <alpha-value>)",
        "accent-foreground": "oklch(var(--accent-foreground) / <alpha-value>)",
        destructive: "oklch(var(--destructive) / <alpha-value>)",
        "destructive-foreground":
          "oklch(var(--destructive-foreground) / <alpha-value>)",
        input: "oklch(var(--input) / <alpha-value>)",
        border: "oklch(var(--border) / <alpha-value>)",
        ring: "oklch(var(--ring) / <alpha-value>)",
      },
    },
  },
  plugins: [animate],
}
