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
          // === Fundos ===
          'bg': '#F2F1F4',
          'sidebar': '#EDE8F2',
          'card': '#FFFFFF',

          // === Marca: roxo ===
          'roxo': '#5B2D8E',
          'roxo-claro': '#7C4DC9',
          'roxo-escuro': '#3D1B66',

          // === Marca: goiaba ===
          'goiaba': '#E8637C',
          'goiaba-claro': '#F08AA0',
          'goiaba-escuro': '#C44862',
          'goiaba-bg': '#FCE7EB',         // NOVO: fundo padrão de erro/atenção (substitui 4 variações rosa-pálido)

          // === Marca: lavanda ===
          'lavanda': '#E0D7EC',
          'lavanda-clara': '#F0E9F8',

          // === Texto ===
          'text': '#2D1B4E',
          'text-suave': '#5B4A7A',         // único cinza-suave oficial; abolimos #6B5E80
          'muted': '#9888B5',

          // === Bordas ===
          'border': '#DCD2E8',
          'border-suave': '#EAE0F2',

          // === Hover ===
          'hover': '#E8DFF2',

          // === Semânticos NOVOS (formalizando uso já presente no app) ===
          'success': '#0F7A3F',            // verde escuro: forte, concluída, revisada
          'success-bg': '#D4F4DD',         // verde claro: fundo de chip
          'warn': '#9B6F00',               // âmbar: média, amanhã, gerundismo
          'warn-bg': '#FFF4D9',            // âmbar claro: fundo de chip
          'favorite': '#F0B400',           // dourado quente: estrela favorita (substitui yellow-500)

          // === Aliases (compatibilidade — não remover) ===
          'accent': '#E8637C',
          'accent2': '#5B2D8E',
          'green': '#5B2D8E',
        }
      },
      fontSize: {
        // Adiciona um nível abaixo de `xs` (12px) para os badges/kbd minúsculos.
        // Substitui usos espalhados de text-[9px], text-[10px] e text-[11px].
        '2xs': ['0.625rem', { lineHeight: '0.875rem' }],   // 10px
      },
      boxShadow: {
        // Sombra "fofa" para popovers de feedback (gramática, etc.).
        // Substitui o boxShadow inline em GrammarPopover.jsx.
        'popover': '0 8px 28px rgba(45, 27, 78, 0.18)',
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
