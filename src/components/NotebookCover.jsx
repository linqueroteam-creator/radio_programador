import React, { useMemo } from 'react';

/**
 * Gera capas premium para cadernos de forma determinística.
 * Mesma cor + mesmo id = mesma capa sempre.
 */

// Converte cor hex para HSL pra gerar variações harmônicas
function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;
  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hsl(h, s, l) {
  return `hsl(${h % 360}, ${s}%, ${l}%)`;
}

// Hash simples e determinístico a partir de string
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

// Gera padrões SVG para colocar como overlay nas capas
function generatePattern(style, baseHue, id) {
  const patterns = {
    // Bolinhas suaves espalhadas
    dots: (
      <pattern id={`p-${id}`} patternUnits="userSpaceOnUse" width="40" height="40">
        <circle cx="10" cy="10" r="2.5" fill="white" opacity="0.18" />
        <circle cx="30" cy="22" r="1.5" fill="white" opacity="0.12" />
        <circle cx="20" cy="35" r="2" fill="white" opacity="0.15" />
      </pattern>
    ),
    // Linhas diagonais
    lines: (
      <pattern id={`p-${id}`} patternUnits="userSpaceOnUse" width="30" height="30" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="30" stroke="white" strokeWidth="1" opacity="0.12" />
      </pattern>
    ),
    // Ondas curvilíneas
    waves: (
      <pattern id={`p-${id}`} patternUnits="userSpaceOnUse" width="80" height="40">
        <path d="M0,20 Q20,5 40,20 T80,20" fill="none" stroke="white" strokeWidth="1.5" opacity="0.15" />
      </pattern>
    ),
    // Grade geométrica
    grid: (
      <pattern id={`p-${id}`} patternUnits="userSpaceOnUse" width="24" height="24">
        <path d="M 24 0 L 0 0 0 24" fill="none" stroke="white" strokeWidth="0.8" opacity="0.1" />
      </pattern>
    ),
    // Triângulos abstratos
    triangles: (
      <pattern id={`p-${id}`} patternUnits="userSpaceOnUse" width="50" height="50">
        <polygon points="25,10 40,40 10,40" fill="white" opacity="0.06" />
      </pattern>
    ),
    // Estrelas/diamantes
    stars: (
      <pattern id={`p-${id}`} patternUnits="userSpaceOnUse" width="60" height="60">
        <circle cx="30" cy="30" r="1" fill="white" opacity="0.4" />
        <circle cx="10" cy="50" r="0.7" fill="white" opacity="0.3" />
        <circle cx="50" cy="15" r="0.6" fill="white" opacity="0.3" />
        <circle cx="45" cy="45" r="0.8" fill="white" opacity="0.35" />
      </pattern>
    ),
  };
  return patterns[style] || patterns.dots;
}

export default function NotebookCover({
  notebook,
  size = 'md',          // 'sm' | 'md' | 'lg'
  showSpine = true,     // mostrar lombada do livro
  className = '',
  style = {},
}) {
  // Calcula tudo baseado no id (determinístico)
  const cover = useMemo(() => {
    const seed = hashString(notebook.id || notebook.name);
    const baseColor = notebook.color || '#5B2D8E';
    const { h, s, l } = hexToHsl(baseColor);

    // 6 estilos de padrão, escolhidos pelo seed
    const patternStyles = ['dots', 'lines', 'waves', 'grid', 'triangles', 'stars'];
    const patternStyle = patternStyles[seed % patternStyles.length];

    // 4 estilos de gradiente
    const gradientStyles = ['radial', 'linear-tl-br', 'linear-tr-bl', 'mesh'];
    const gradientStyle = gradientStyles[(seed >> 3) % gradientStyles.length];

    // Cores derivadas (harmonia: análoga e complementar suave)
    const colorPrimary = hsl(h, Math.max(s, 50), Math.min(l, 45));
    const colorSecondary = hsl(h + 25, Math.max(s - 10, 35), Math.min(l + 10, 55));
    const colorTertiary = hsl(h - 15, Math.max(s - 20, 30), Math.min(l - 8, 35));
    const colorDeep = hsl(h, s, Math.max(l - 15, 18));

    return {
      seed,
      baseColor,
      patternStyle,
      gradientStyle,
      colorPrimary,
      colorSecondary,
      colorTertiary,
      colorDeep,
      hue: h,
    };
  }, [notebook.id, notebook.color, notebook.name]);

  const sizes = {
    sm: { w: 140, h: 180, titleSize: 13, padding: 12 },
    md: { w: 200, h: 260, titleSize: 18, padding: 16 },
    lg: { w: 280, h: 360, titleSize: 22, padding: 20 },
  };
  const dim = sizes[size];

  // Define o gradiente principal
  const renderGradient = () => {
    const gid = `g-${cover.seed}`;
    switch (cover.gradientStyle) {
      case 'radial':
        return (
          <radialGradient id={gid} cx="30%" cy="20%" r="120%">
            <stop offset="0%" stopColor={cover.colorSecondary} />
            <stop offset="60%" stopColor={cover.colorPrimary} />
            <stop offset="100%" stopColor={cover.colorDeep} />
          </radialGradient>
        );
      case 'linear-tl-br':
        return (
          <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={cover.colorSecondary} />
            <stop offset="50%" stopColor={cover.colorPrimary} />
            <stop offset="100%" stopColor={cover.colorDeep} />
          </linearGradient>
        );
      case 'linear-tr-bl':
        return (
          <linearGradient id={gid} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={cover.colorSecondary} />
            <stop offset="100%" stopColor={cover.colorPrimary} />
          </linearGradient>
        );
      case 'mesh':
      default:
        return (
          <>
            <linearGradient id={gid} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={cover.colorPrimary} />
              <stop offset="100%" stopColor={cover.colorDeep} />
            </linearGradient>
            <radialGradient id={`${gid}-blob`} cx="80%" cy="20%" r="50%">
              <stop offset="0%" stopColor={cover.colorSecondary} stopOpacity="0.7" />
              <stop offset="100%" stopColor={cover.colorSecondary} stopOpacity="0" />
            </radialGradient>
          </>
        );
    }
  };

  const gid = `g-${cover.seed}`;
  const pid = `p-${cover.seed}`;

  return (
    <div
      className={`relative rounded-lg overflow-hidden ${className}`}
      style={{
        width: dim.w,
        height: dim.h,
        boxShadow: '0 8px 24px rgba(45, 27, 78, 0.15), 0 2px 6px rgba(45, 27, 78, 0.08)',
        ...style,
      }}
    >
      {/* Lombada (faixa esquerda mais escura, dá efeito de livro) */}
      {showSpine && (
        <div
          className="absolute top-0 left-0 h-full pointer-events-none z-10"
          style={{
            width: '8%',
            background: `linear-gradient(to right, ${cover.colorDeep}, transparent)`,
            opacity: 0.45,
          }}
        />
      )}

      {/* Brilho lateral direito (efeito premium) */}
      <div
        className="absolute top-0 right-0 h-full pointer-events-none z-10"
        style={{
          width: '15%',
          background: 'linear-gradient(to left, rgba(255,255,255,0.08), transparent)',
        }}
      />

      {/* Background SVG com gradiente + padrão */}
      <svg
        width="100%"
        height="100%"
        viewBox={`0 0 ${dim.w} ${dim.h}`}
        preserveAspectRatio="none"
        className="absolute inset-0"
      >
        <defs>
          {renderGradient()}
          {generatePattern(cover.patternStyle, cover.hue, cover.seed)}
        </defs>

        {/* Camada 1: gradiente */}
        <rect width="100%" height="100%" fill={`url(#${gid})`} />

        {/* Camada extra para mesh */}
        {cover.gradientStyle === 'mesh' && (
          <rect width="100%" height="100%" fill={`url(#${gid}-blob)`} />
        )}

        {/* Camada 2: padrão sutil por cima */}
        <rect width="100%" height="100%" fill={`url(#${pid})`} />

        {/* Vinheta (escurecimento das bordas) */}
        <radialGradient id={`vig-${cover.seed}`} cx="50%" cy="50%" r="70%">
          <stop offset="60%" stopColor="black" stopOpacity="0" />
          <stop offset="100%" stopColor="black" stopOpacity="0.25" />
        </radialGradient>
        <rect width="100%" height="100%" fill={`url(#vig-${cover.seed})`} />
      </svg>

      {/* Conteúdo da capa */}
      <div
        className="relative z-20 h-full flex flex-col justify-between"
        style={{ padding: dim.padding }}
      >
        {/* Topo: marca discreta */}
        <div className="flex items-start justify-between">
          <div
            className="text-white/60 font-mono tracking-widest"
            style={{ fontSize: size === 'sm' ? 8 : 9 }}
          >
            ANOTATA
          </div>
          <div
            className="rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center text-white/90"
            style={{
              width: size === 'sm' ? 18 : 24,
              height: size === 'sm' ? 18 : 24,
              fontSize: size === 'sm' ? 9 : 11,
              fontWeight: 600,
            }}
            title={`${notebook._noteCount ?? 0} notas`}
          >
            {notebook._noteCount ?? 0}
          </div>
        </div>

        {/* Centro: linha decorativa */}
        <div className="flex flex-col items-start gap-1">
          <div
            className="h-px bg-white/40"
            style={{ width: size === 'sm' ? 30 : 50 }}
          />
          <div
            className="h-px bg-white/25"
            style={{ width: size === 'sm' ? 18 : 28 }}
          />
        </div>

        {/* Base: título do caderno */}
        <div>
          <div
            className="text-white font-bold leading-tight tracking-tight"
            style={{
              fontSize: dim.titleSize,
              textShadow: '0 2px 8px rgba(0,0,0,0.25)',
              wordBreak: 'break-word',
            }}
          >
            {notebook.name}
          </div>
          <div
            className="text-white/55 mt-1"
            style={{ fontSize: size === 'sm' ? 9 : 10 }}
          >
            {notebook._noteCount === 0 || !notebook._noteCount
              ? 'caderno vazio'
              : `${notebook._noteCount} ${notebook._noteCount === 1 ? 'nota' : 'notas'}`
            }
          </div>
        </div>
      </div>
    </div>
  );
}
