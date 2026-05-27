import React, { useEffect, useRef, useState, useLayoutEffect } from 'react';
import { Sparkles, AlertCircle, BookOpen, X, EyeOff } from 'lucide-react';

/**
 * ANOTATA — Balão flutuante de correção (spell-check inline)
 *
 * Renderizado fixo na tela. Recebe:
 *  - issue           : objeto { id, message, replacements, type, rule, offset, length }
 *  - anchorRect      : DOMRect da palavra errada (de getBoundingClientRect)
 *  - onApply(text)   : callback ao clicar numa sugestão
 *  - onIgnore()      : callback ao clicar em "Ignorar"
 *  - onClose()
 *  - onMouseEnter / onMouseLeave : pra controlar fechamento ao mover o mouse
 *
 * Posicionamento:
 *  - Aparece ACIMA da palavra se houver espaço; senão, abaixo.
 *  - Centralizado horizontalmente sobre a palavra, mas sempre dentro da viewport.
 *
 * Defesas:
 *  - se issue ou anchorRect for inválido, retorna null (não quebra)
 */
export default function GrammarPopover({
  issue, anchorRect, onApply, onIgnore, onClose,
  onMouseEnter, onMouseLeave,
}) {
  const popRef = useRef(null);
  const [pos, setPos] = useState({ top: 0, left: 0, placement: 'bottom' });

  useLayoutEffect(() => {
    if (!anchorRect || !popRef.current) return;
    const pop = popRef.current;
    const popW = pop.offsetWidth || 280;
    const popH = pop.offsetHeight || 120;
    const margin = 8;

    // Centro horizontal sobre a palavra
    let left = anchorRect.left + anchorRect.width / 2 - popW / 2;
    // Mantém dentro da viewport
    left = Math.max(margin, Math.min(left, window.innerWidth - popW - margin));

    // Tenta acima primeiro
    let top = anchorRect.top - popH - 10;
    let placement = 'top';
    if (top < margin) {
      top = anchorRect.bottom + 10;
      placement = 'bottom';
    }
    setPos({ top, left, placement });
  }, [anchorRect, issue]);

  // Esc fecha
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!issue || !anchorRect) return null;

  const replacements = (issue.suggestions || issue.replacements || []).slice(0, 6);
  const cat = categorize(issue);
  const meta = META[cat];
  const Icon = meta.icon;

  return (
    <div
      ref={popRef}
      role="dialog"
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        zIndex: 70,
        width: 280,
        background: '#FFFFFF',
        border: '1px solid #E0D7EC',
        borderRadius: 14,
        boxShadow: '0 8px 28px rgba(45, 27, 78, 0.18)',
        overflow: 'hidden',
        animation: 'fadeIn 120ms ease-out',
      }}
    >
      {/* Cabeçalho */}
      <div className="px-3 py-2 flex items-center gap-2 border-b border-anotata-border-suave"
           style={{ backgroundColor: meta.bg }}>
        <Icon size={13} color={meta.color} strokeWidth={2.5} />
        <span className="text-[11px] uppercase font-semibold tracking-wider" style={{ color: meta.color }}>
          {meta.label}
        </span>
        <button
          onClick={onClose}
          className="ml-auto text-anotata-muted hover:text-anotata-goiaba transition-colors"
          title="Fechar"
        >
          <X size={13} />
        </button>
      </div>

      {/* Mensagem do erro */}
      {issue.message && (
        <div className="px-3 pt-2.5 pb-1 text-[12px] text-anotata-text-suave leading-snug">
          {issue.message}
        </div>
      )}

      {/* Sugestões */}
      {replacements.length > 0 ? (
        <div className="px-3 py-2 flex flex-wrap gap-1.5">
          {replacements.map((r, i) => (
            <button
              key={`${r}-${i}`}
              onClick={() => onApply && onApply(r)}
              className="px-2.5 py-1 text-[12px] rounded-md bg-anotata-lavanda-clara border border-anotata-lavanda
                         text-anotata-roxo hover:bg-anotata-roxo hover:text-white hover:border-anotata-roxo
                         transition-all font-medium"
              title={`Substituir por "${r}"`}
            >
              {r}
            </button>
          ))}
        </div>
      ) : (
        <div className="px-3 py-2 text-[11px] text-anotata-muted italic">
          Sem sugestão automática para este caso.
        </div>
      )}

      {/* Rodapé */}
      <div className="px-3 py-2 border-t border-anotata-border-suave flex items-center justify-between bg-anotata-bg">
        <button
          onClick={onIgnore}
          className="flex items-center gap-1 text-[11px] text-anotata-muted hover:text-anotata-text-suave transition-colors"
          title="Manter o texto como está"
        >
          <EyeOff size={11} />
          Ignorar
        </button>
        <span className="text-[10px] text-anotata-muted">
          Esc para fechar
        </span>
      </div>
    </div>
  );
}

const META = {
  misspelling: {
    label: 'Ortografia',
    icon: AlertCircle,
    color: '#C44862',
    bg: '#FCEEF1',
  },
  grammar: {
    label: 'Gramática',
    icon: AlertCircle,
    color: '#E8637C',
    bg: '#FCEEF1',
  },
  style: {
    label: 'Estilo',
    icon: Sparkles,
    color: '#5B2D8E',
    bg: '#F0E9F8',
  },
};

function categorize(issue) {
  const c = (issue && issue.category) || '';
  if (c === 'spell') return 'misspelling';
  if (c === 'style') return 'style';
  return 'grammar';
}
