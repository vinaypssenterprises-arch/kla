/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        parchment: 'var(--parchment)',
        'parchment-2': 'var(--parchment-2)',
        'parchment-3': 'var(--parchment-3)',
        rule: 'var(--rule)',
        'ink-text': 'var(--ink-text)',
        'ink-text-soft': 'var(--ink-text-soft)',
        'ink-text-faint': 'var(--ink-text-faint)',
        maroon: 'var(--maroon)',
        'maroon-dark': 'var(--maroon-dark)',
        brass: 'var(--brass)',
        'brass-light': 'var(--brass-light)',
        forest: 'var(--forest)',
        'forest-bg': 'var(--forest-bg)',
        rust: 'var(--rust)',
        'rust-bg': 'var(--rust-bg)',
        brick: 'var(--brick)',
        'brick-bg': 'var(--brick-bg)',
        'navy-stamp': 'var(--navy-stamp)',
        'navy-stamp-bg': 'var(--navy-stamp-bg)',
        'neutral-bg': 'var(--neutral-bg)',
      },
      fontFamily: {
        sans: ['"Public Sans"', 'system-ui', 'sans-serif'],
        serif: ['Fraunces', 'Georgia', 'serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        soft: 'var(--shadow-soft)',
        card: 'var(--shadow-card)',
        deep: 'var(--shadow-deep)',
      },
      borderRadius: {
        s: 'var(--radius-s)',
        m: 'var(--radius-m)',
        l: 'var(--radius-l)',
      }
    },
  },
  plugins: [],
}
