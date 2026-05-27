import React, { useEffect, useMemo, useRef, useState, useCallback, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  X, RotateCw, Check, Info, ArrowRight, ChevronRight, ChevronDown, ArrowDown
} from 'lucide-react';
import { rephrase, MODES } from '../reescritor/index.js';

/**
 * ANOTATA — Popover compacto do Reescritor
 *
 * Diferente do `RephrasePanel` (modal full-screen pra reescrever a nota inteira),
 * este popover e um cartao flutuante de ~520px que aparece colado a selecao
 * do usuario, com:
 *
 *   - 5 chips de modo (com atalho 1-5)
 *   - Texto original (italic, cinza)
 *   - Texto reescrito (bold, preto)
 *   - Lista de mudancas (recolhida por padrao)
 *   - Botoes Cancelar / Aplicar (atalho ⏎)
 *
 * Posicionamento inteligente:
 *   - Tenta abrir abaixo da selecao
 *   - Se nao couber em baixo, abre acima
 *   - Se nao couber a direita, alinha pela direita
 *   - Sempre 12px de margem das bordas
 *
 * Atalhos:
 *   - 1..5     trocam o modo (Geral, Formal, Conciso, Fluente, Simples)
 *   - Esc      fecha
 *   - Enter    aplica
 *   - clique fora fecha
 *
 * Props:
 *   - originalText  (string)        : texto a reescrever
 *   - anchorRect    (DOMRect)       : retangulo da selecao no viewport
 *   - initialMode   (string?)       : modo inicial; default 'geral'
 *   - onApply(text) (fn)            : chamado ao aplicar
 *   - onClose()     (fn)            : chamado ao fechar
 */

const MODE_META = {
  geral:   { label: 'Geral',   tagline: 'Sem mudar o tom',           color: '#5B2D8E' },
  formal:  { label: 'Formal',  tagline: 'Registro elevado',          color: '#3D1B66' },
  conciso: { label: 'Conciso', tagline: 'Menos palavras',            color: '#0F7A3F' },
  fluente: { label: 'Fluente', tagline: 'Mais legivel',              color: '#9B6F00' },
  simples: { label: 'Simples', tagline: 'Mais acessivel',            color: '#E8637C' },
};

const POPOVER_WIDTH = 520;
const VIEWPORT_MARGIN = 12;
const SELECTION_GAP = 10;

export default function RephrasePopover({
  originalText,
  anchorRect,
  initialMode = 'geral',
  onApply,
  onClose,
  onModeChange,
}) {
  const [mode, setMode] = useState(initialMode);
  const [showChanges, setShowChanges] = useState(false);
  const popoverRef = useRef(null);

  // Notifica o orquestrador toda vez que o modo muda — isso permite "memória
  // do último modo escolhido" mesmo se o usuário fechar sem aplicar.
  useEffect(() => {
    if (onModeChange) onModeChange(mode);
  }, [mode, onModeChange]);

  const result = useMemo(() => {
    try {
      return rephrase(originalText || '', mode);
    } catch (_) {
      return { result: originalText || '', changes: [], stats: {} };
    }
  }, [originalText, mode]);

  const isIdentical = result.result === originalText;
  const totalChanges = (result.changes || []).length;

  // === POSICIONAMENTO INTELIGENTE ===
  // Mede o popover apos render e calcula uma posicao que cabe na tela.
  // Se nao couber abaixo, vira pra cima. Se a esquerda passar do limite,
  // empurra pra direita. Padrao da industria (Linear, Notion).
  const [pos, setPos] = useState({ top: 0, left: 0, ready: false });

  useLayoutEffect(() => {
    if (!popoverRef.current || !anchorRect) return;
    const rect = popoverRef.current.getBoundingClientRect();
    const winH = window.innerHeight;
    const winW = window.innerWidth;

    let top = anchorRect.bottom + SELECTION_GAP;
    let left = anchorRect.left;

    // Se passa do final embaixo, abre acima
    if (top + rect.height > winH - VIEWPORT_MARGIN) {
      const aboveTop = anchorRect.top - rect.height - SELECTION_GAP;
      if (aboveTop >= VIEWPORT_MARGIN) {
        top = aboveTop;
      } else {
        // nao cabe nem em cima nem em baixo; cola no topo
        top = VIEWPORT_MARGIN;
      }
    }

    // Se passa do final direito, empurra pra esquerda
    if (left + rect.width > winW - VIEWPORT_MARGIN) {
      left = winW - rect.width - VIEWPORT_MARGIN;
    }
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;

    setPos({ top, left, ready: true });
  }, [anchorRect, mode, showChanges]);

  // === ATALHOS DE TECLADO ===
  // Esc fecha, Enter aplica, 1-5 troca modo. Tecla repete pra navegacao limpa.
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose && onClose();
        return;
      }
      if (e.key === 'Enter' && !e.shiftKey && !isIdentical) {
        // Enter aplica somente se nao for inside um input/textarea (defensivo)
        const tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA') return;
        e.preventDefault();
        onApply && onApply(result.result);
        return;
      }
      if (/^[1-5]$/.test(e.key)) {
        e.preventDefault();
        const idx = parseInt(e.key, 10) - 1;
        if (idx >= 0 && idx < MODES.length) setMode(MODES[idx]);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onApply, result.result, isIdentical]);

  // === CLICAR FORA FECHA ===
  useEffect(() => {
    const onMouseDown = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose && onClose();
      }
    };
    // delay 0ms pra evitar fechar no mesmo clique que abriu
    const id = setTimeout(() => {
      document.addEventListener('mousedown', onMouseDown);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [onClose]);

  // === CALCULOS DE STATS COMPACTOS ===
  const charsBefore = originalText?.length || 0;
  const charsAfter = result.result?.length || 0;
  const reduction = useMemo(() => {
    if (!charsBefore) return 0;
    return Math.round(((charsBefore - charsAfter) / charsBefore) * 100);
  }, [charsBefore, charsAfter]);

  const handleApply = useCallback(() => {
    if (isIdentical) return;
    onApply && onApply(result.result);
  }, [isIdentical, onApply, result.result]);

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Reescritor"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: POPOVER_WIDTH,
        maxHeight: '70vh',
        opacity: pos.ready ? 1 : 0,
        transform: pos.ready ? 'translateY(0)' : 'translateY(-6px)',
        transition: 'opacity 180ms ease, transform 180ms ease',
        zIndex: 70,
      }}
      className="bg-white rounded-xl shadow-2xl border border-anotata-border flex flex-col overflow-hidden"
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* HEADER */}
      <div className="px-3.5 py-2.5 border-b border-anotata-border bg-anotata-sidebar flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded-md bg-anotata-roxo flex items-center justify-center shrink-0">
          <RotateCw size={12} className="text-white" />
        </div>
        <span className="text-[12px] font-semibold text-anotata-text">Reescrever trecho</span>
        <span className="text-[10px] text-anotata-muted ml-auto whitespace-nowrap">
          {charsBefore} → {charsAfter}
          {reduction > 0 && <span className="ml-1.5 text-green-700 font-semibold">−{reduction}%</span>}
          {reduction < 0 && <span className="ml-1.5 text-amber-700 font-semibold">+{Math.abs(reduction)}%</span>}
        </span>
        <button
          onClick={onClose}
          className="ml-1 p-1 rounded text-anotata-muted hover:text-anotata-goiaba hover:bg-white transition-colors"
          title="Fechar (Esc)"
          aria-label="Fechar"
        >
          <X size={13} />
        </button>
      </div>

      {/* CHIPS DE MODO */}
      <div className="px-3 py-2 border-b border-anotata-border bg-white flex gap-1 shrink-0 overflow-x-auto">
        {MODES.map((m, idx) => {
          const meta = MODE_META[m];
          const active = mode === m;
          return (
            <button
              key={m}
              onClick={() => setMode(m)}
              title={`${meta.label} — ${meta.tagline} (atalho ${idx + 1})`}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${
                active
                  ? 'text-white shadow-sm'
                  : 'bg-anotata-bg/50 border border-anotata-border text-anotata-text-suave hover:border-anotata-roxo hover:text-anotata-roxo'
              }`}
              style={active ? { backgroundColor: meta.color } : {}}
            >
              <span className={`text-[9px] font-bold ${active ? 'opacity-60' : 'opacity-40'}`}>
                {idx + 1}
              </span>
              {meta.label}
            </button>
          );
        })}
      </div>

      {/* CONTEUDO */}
      <div className="flex-1 overflow-y-auto">
        {/* ORIGINAL */}
        <div className="px-4 pt-3 pb-2.5">
          <div className="text-[10px] uppercase font-bold tracking-wider text-anotata-muted mb-1.5">
            Original
          </div>
          <div className="text-[13px] leading-relaxed text-anotata-text-suave italic break-words">
            {originalText}
          </div>
        </div>

        {/* SETA DE TRANSFORMACAO */}
        <div className="px-4 flex items-center gap-2">
          <div className="flex-1 h-px bg-anotata-border" />
          <ArrowDown size={11} className="text-anotata-roxo" />
          <div className="flex-1 h-px bg-anotata-border" />
        </div>

        {/* REESCRITO */}
        <div className="px-4 pt-2.5 pb-3">
          <div
            className="text-[10px] uppercase font-bold tracking-wider mb-1.5 flex items-center gap-1.5"
            style={{ color: MODE_META[mode].color }}
          >
            Reescrito · {MODE_META[mode].label}
          </div>
          {isIdentical ? (
            <div className="text-[12px] leading-relaxed text-anotata-text-suave italic bg-anotata-bg/40 px-2.5 py-2 rounded-md flex items-start gap-1.5">
              <Info size={12} className="shrink-0 mt-0.5 text-anotata-muted" />
              <span>Este modo não encontrou nada para alterar. Tente outro modo.</span>
            </div>
          ) : (
            <div className="text-[13px] leading-relaxed text-anotata-text font-medium break-words">
              {result.result}
            </div>
          )}
        </div>

        {/* MUDANÇAS RECOLHÍVEIS */}
        {totalChanges > 0 && (
          <div className="border-t border-anotata-border">
            <button
              onClick={() => setShowChanges(s => !s)}
              className="w-full px-4 py-2 flex items-center gap-1.5 text-[11px] text-anotata-text-suave hover:bg-anotata-sidebar/40 transition-colors"
            >
              {showChanges ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
              <span className="font-medium">
                {totalChanges} mudança{totalChanges === 1 ? '' : 's'} aplicada{totalChanges === 1 ? '' : 's'}
              </span>
            </button>
            {showChanges && (
              <div className="px-4 py-2 max-h-32 overflow-y-auto space-y-1 bg-anotata-sidebar/30 border-t border-anotata-border-suave">
                {result.changes.slice(0, 12).map((c, i) => (
                  <ChangeRow key={i} change={c} />
                ))}
                {totalChanges > 12 && (
                  <div className="text-[10px] text-anotata-muted italic px-1 pt-1">
                    + {totalChanges - 12} mudança{totalChanges - 12 === 1 ? '' : 's'} adiciona{totalChanges - 12 === 1 ? 'l' : 'is'}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER */}
      <div className="px-3.5 py-2.5 border-t border-anotata-border bg-white flex items-center gap-2 shrink-0">
        <span className="text-[10px] text-anotata-muted hidden sm:flex items-center gap-1">
          <Kbd>Esc</Kbd> fechar
          <span className="text-anotata-border mx-0.5">·</span>
          <Kbd>1-5</Kbd> trocar modo
        </span>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="px-3 py-1.5 text-[11px] text-anotata-text-suave hover:text-anotata-text transition-colors"
        >
          Cancelar
        </button>
        <button
          onClick={handleApply}
          disabled={isIdentical}
          className={`px-3 py-1.5 text-[11px] font-medium rounded-md flex items-center gap-1.5 transition-all ${
            isIdentical
              ? 'bg-anotata-bg text-anotata-muted cursor-not-allowed'
              : 'bg-anotata-roxo text-white hover:bg-anotata-roxo-escuro shadow-sm'
          }`}
        >
          <Check size={11} />
          Aplicar
          <Kbd dim>⏎</Kbd>
        </button>
      </div>
    </div>,
    document.body
  );
}

function Kbd({ children, dim }) {
  return (
    <kbd
      className={`px-1 py-0.5 rounded border text-[9px] font-mono ${
        dim
          ? 'bg-white/20 border-white/30 text-white/70'
          : 'bg-anotata-bg border-anotata-border text-anotata-text-suave'
      }`}
      style={{ lineHeight: 1 }}
    >
      {children}
    </kbd>
  );
}

function ChangeRow({ change }) {
  const meta = ruleMeta[change.rule?.split(':')[0]] || ruleMeta.default;
  const truncate = (s, n) => (s && s.length > n ? s.slice(0, n - 1) + '…' : s);
  return (
    <div className="flex items-start gap-1.5 text-[11px] py-0.5">
      <span
        className="px-1.5 py-0.5 rounded text-[8px] uppercase font-bold tracking-wide shrink-0 mt-0.5"
        style={{ backgroundColor: meta.bg, color: meta.color }}
        title={change.rule}
      >
        {meta.label}
      </span>
      <div className="flex-1 min-w-0">
        <span className="text-anotata-goiaba line-through opacity-70">"{truncate(change.from, 40)}"</span>
        <ArrowRight size={9} className="inline mx-1 text-anotata-muted" />
        <span className="text-anotata-roxo font-medium">"{truncate(change.to, 40)}"</span>
      </div>
    </div>
  );
}

const ruleMeta = {
  default:         { label: 'mudança',   bg: '#EDE8F2', color: '#5B2D8E' },
  gerundism:       { label: 'gerundismo',  bg: '#FFF4D9', color: '#9B6F00' },
  redundancy:      { label: 'pleonasmo',   bg: '#FCEEF1', color: '#C44862' },
  colloquialism:   { label: 'coloquial',   bg: '#F0E9F8', color: '#5B2D8E' },
  connectors:      { label: 'conector',    bg: '#EDE8F2', color: '#5B2D8E' },
  simplification:  { label: 'simples',     bg: '#FFE3E8', color: '#E8637C' },
  voice:           { label: 'voz ativa',   bg: '#D4F4DD', color: '#0F7A3F' },
  clause:          { label: 'quebra',      bg: '#D4F4DD', color: '#0F7A3F' },
  concise:         { label: 'enxugar',     bg: '#D4F4DD', color: '#0F7A3F' },
  cacofonia:       { label: 'som ruim',    bg: '#FFE7D9', color: '#9B4E00' },
  nominalizacao:   { label: 'verbo direto', bg: '#E0F2FA', color: '#1A5C99' },
};
