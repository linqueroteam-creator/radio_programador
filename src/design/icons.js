/**
 * ========================================================================
 *  ANOTATA — Iconografia contextualizada
 * ========================================================================
 *
 *  Filosofia
 *  ----------
 *  No ANOTATA o tamanho de um ícone NÃO é decorativo: ele comunica o
 *  papel daquele elemento na hierarquia da tela. Três tamanhos canônicos:
 *
 *      ICON_SM  = 12   →  denso     (chip, tag, kbd, badge minúsculo,
 *                                    X de remoção inline, marcador)
 *      ICON_MD  = 14   →  padrão    (botão de toolbar, item de menu,
 *                                    X de header de popover, hover ações)
 *      ICON_LG  = 16   →  destaque  (header de modal grande, botão
 *                                    primário com ícone, ícone hero pequeno)
 *
 *  Tamanhos fora dessa escala são EXCEÇÕES e devem ser justificados:
 *      ICON_HERO = 20  → empty state, capa, ilustração
 *      ICON_DECO = 26+ → ícone como elemento gráfico (não interativo)
 *
 *  Como usar
 *  ---------
 *      import { Icon } from '../design/icons';
 *      <Icon.SM as={X} />              // 12px
 *      <Icon.MD as={Star} />           // 14px
 *      <Icon.LG as={BookOpen} />       // 16px
 *
 *  Ou diretamente:
 *      import { ICON_MD } from '../design/icons';
 *      <X size={ICON_MD} />
 *
 *  Aliases por contexto (use estes quando o papel for óbvio)
 *  ---------------------------------------------------------
 *      ICON_X_INLINE     = 12   → X em chip/tag/badge
 *      ICON_X_POPOVER    = 14   → X em header de popover compacto
 *      ICON_X_MODAL      = 16   → X em header de modal grande
 *      ICON_TOOLBAR      = 14   → todos os botões de Toolbar.jsx
 *      ICON_LIST_ITEM    = 14   → ícone à esquerda em item de lista/menu
 *      ICON_HEADER_HERO  = 16   → ícone-em-quadrado-gradiente (header)
 *      ICON_EMPTY_STATE  = 26   → ilustração de "sem nada aqui"
 *
 *  Nunca use 9, 11, 13, 15, 17, 18. Diferenças imperceptíveis viram ruído.
 * ========================================================================
 */

// === Tamanhos canônicos ===
export const ICON_SM = 12;
export const ICON_MD = 14;
export const ICON_LG = 16;

// === Exceções documentadas ===
export const ICON_HERO = 20;        // empty state pequeno
export const ICON_DECO = 26;        // elemento gráfico não interativo

// === Aliases por contexto ===
// X (fechar)
export const ICON_X_INLINE  = ICON_SM;   // X em chip / tag / badge / "limpar busca"
export const ICON_X_POPOVER = ICON_MD;   // X em header de popover compacto
export const ICON_X_MODAL   = ICON_LG;   // X em header de modal grande

// Botões de barra/lista
export const ICON_TOOLBAR     = ICON_MD; // Toolbar do editor (todos os 18 ícones)
export const ICON_LIST_ITEM   = ICON_MD; // Ícone à esquerda de item de menu / linha
export const ICON_BTN_PRIMARY = ICON_LG; // Botão primário com ícone+texto

// Header decorativo (quadradinho com gradiente)
export const ICON_HEADER_HERO = ICON_LG; // Ícone dentro de quadrado de header de modal

// Estados visuais
export const ICON_EMPTY_STATE = ICON_DECO; // Empty state grande
export const ICON_BADGE       = ICON_SM;   // Pin/Star/Eye em metabar

// === Helper: tamanhos default por papel ===
export const ICON = {
  SM: ICON_SM,
  MD: ICON_MD,
  LG: ICON_LG,
  HERO: ICON_HERO,
  DECO: ICON_DECO,
};
