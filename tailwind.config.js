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
          // Fundo principal claro
          'bg': '#F2F1F4',
          // Sidebar suave
          'sidebar': '#EDE8F2',
          // Cards e blocos
          'card': '#FFFFFF',
          // Roxo profundo (cor principal de destaque)
          'roxo': '#5B2D8E',
          'roxo-claro': '#7C4DC9',
          'roxo-escuro': '#3D1B66',
          // Goiaba (cor de ações/favoritos)
          'goiaba': '#E8637C',
          'goiaba-claro': '#F08AA0',
          'goiaba-escuro': '#C44862',
          // Lavanda super clara (textos secundários, fundos)
          'lavanda': '#E0D7EC',
          'lavanda-clara': '#F0E9F8',
          // Textos
          'text': '#2D1B4E',
          'text-suave': '#5B4A7A',
          'muted': '#9888B5',
          // Bordas
          'border': '#DCD2E8',
          'border-suave': '#EAE0F2',
          // Hover
          'hover': '#E8DFF2',
          // Aliases (compatibilidade)
          'accent': '#E8637C',
          'accent2': '#5B2D8E',
          'green': '#5B2D8E',
        }
      },
      animation: {
        'slide-in': 'slideIn 0.3s ease-out',
        'slide-out': 'slideOut 0.3s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideIn: {
          '0%': { transform: 'translateX(-100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideOut: {
          '0%': { transform: 'translateX(0)', opacity: '1' },
          '100%': { transform: 'translateX(-100%)', opacity: '0' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}
