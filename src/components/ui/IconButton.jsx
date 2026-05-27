import React, { forwardRef } from 'react';
import { ICON_SM, ICON_MD, ICON_LG } from '../../design/icons';

/**
 * ============================================================================
 *  <IconButton> — botão padronizado com ícone único
 * ============================================================================
 *
 *  Resolve três problemas de uma vez:
 *    1. Acessibilidade: aria-label obrigatório, foco visível no teclado
 *    2. Iconografia consistente: 3 tamanhos canônicos (12 / 14 / 16)
 *    3. Aparência: 4 variantes pré-definidas
 *
 *  Como usar
 *  ---------
 *      import IconButton from './ui/IconButton';
 *      import { Star } from 'lucide-react';
 *
 *      <IconButton
 *        icon={Star}
 *        label="Favoritar nota"
 *        onClick={fav}
 *        size="md"
 *        variant="ghost"
 *      />
 *
 *  Props
 *  -----
 *    icon       (componente lucide)  — obrigatório
 *    label      (string)             — obrigatório (vira aria-label + title)
 *    size       'sm' | 'md' | 'lg'   — default 'md'
 *    variant    'ghost' | 'active' | 'danger' | 'primary' — default 'ghost'
 *    isActive   (bool)               — força a aparência "ativa" (toggle ligado)
 *    iconClassName (string)          — classe extra no ícone (ex: fill-current)
 *    className  (string)             — classe extra no botão
 *    onClick, disabled, type, ...    — passthrough HTML
 *
 *  Tamanhos (área de toque + ícone)
 *  --------------------------------
 *    sm   p-1   + 12px =  20x20   (raro: badges, kbd, chips densos)
 *    md   p-1.5 + 14px =  26x26   (padrão: toolbar, lista, header de popover)
 *    lg   p-2   + 16px =  32x32   (header de modal, botão de ação primária)
 * ============================================================================
 */

const SIZE_MAP = {
  sm: { padding: 'p-1',   icon: ICON_SM, gap: 'gap-1'   },  // 12 + 4*2  = 20
  md: { padding: 'p-1.5', icon: ICON_MD, gap: 'gap-1.5' },  // 14 + 6*2  = 26
  lg: { padding: 'p-2',   icon: ICON_LG, gap: 'gap-2'   },  // 16 + 8*2  = 32
};

const VARIANT_MAP = {
  // Padrão: ícone neutro, hover lavanda + roxo
  ghost: {
    base: 'text-anotata-text-suave',
    hover: 'hover:bg-anotata-hover hover:text-anotata-roxo',
    active: 'bg-anotata-roxo text-white',
  },
  // Toggle/ativo: igual ghost, mas com cor de ativo predefinida
  active: {
    base: 'text-anotata-text-suave',
    hover: 'hover:bg-anotata-hover hover:text-anotata-roxo',
    active: 'bg-anotata-roxo text-white',
  },
  // Ações destrutivas: hover goiaba
  danger: {
    base: 'text-anotata-text-suave',
    hover: 'hover:bg-anotata-hover hover:text-anotata-goiaba',
    active: 'bg-anotata-goiaba text-white',
  },
  // Ação primária: sempre roxa (CTA com ícone)
  primary: {
    base: 'bg-anotata-roxo text-white shadow-sm',
    hover: 'hover:bg-anotata-roxo-escuro',
    active: 'bg-anotata-roxo-escuro',
  },
};

const FOCUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anotata-roxo/50 focus-visible:ring-offset-1 focus-visible:ring-offset-white';

const IconButton = forwardRef(function IconButton(
  {
    icon: Icon,
    label,
    size = 'md',
    variant = 'ghost',
    isActive = false,
    iconClassName = '',
    className = '',
    onClick,
    disabled = false,
    type = 'button',
    title,
    ...rest
  },
  ref
) {
  if (!Icon) {
    // dev safety — não quebra a tela, mas avisa
    if (typeof console !== 'undefined') console.warn('[IconButton] sem prop "icon"');
    return null;
  }
  if (!label) {
    if (typeof console !== 'undefined') console.warn('[IconButton] precisa de "label" para aria-label');
  }

  const { padding, icon: iconSize } = SIZE_MAP[size] || SIZE_MAP.md;
  const v = VARIANT_MAP[variant] || VARIANT_MAP.ghost;

  const stateClasses = isActive
    ? v.active
    : `${v.base} ${v.hover}`;

  const disabledClasses = disabled ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer';

  return (
    <button
      ref={ref}
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={isActive ? true : undefined}
      title={title || label}
      className={[
        'inline-flex items-center justify-center rounded-md transition-colors',
        padding,
        stateClasses,
        disabledClasses,
        FOCUS_RING,
        className,
      ].filter(Boolean).join(' ')}
      {...rest}
    >
      <Icon size={iconSize} className={iconClassName} aria-hidden="true" />
    </button>
  );
});

export default IconButton;
