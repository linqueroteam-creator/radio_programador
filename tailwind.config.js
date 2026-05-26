/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx}",
  ],
  theme: {
    extend: {
      colors: {
        'anotata': {
          'bg': '#1c1028',
          'sidebar': '#2d1b4e',
          'card': '#3b2066',
          'accent': '#e8637c',
          'accent2': '#9b59b6',
          'text': '#f5f0ff',
          'muted': '#b8a9d4',
          'border': '#4a2d73',
          'hover': '#3d2460',
          'green': '#e8637c',
          'lavanda': '#c9b8e8',
          'roxo': '#5b2d8e',
          'goiaba': '#e8637c',
        }
      }
    },
  },
  plugins: [],
}
