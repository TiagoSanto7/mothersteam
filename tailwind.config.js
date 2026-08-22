/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta oficial Mother's Team
        'mt-rose':       '#db958b',
        'mt-rose-dark':  '#c47c73',
        'mt-rose-deep':  '#8b3d34',
        'mt-pink':       '#f6bdd8',
        'mt-pink-soft':  '#fadfec',
        'mt-cream':      '#faf5f0',
        'mt-linen':      '#f5ede4',
        'mt-charcoal':   '#3d342e',
        'mt-muted':      '#8b7268',
        // Aliases legado — remapeados para tons Mother's Team.
        // Removidos na Onda 3 quando não houver mais referências.
        'sara-gold':       '#db958b',
        'sara-terracotta': '#c47c73',
        'sara-linen':      '#f5ede4',
        'sara-cream':      '#faf5f0',
        'sara-charcoal':   '#3d342e',
        'sara-muted':      '#8b7268',
        'sara-warm':       '#8b7268',
        graphite:          '#3d342e',
        'graphite-light':  '#8b7268',
        'graphite-muted':  '#8b7268',
        offwhite:          '#faf5f0',
      },
      borderRadius: {
        'mt':      '24px',
        'mt-lg':   '32px',
        'mt-pill': '9999px',
      },
      boxShadow: {
        'mt':    '0 8px 24px -8px rgba(219, 149, 139, 0.25)',
        'mt-lg': '0 20px 40px -12px rgba(219, 149, 139, 0.35)',
      },
    },
  },
  plugins: [],
}
