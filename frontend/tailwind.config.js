/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brown: {
          50:  '#fdf8f6',
          100: '#f2e8e5',
          200: '#eaddd7',
          300: '#e0c8bf',
          400: '#d6a899',
          500: '#c88b7a',
          600: '#b5705b',
          700: '#9e5244',
          800: '#4E342E',
          900: '#3e2723',
          950: '#2d1c18',
        },
        gold: {
          50:  '#fffdf0',
          100: '#fef9c3',
          200: '#F7E7A8',
          300: '#f3d36a',
          400: '#efc024',
          500: '#D4AF37',
          600: '#b8952a',
          700: '#967720',
          800: '#785e18',
          900: '#614c10',
        },
        beige: '#F5F5DC',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'gold': '0 4px 20px rgba(212, 175, 55, 0.2)',
        'brown': '0 4px 20px rgba(78, 52, 46, 0.15)',
        'card': '0 2px 12px rgba(78, 52, 46, 0.08)',
      },
    },
  },
  plugins: [],
}
