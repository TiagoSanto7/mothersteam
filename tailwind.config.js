/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        lavender: {
          50:  '#F5F3FA',
          100: '#EBE8F5',
          200: '#D4CCE8',
          400: '#9D8FCC',
          600: '#7B6BB8',
        },
        sage: {
          100: '#E8EFE8',
          400: '#8FAF8F',
          600: '#5A805A',
        },
        blush: {
          100: '#F5EBE8',
          300: '#D4A898',
          500: '#C49A8A',
        },
        babyblue: {
          100: '#E8F0F5',
          300: '#9BC4D0',
        },
        graphite:         '#2C2C2C',
        'graphite-light': '#4A4A4A',
        'graphite-muted': '#7A7A7A',
        offwhite:         '#F8F5F0',
      },
    },
  },
  plugins: [],
}
