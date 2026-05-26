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
          'bg': '#1a1a2e',
          'sidebar': '#16213e',
          'card': '#0f3460',
          'accent': '#e94560',
          'accent2': '#533483',
          'text': '#eaeaea',
          'muted': '#8892b0',
          'border': '#233554',
          'hover': '#1e3a5f',
          'green': '#00d4aa',
        }
      }
    },
  },
  plugins: [],
}
