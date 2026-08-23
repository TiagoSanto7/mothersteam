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
        offwhite:        '#faf5f0',
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
