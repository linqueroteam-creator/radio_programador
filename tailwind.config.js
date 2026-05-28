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
        },

        // ============================================================
        // CAMADA 2 — Cores das 10 áreas da vida (núcleos do mapa)
        // Doc: estrutura_neurocognitiva_mestre/areas-da-vida.md
        // ============================================================
        'area-saude':       { base: '#10B981', dark: '#047857', light: '#D1FAE5', glow: '#34D399' },
        'area-emocoes':     { base: '#F472B6', dark: '#BE185D', light: '#FCE7F3', glow: '#F9A8D4' },
        'area-intelectual': { base: '#3B82F6', dark: '#1E40AF', light: '#DBEAFE', glow: '#60A5FA' },
        'area-carreira':    { base: '#F59E0B', dark: '#92400E', light: '#FEF3C7', glow: '#FBBF24' },
        'area-financas':    { base: '#059669', dark: '#065F46', light: '#D1FAE5', glow: '#10B981' },
        'area-relacoes':    { base: '#FB923C', dark: '#9A3412', light: '#FFEDD5', glow: '#FDBA74' },
        'area-espiritual':  { base: '#A78BFA', dark: '#5B21B6', light: '#EDE9FE', glow: '#C4B5FD' },
        'area-lar':         { base: '#65A30D', dark: '#3F6212', light: '#ECFCCB', glow: '#84CC16' },
        'area-lazer':       { base: '#EC4899', dark: '#9D174D', light: '#FCE7F3', glow: '#F472B6' },
        'area-crescimento': { base: '#06B6D4', dark: '#155E75', light: '#CFFAFE', glow: '#22D3EE' },
        'area-outros':      { base: '#6B7280', dark: '#374151', light: '#F3F4F6', glow: '#9CA3AF' },

        // ============================================================
        // CAMADA 3 — Cores semânticas de estado das anotações
        // Doc: estrutura_neurocognitiva_mestre/regra-de-cor.md
        // ============================================================
        'state-critico':     { base: '#EF4444', bg: '#FEE2E2', dark: '#991B1B' },
        'state-atencao':     { base: '#F59E0B', bg: '#FEF3C7', dark: '#92400E' },
        'state-saudavel':    { base: '#10B981', bg: '#D1FAE5', dark: '#065F46' },
        'state-informativo': { base: '#3B82F6', bg: '#DBEAFE', dark: '#1E40AF' },
        'state-esquecido':   { base: '#9CA3AF', bg: '#F3F4F6', dark: '#4B5563' },
        'state-pulsando':    { base: '#A07BD6', bg: '#EDE8F2', dark: '#5B2D8E' },
        'state-favorito':    { base: '#F0B400', bg: '#FEF3C7', dark: '#92400E' },

        // ============================================================
        // CAMADA 4 — Cores de relação (conexões entre anotações)
        // ============================================================
        'rel-manual': { stroke: '#5B2D8E', glow: '#7B4DBA' },
        'rel-forte':  { stroke: '#0F7A3F', glow: '#1FB55C' },
        'rel-media':  { stroke: '#9B6F00', glow: '#D49B1F' },
        'rel-fraca':  { stroke: '#7B4DBA', glow: '#9F77D8' },
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
