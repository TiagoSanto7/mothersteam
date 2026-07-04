/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'sara-gold':       '#A07844',
        'sara-terracotta': '#BC8474',
        'sara-linen':      '#F5EFE6',
        'sara-cream':      '#FAF7F2',
        'sara-charcoal':   '#3D342E',
        'sara-muted':      '#9E8E84',
        'sara-warm':       '#7A6B62',
        // aliases — mantidos para não quebrar classes existentes
        graphite:          '#3D342E',
        'graphite-light':  '#7A6B62',
        'graphite-muted':  '#9E8E84',
        offwhite:          '#FAF7F2',
      },
    },
  },
  plugins: [],
}
