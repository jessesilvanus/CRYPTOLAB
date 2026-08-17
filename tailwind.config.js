/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Design tokens live mostly as CSS variables (see styles/global.css).
        // These map the theme to known Tailwind colors for utilities.
        core: 'rgb(var(--c-core) / <alpha-value>)',
        accent: 'rgb(var(--c-accent) / <alpha-value>)',
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"Inter"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      // Tailwind ships grid-cols-1..12 by default; 13 is used so the 26-letter
      // alphabet renders as two clean rows of 13 in the attack lab.
      gridTemplateColumns: {
        13: 'repeat(13, minmax(0, 1fr))',
      },
    },
  },
  plugins: [],
}
