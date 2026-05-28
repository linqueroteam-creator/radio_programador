import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { X, Map as MapIcon, Plus, Sparkles, Compass, BookOpen } from 'lucide-react';
import { NOTE_TYPES } from '../engine/RulesEngine';
import rulesEngine from '../engine/RulesEngine';

/**
 * ===== MAPA VISUAL — ECOSSISTEMA PESSOAL (v2 polido) =====
 *
 * Hierarquia conceitual:
 *   NÍVEL 1 (centro) — "Meu Espaço" (o eu, o núcleo, ponto de origem)
 *   NÍVEL 2 (1º anel) — Cadernos (agrupadores)
 *   NÍVEL 3 (2º anel) — Anotações (ligadas ao caderno-pai)
 *   NÍVEL 4 (arcos)  — Conexões entre anotações (manuais + sugeridas)
 *
 * Refinamentos R1 sobre v1:
 *  - Centro pulsa suavemente (loop 4s) — sensação de respiração
 *  - Animação coreografada de entrada: centro → cadernos → notas → conexões
 *  - Hover expressivo com "highlight de subconjunto":
 *    quando hover num caderno, ele e suas notas-filhas ganham saturação;
 *    o resto do mapa entra em modo fantasma
 *  - Conexões tracejadas têm fluxo animado quando destacadas
 *  - Tipografia system-ui com hierarquia clara
 *  - Posicionamento adaptativo: 1 caderno → arco lateral; 2+ → radial
 *  - Tooltips nativos via <title> em cada elemento
 *  - Estado vazio mais convidativo (com botão criar nota)
 *  - Ícones polidos (livro Lucide-style, pessoa estilizada)
 *
 * Implementação 100% SVG nativa + animação CSS — sem dependência nova.
 *
 * Segurança:
 *  - TODOS os hooks ANTES de qualquer early return (Rules of Hooks)
 *  - Defensivo: ?., || [], try
 *  - Não toca em useStore além de funções já existentes
 */

// === Paletas ===
const FORCE_PALETTE = {
  forte: { stroke: '#0F7A3F', fill: '#D4F4DD', label: 'forte' },
  média: { stroke: '#9B6F00', fill: '#FFF4D9', label: 'média' },
  fraca: { stroke: '#5B2D8E', fill: '#EDE8F2', label: 'fraca' },
};
const MANUAL_PALETTE = { stroke: '#5B2D8E', fill: '#FFFFFF', label: 'manual' };

// Fonte usada em todos os <text> do SVG
const SVG_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Helvetica Neue", Arial, sans-serif';


// === CSS embutido no SVG (animações + classes utilitárias) ===
// Usar `<style>` dentro do SVG é seguro em todos os navegadores modernos.
const SVG_STYLE = `
  @keyframes anotata-pulse {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.04); opacity: 0.92; }
  }
  @keyframes anotata-halo {
    0%, 100% { opacity: 0.18; }
    50% { opacity: 0.32; }
  }
  @keyframes anotata-fade-up {
    0% { opacity: 0; transform: translateY(8px) scale(0.85); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes anotata-fade-in {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  @keyframes anotata-flow {
    0% { stroke-dashoffset: 0; }
    100% { stroke-dashoffset: -18; }
  }

  .a-center-core {
    transform-origin: center;
    transform-box: fill-box;
    animation: anotata-pulse 4s ease-in-out infinite, anotata-fade-up 600ms ease-out both;
  }
  .a-center-halo {
    animation: anotata-halo 4s ease-in-out infinite, anotata-fade-in 800ms ease-out both;
  }
  .a-notebook {
    transform-origin: center;
    transform-box: fill-box;
    transition: transform 220ms cubic-bezier(.2,.7,.3,1.1), filter 220ms ease;
    animation: anotata-fade-up 500ms ease-out both;
  }
  .a-notebook:hover { transform: translateY(-3px) scale(1.04); }
  .a-note {
    transform-origin: center;
    transform-box: fill-box;
    transition: transform 200ms ease, filter 200ms ease;
    animation: anotata-fade-up 450ms ease-out both;
  }
  .a-note:hover { transform: scale(1.12); }
  .a-connection {
    transition: stroke-width 220ms ease, opacity 220ms ease;
    animation: anotata-fade-in 700ms ease-out both;
  }
  .a-connection.is-flow { animation: anotata-flow 1.6s linear infinite, anotata-fade-in 700ms ease-out both; }
  .a-structural {
    transition: opacity 220ms ease, stroke-width 220ms ease;
    animation: anotata-fade-in 600ms ease-out both;
  }
  .a-ghost { opacity: 0.18 !important; filter: saturate(0.4); }
  .a-spotlight { filter: drop-shadow(0 4px 14px rgba(91,45,142,0.25)); }
`;


// === Helpers ===

// Distribui N pontos em um círculo. Aceita ângulo inicial customizado.
function radialPositions(count, radius, cx, cy, startAngle = -Math.PI / 2, sweep = Math.PI * 2) {
  if (count <= 0) return [];
  if (count === 1) return [{ x: cx + Math.cos(startAngle) * radius, y: cy + Math.sin(startAngle) * radius, angle: startAngle }];
  const step = sweep / count;
  return Array.from({ length: count }, (_, i) => {
    const a = startAngle + i * step;
    return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius, angle: a };
  });
}

// Posicionamento adaptativo dos cadernos no 1º anel
function placeNotebooks(notebooks, cx, cy, radius) {
  const n = notebooks.length;
  if (n === 0) return [];
  // 1 caderno: à direita (0°) — não fica isolado no topo
  if (n === 1) return radialPositions(1, radius, cx, cy, 0);
  // 2 cadernos: opostos horizontalmente (0° e 180°)
  if (n === 2) return [
    { x: cx + radius, y: cy, angle: 0 },
    { x: cx - radius, y: cy, angle: Math.PI },
  ];
  // 3+: distribuição radial uniforme começando do topo
  return radialPositions(n, radius, cx, cy, -Math.PI / 2);
}

function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '\u2026' : str;
}


// ================== COMPONENTE PRINCIPAL ==================

export default function ConnectionMap({ note, store, onClose }) {
  // ====== TODOS OS HOOKS NO TOPO ======
  const [hoveredId, setHoveredId] = useState(null);
  const [hoveredType, setHoveredType] = useState(null); // 'notebook' | 'note' | null

  // ESC fecha
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Cadernos
  const notebooks = useMemo(() => {
    return (store.notebooks || []).filter(nb => nb && nb.id);
  }, [store.notebooks]);

  // Notas ativas agrupadas por caderno
  const notesByNotebook = useMemo(() => {
    const map = {};
    (store.notes || []).forEach(n => {
      if (n.isTrash || n.isArchived) return;
      const nbId = n.notebookId || (notebooks[0]?.id) || 'default';
      if (!map[nbId]) map[nbId] = [];
      map[nbId].push(n);
    });
    return map;
  }, [store.notes, notebooks]);


  // Conexões inter-notas (manuais + sugeridas, dedupe)
  const interNoteConnections = useMemo(() => {
    const connections = [];
    const seen = new Set();
    const activeNotes = (store.notes || []).filter(n => !n.isTrash && !n.isArchived);
    activeNotes.forEach(n => {
      // Manuais
      (n.manualConnections || []).forEach(c => {
        const targetId = typeof c === 'string' ? c : c?.noteId;
        const reason = typeof c === 'string' ? '' : (c?.reason || '');
        if (!targetId) return;
        const target = store.getNoteById(targetId);
        if (!target || target.isTrash || target.isArchived) return;
        const key = [n.id, targetId].sort().join('-');
        if (seen.has(key)) return;
        seen.add(key);
        connections.push({ key, sourceId: n.id, targetId, reason, kind: 'manual' });
      });
      // Sugeridas
      try {
        const suggested = rulesEngine.suggestConnections(n, store.notes, 4) || [];
        suggested.forEach(s => {
          const target = store.getNoteById(s.noteId);
          if (!target || target.isTrash || target.isArchived) return;
          const key = [n.id, s.noteId].sort().join('-');
          if (seen.has(key)) return;
          seen.add(key);
          connections.push({
            key, sourceId: n.id, targetId: s.noteId,
            reason: (s.reasons && s.reasons[0]) || 'sugerida',
            strength: s.strength || 'fraca', kind: 'suggested',
          });
        });
      } catch (_) { /* defensivo */ }
    });
    return connections;
  }, [store.notes]);


  // Layout completo: centro fixo + 1º anel (cadernos) + 2º anel (notas)
  const layout = useMemo(() => {
    const VIEW = 1000;
    const cx = VIEW / 2;
    const cy = VIEW / 2;
    const RING1 = 220;
    const RING2 = 410;

    const nbPositions = placeNotebooks(notebooks, cx, cy, RING1);
    const notebookNodes = notebooks.map((nb, i) => ({
      id: nb.id,
      type: 'notebook',
      label: nb.name || 'Caderno',
      color: nb.color || '#5B2D8E',
      ...nbPositions[i],
    }));

    // Notas: spread angular adaptativo ao redor do caderno-pai
    const noteNodes = [];
    notebooks.forEach((nb, nbIdx) => {
      const notes = notesByNotebook[nb.id] || [];
      if (notes.length === 0) return;
      const baseAngle = nbPositions[nbIdx]?.angle ?? -Math.PI / 2;

      // Spread maior quando há poucos cadernos (mais espaço pra ocupar)
      let maxSpread;
      if (notebooks.length === 1) maxSpread = Math.PI * 1.5;     // 270°
      else if (notebooks.length === 2) maxSpread = Math.PI * 0.9; // 162°
      else maxSpread = Math.min(Math.PI / 2.2, (Math.PI * 2 / notebooks.length) * 0.85);

      const step = notes.length > 1 ? maxSpread / (notes.length - 1) : 0;
      const startA = baseAngle - maxSpread / 2;

      notes.forEach((nt, nIdx) => {
        const a = notes.length === 1 ? baseAngle : startA + nIdx * step;
        noteNodes.push({
          id: nt.id,
          type: 'note',
          label: nt.title || 'Sem título',
          noteType: nt.type || 'rascunho',
          notebookId: nb.id,
          isFavorite: nt.isFavorite,
          x: cx + Math.cos(a) * RING2,
          y: cy + Math.sin(a) * RING2,
          angle: a,
        });
      });
    });

    return { cx, cy, view: VIEW, notebookNodes, noteNodes, ring1: RING1, ring2: RING2 };
  }, [notebooks, notesByNotebook]);


  // Handlers
  const handleOpenNote = useCallback((noteId) => {
    if (!noteId) return;
    store.setSelectedNoteId(noteId);
    store.setCurrentView('all');
    onClose();
  }, [store, onClose]);

  const handleCreateNote = useCallback(() => {
    if (typeof store.createNote === 'function') {
      try {
        // Usa o primeiro caderno existente se houver, senão 'default'
        const firstNbId = (notebooks[0] && notebooks[0].id) || 'default';
        store.createNote(firstNbId); // já chama setSelectedNoteId internamente
        store.setCurrentView('all');
      } catch (_) { /* defensivo */ }
    }
    onClose();
  }, [store, onClose, notebooks]);

  // Highlight de subconjunto: quando hover num caderno ou nota, calcula
  // quais ids fazem parte do "destaque" (caderno + suas notas + linhas)
  const highlightSet = useMemo(() => {
    if (!hoveredId) return null;
    const set = new Set([hoveredId]);
    if (hoveredType === 'notebook') {
      // Caderno em hover: incluir todas as notas-filhas
      layout.noteNodes.forEach(nn => {
        if (nn.notebookId === hoveredId) set.add(nn.id);
      });
    } else if (hoveredType === 'note') {
      // Nota em hover: incluir o caderno-pai e notas conectadas (manuais/sugeridas)
      const note = layout.noteNodes.find(nn => nn.id === hoveredId);
      if (note) set.add(note.notebookId);
      interNoteConnections.forEach(c => {
        if (c.sourceId === hoveredId) set.add(c.targetId);
        if (c.targetId === hoveredId) set.add(c.sourceId);
      });
    }
    return set;
  }, [hoveredId, hoveredType, layout.noteNodes, interNoteConnections]);

  // ====== SEM HOOKS NOVOS A PARTIR DAQUI ======
  const totalNotes = layout.noteNodes.length;
  const totalNotebooks = layout.notebookNodes.length;
  const totalConnections = interNoteConnections.length;
  const isEmpty = totalNotebooks === 0 && totalNotes === 0;
  const onlyNotebooksNoNotes = totalNotebooks > 0 && totalNotes === 0;


  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(45, 27, 78, 0.55)', backdropFilter: 'blur(6px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Mapa visual — ecossistema pessoal"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] max-h-[90vh] flex flex-col overflow-hidden border border-anotata-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="px-5 py-3 border-b border-anotata-border bg-anotata-sidebar flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-anotata-roxo to-anotata-roxo-escuro flex items-center justify-center text-white shadow-sm">
            <Compass size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-anotata-text">Meu Ecossistema</h2>
            <p className="text-xs text-anotata-muted truncate">
              {totalNotebooks} {totalNotebooks === 1 ? 'caderno' : 'cadernos'} · {totalNotes} {totalNotes === 1 ? 'anotação' : 'anotações'} · {totalConnections} {totalConnections === 1 ? 'conexão' : 'conexões'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-anotata-muted hover:text-anotata-goiaba hover:bg-white transition-colors focus-visible:ring-2 focus-visible:ring-anotata-roxo/50"
            aria-label="Fechar mapa"
            title="Fechar (Esc)"
          >
            <X size={16} />
          </button>
        </div>

        {/* LEGENDA */}
        <div className="px-5 py-2 bg-anotata-bg border-b border-anotata-border flex items-center gap-x-4 gap-y-1 text-xs text-anotata-text-suave flex-wrap">
          <LegendDot color="#5B2D8E" label="Núcleo (você)" />
          <LegendSquare color="#3D1B66" label="Caderno" />
          <LegendCircle color="#FFFFFF" border="#5B2D8E" label="Anotação" />
          <span className="text-anotata-border">·</span>
          <LegendLine color="#5B2D8E" dashed={false} label="Pertence" />
          <LegendLine color="#0F7A3F" dashed={true} label="Forte" />
          <LegendLine color="#9B6F00" dashed={true} label="Média" />
          <LegendLine color="#5B2D8E" dashed={true} label="Fraca" />
        </div>

        {/* CORPO */}
        <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-anotata-bg via-white to-anotata-lavanda-clara">
          {isEmpty ? (
            <MapEmptyState onClose={onClose} onCreate={handleCreateNote} hasNotebookNoNotes={false} />
          ) : onlyNotebooksNoNotes ? (
            <MapEmptyState onClose={onClose} onCreate={handleCreateNote} hasNotebookNoNotes={true} />
          ) : (
            <EcosystemSvg
              layout={layout}
              connections={interNoteConnections}
              hoveredId={hoveredId}
              hoveredType={hoveredType}
              highlightSet={highlightSet}
              setHoveredId={setHoveredId}
              setHoveredType={setHoveredType}
              onOpenNote={handleOpenNote}
            />
          )}
        </div>

        {/* PAINEL INFERIOR */}
        <EcosystemDetailPanel
          hoveredId={hoveredId}
          hoveredType={hoveredType}
          layout={layout}
          onOpen={handleOpenNote}
        />
      </div>
    </div>
  );
}


// ================== LEGENDAS ==================

function LegendDot({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <svg width="12" height="12" aria-hidden="true">
        <circle cx="6" cy="6" r="5" fill={color} />
      </svg>
      {label}
    </span>
  );
}

function LegendSquare({ color, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <svg width="12" height="12" aria-hidden="true">
        <rect x="1.5" y="1.5" width="9" height="9" rx="2" fill={color} />
      </svg>
      {label}
    </span>
  );
}

function LegendCircle({ color, border, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <svg width="12" height="12" aria-hidden="true">
        <circle cx="6" cy="6" r="4.5" fill={color} stroke={border} strokeWidth="1.5" />
      </svg>
      {label}
    </span>
  );
}

function LegendLine({ color, dashed, label }) {
  return (
    <span className="flex items-center gap-1.5">
      <svg width="20" height="6" aria-hidden="true">
        <line
          x1="0" y1="3" x2="20" y2="3"
          stroke={color}
          strokeWidth="2"
          strokeDasharray={dashed ? '4 3' : '0'}
          strokeLinecap="round"
        />
      </svg>
      {label}
    </span>
  );
}


// ================== SVG PRINCIPAL ==================

function EcosystemSvg({ layout, connections, hoveredId, hoveredType, highlightSet, setHoveredId, setHoveredType, onOpenNote }) {
  const { cx, cy, view, notebookNodes, noteNodes, ring1, ring2 } = layout;

  // Mapa rápido de posição por id (para desenhar conexões)
  const posById = useMemo(() => {
    const m = {};
    noteNodes.forEach(n => { m[n.id] = { x: n.x, y: n.y }; });
    notebookNodes.forEach(nb => { m[nb.id] = { x: nb.x, y: nb.y }; });
    return m;
  }, [noteNodes, notebookNodes]);

  // Helper: um id está "fantasma" (escurecido) quando há highlight ativo e ele não pertence
  const isGhost = (id) => highlightSet && !highlightSet.has(id);

  // Atrasos de cascata (entrada coreografada)
  const delayCenter = 0;
  const delayNotebookBase = 200;   // depois do centro
  const delayNoteBase = 200 + notebookNodes.length * 80 + 100; // depois dos cadernos
  const delayConnections = delayNoteBase + noteNodes.length * 30 + 100;


  return (
    <svg
      viewBox={`0 0 ${view} ${view}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full"
      style={{ fontFamily: SVG_FONT }}
    >
      {/* CSS embutido — animações + utilitários */}
      <style>{SVG_STYLE}</style>

      <defs>
        <radialGradient id="centerHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5B2D8E" stopOpacity="0.35" />
          <stop offset="60%" stopColor="#5B2D8E" stopOpacity="0.06" />
          <stop offset="100%" stopColor="#5B2D8E" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="centerCore" cx="35%" cy="35%" r="80%">
          <stop offset="0%" stopColor="#7B4DBA" />
          <stop offset="60%" stopColor="#5B2D8E" />
          <stop offset="100%" stopColor="#3D1B66" />
        </radialGradient>
        <pattern id="dotgrid" patternUnits="userSpaceOnUse" width="44" height="44">
          <circle cx="22" cy="22" r="1" fill="#5B2D8E" opacity="0.045" />
        </pattern>
        <filter id="softShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#3D1B66" floodOpacity="0.15" />
        </filter>
      </defs>

      {/* Fundo com pontos sutis */}
      <rect x="0" y="0" width={view} height={view} fill="url(#dotgrid)" />

      {/* Halo do centro (pulsa com o núcleo) */}
      <circle
        cx={cx} cy={cy} r={300}
        fill="url(#centerHalo)"
        className="a-center-halo"
      />

      {/* Anéis-guia muito sutis */}
      <circle cx={cx} cy={cy} r={ring1} fill="none" stroke="#5B2D8E" strokeWidth="0.6" strokeDasharray="3 7" opacity="0.12" className="a-structural" style={{ animationDelay: '300ms' }} />
      <circle cx={cx} cy={cy} r={ring2} fill="none" stroke="#5B2D8E" strokeWidth="0.5" strokeDasharray="2 9" opacity="0.08" className="a-structural" style={{ animationDelay: '400ms' }} />


      {/* === NÍVEL 4: Conexões inter-notas (arcos atrás de tudo) === */}
      {connections.map((conn) => {
        const src = posById[conn.sourceId];
        const tgt = posById[conn.targetId];
        if (!src || !tgt) return null;
        const palette = conn.kind === 'manual' ? MANUAL_PALETTE : (FORCE_PALETTE[conn.strength] || FORCE_PALETTE.fraca);
        const isHighlight = hoveredId && (hoveredId === conn.sourceId || hoveredId === conn.targetId);
        const isDimmed = highlightSet && !isHighlight;
        // Curva desviando do centro para evitar passar por cima dele
        const midX = (src.x + tgt.x) / 2 + (cy - (src.y + tgt.y) / 2) * 0.32;
        const midY = (src.y + tgt.y) / 2 + ((src.x + tgt.x) / 2 - cx) * 0.32;
        return (
          <path
            key={`conn-${conn.key}`}
            d={`M ${src.x} ${src.y} Q ${midX} ${midY} ${tgt.x} ${tgt.y}`}
            fill="none"
            stroke={palette.stroke}
            strokeWidth={isHighlight ? 2.8 : 1.4}
            strokeDasharray={conn.kind === 'manual' ? '0' : '6 5'}
            strokeLinecap="round"
            opacity={isDimmed ? 0.12 : (isHighlight ? 0.85 : 0.45)}
            className={`a-connection ${isHighlight && conn.kind !== 'manual' ? 'is-flow' : ''}`}
            style={{ animationDelay: `${delayConnections}ms` }}
          >
            <title>{conn.kind === 'manual' ? `Conexão manual: ${conn.reason || 'sem motivo'}` : `Conexão ${conn.strength || 'sugerida'}: ${conn.reason || ''}`}</title>
          </path>
        );
      })}

      {/* === Linhas estruturais centro → cadernos === */}
      {notebookNodes.map((nb, idx) => {
        const dim = highlightSet && !highlightSet.has(nb.id);
        return (
          <line
            key={`struct-c-${nb.id}`}
            x1={cx} y1={cy} x2={nb.x} y2={nb.y}
            stroke="#3D1B66"
            strokeWidth={hoveredId === nb.id ? 2.5 : 1.6}
            strokeLinecap="round"
            opacity={dim ? 0.12 : (hoveredId === nb.id ? 0.65 : 0.3)}
            className="a-structural"
            style={{ animationDelay: `${delayNotebookBase + idx * 80}ms` }}
          />
        );
      })}

      {/* === Linhas caderno → notas (pertencimento) === */}
      {noteNodes.map((nn, idx) => {
        const parent = notebookNodes.find(nb => nb.id === nn.notebookId);
        if (!parent) return null;
        const dim = highlightSet && !(highlightSet.has(nn.id) || highlightSet.has(parent.id));
        const lit = hoveredId === nn.id || hoveredId === parent.id;
        return (
          <line
            key={`struct-n-${nn.id}`}
            x1={parent.x} y1={parent.y} x2={nn.x} y2={nn.y}
            stroke={parent.color || '#5B2D8E'}
            strokeWidth={lit ? 1.8 : 1}
            strokeLinecap="round"
            opacity={dim ? 0.1 : (lit ? 0.55 : 0.28)}
            className="a-structural"
            style={{ animationDelay: `${delayNoteBase + idx * 30}ms` }}
          />
        );
      })}


      {/* === NÍVEL 1: Núcleo (Meu Espaço) === */}
      <g className="a-spotlight" style={{ animationDelay: `${delayCenter}ms` }}>
        {/* Anel externo branco (cria respiro entre halo e núcleo) */}
        <circle cx={cx} cy={cy} r={82} fill="#FFFFFF" opacity="0.95" />
        {/* Núcleo com gradiente radial e pulso */}
        <g className="a-center-core">
          <circle cx={cx} cy={cy} r={68} fill="url(#centerCore)" />
          {/* Borda fina do núcleo */}
          <circle cx={cx} cy={cy} r={68} fill="none" stroke="#FFFFFF" strokeWidth="1.5" opacity="0.4" />
          {/* Ícone de pessoa estilizado (linhas elegantes) */}
          {/* Cabeça */}
          <circle cx={cx} cy={cy - 14} r={11} fill="none" stroke="#FFFFFF" strokeWidth="2.4" />
          {/* Tronco — arco aberto no topo */}
          <path
            d={`M ${cx - 18} ${cy + 18}
                C ${cx - 18} ${cy + 4}, ${cx - 8} ${cy - 2}, ${cx} ${cy - 2}
                C ${cx + 8} ${cy - 2}, ${cx + 18} ${cy + 4}, ${cx + 18} ${cy + 18}`}
            fill="none" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round"
          />
        </g>
        {/* Texto "MEU ESPAÇO" abaixo do núcleo, em destaque */}
        <text
          x={cx} y={cy + 110}
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fill="#3D1B66"
          letterSpacing="3"
          fontFamily={SVG_FONT}
        >
          MEU ESPAÇO
        </text>
        <title>O centro do seu ecossistema — você</title>
      </g>


      {/* === NÍVEL 2: Cadernos === */}
      {notebookNodes.map((nb, idx) => {
        const isHover = hoveredId === nb.id && hoveredType === 'notebook';
        const dim = highlightSet && !highlightSet.has(nb.id);
        const noteCount = noteNodes.filter(n => n.notebookId === nb.id).length;
        const r = 44;
        return (
          <g
            key={`nb-${nb.id}`}
            className={`a-notebook ${dim ? 'a-ghost' : ''} ${isHover ? 'a-spotlight' : ''}`}
            style={{ cursor: 'pointer', animationDelay: `${delayNotebookBase + idx * 80}ms` }}
            onMouseEnter={() => { setHoveredId(nb.id); setHoveredType('notebook'); }}
            onMouseLeave={() => { setHoveredId(null); setHoveredType(null); }}
            tabIndex={0}
            role="button"
            aria-label={`Caderno ${nb.label}, ${noteCount} ${noteCount === 1 ? 'nota' : 'notas'}`}
          >
            <title>{nb.label} — {noteCount} {noteCount === 1 ? 'nota' : 'notas'}</title>
            {/* Sombra suave do card */}
            <rect x={nb.x - r} y={nb.y - r + 4} width={r * 2} height={r * 2} rx={14} fill="#3D1B66" opacity="0.1" />
            {/* Card de fundo claro */}
            <rect
              x={nb.x - r} y={nb.y - r} width={r * 2} height={r * 2}
              rx={14}
              fill="#FFFFFF"
              stroke={nb.color || '#5B2D8E'}
              strokeWidth={isHover ? 2.5 : 1.8}
            />
            {/* Faixa colorida lateral (identidade do caderno) */}
            <rect
              x={nb.x - r} y={nb.y - r} width={6} height={r * 2}
              rx={3}
              fill={nb.color || '#5B2D8E'}
            />
            {/* Ícone de livro (semi-aberto) — desenhado em path elegante */}
            <g transform={`translate(${nb.x - 14}, ${nb.y - 18})`} fill={nb.color || '#5B2D8E'} opacity="0.92">
              <path d="M 2 2 L 13 2 L 13 28 L 2 28 Z" />
              <path d="M 15 2 L 26 2 L 26 28 L 15 28 Z" />
              <line x1="14" y1="2" x2="14" y2="28" stroke="#FFFFFF" strokeWidth="0.8" opacity="0.5" />
              <line x1="5" y1="8" x2="10" y2="8" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
              <line x1="5" y1="12" x2="10" y2="12" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
              <line x1="18" y1="8" x2="23" y2="8" stroke="#FFFFFF" strokeWidth="1.2" strokeLinecap="round" opacity="0.85" />
              <line x1="18" y1="12" x2="23" y2="12" stroke="#FFFFFF" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
            </g>
            {/* Contador de notas */}
            <text
              x={nb.x} y={nb.y + 26}
              textAnchor="middle"
              fontSize="10"
              fontWeight="600"
              fill={nb.color || '#5B2D8E'}
              fontFamily={SVG_FONT}
            >
              {noteCount} {noteCount === 1 ? 'nota' : 'notas'}
            </text>
            {/* Título abaixo do card */}
            <text
              x={nb.x} y={nb.y + r + 22}
              textAnchor="middle"
              fontSize="13"
              fontWeight="600"
              fill="#2D1B4E"
              fontFamily={SVG_FONT}
            >
              {truncate(nb.label, 20)}
            </text>
          </g>
        );
      })}


      {/* === NÍVEL 3: Anotações === */}
      {noteNodes.map((nn, idx) => {
        const isHover = hoveredId === nn.id && hoveredType === 'note';
        const dim = highlightSet && !highlightSet.has(nn.id);
        const tType = NOTE_TYPES[nn.noteType] || NOTE_TYPES.rascunho;
        const parentNb = notebookNodes.find(nb => nb.id === nn.notebookId);
        const borderColor = parentNb?.color || '#5B2D8E';
        const r = 32;
        return (
          <g
            key={`note-${nn.id}`}
            className={`a-note ${dim ? 'a-ghost' : ''} ${isHover ? 'a-spotlight' : ''}`}
            style={{ cursor: 'pointer', animationDelay: `${delayNoteBase + idx * 30}ms` }}
            onMouseEnter={() => { setHoveredId(nn.id); setHoveredType('note'); }}
            onMouseLeave={() => { setHoveredId(null); setHoveredType(null); }}
            onClick={() => onOpenNote(nn.id)}
            tabIndex={0}
            role="button"
            aria-label={`Anotação ${nn.label}, abrir`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenNote(nn.id); } }}
          >
            <title>{nn.label}{parentNb ? ` — ${parentNb.label}` : ''}</title>
            {/* Sombra suave */}
            <circle cx={nn.x} cy={nn.y + 2} r={r} fill="#3D1B66" opacity="0.08" />
            {/* Anel colorido fino (cor do caderno-pai) */}
            <circle cx={nn.x} cy={nn.y} r={r + 2} fill="none" stroke={borderColor} strokeWidth="1" opacity="0.35" />
            {/* Card circular branco */}
            <circle
              cx={nn.x} cy={nn.y} r={r}
              fill="#FFFFFF"
              stroke={borderColor}
              strokeWidth={isHover ? 2.4 : 1.4}
            />
            {/* Ícone do tipo (emoji) */}
            <text
              x={nn.x} y={nn.y + 1}
              textAnchor="middle"
              fontSize="22"
              dominantBaseline="middle"
            >
              {tType.icon}
            </text>
            {/* Estrela de favorito (canto superior direito) */}
            {nn.isFavorite && (
              <g transform={`translate(${nn.x + r - 8}, ${nn.y - r + 8})`}>
                <circle cx="0" cy="0" r="7" fill="#FFFFFF" />
                <path
                  d="M 0 -5 L 1.5 -1.5 L 5 -1.5 L 2.2 0.7 L 3.3 4 L 0 2 L -3.3 4 L -2.2 0.7 L -5 -1.5 L -1.5 -1.5 Z"
                  fill="#F0B400"
                  stroke="#F0B400"
                  strokeWidth="0.8"
                  strokeLinejoin="round"
                />
              </g>
            )}
            {/* Título abaixo */}
            <text
              x={nn.x} y={nn.y + r + 18}
              textAnchor="middle"
              fontSize="11"
              fontWeight="500"
              fill="#2D1B4E"
              fontFamily={SVG_FONT}
            >
              {truncate(nn.label, 18)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}


// ================== PAINEL INFERIOR ==================

function EcosystemDetailPanel({ hoveredId, hoveredType, layout, onOpen }) {
  if (!hoveredId) {
    return (
      <div className="px-5 py-3 border-t border-anotata-border bg-anotata-sidebar text-xs text-anotata-muted flex items-center gap-2">
        <Sparkles size={12} className="text-anotata-roxo" />
        Passe o mouse sobre um caderno ou anotação para ver detalhes · Clique numa anotação para abrir
      </div>
    );
  }

  if (hoveredType === 'notebook') {
    const nb = layout.notebookNodes.find(n => n.id === hoveredId);
    if (!nb) return null;
    const noteCount = layout.noteNodes.filter(n => n.notebookId === nb.id).length;
    return (
      <div className="px-5 py-3 border-t border-anotata-border bg-anotata-sidebar flex items-center gap-3">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shadow-sm"
          style={{ backgroundColor: nb.color || '#5B2D8E' }}
        >
          <BookOpen size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-anotata-text">{nb.label}</div>
          <div className="text-xs text-anotata-muted">
            Caderno · {noteCount} {noteCount === 1 ? 'anotação' : 'anotações'}
          </div>
        </div>
      </div>
    );
  }

  if (hoveredType === 'note') {
    const nn = layout.noteNodes.find(n => n.id === hoveredId);
    if (!nn) return null;
    const tType = NOTE_TYPES[nn.noteType] || NOTE_TYPES.rascunho;
    const parentNb = layout.notebookNodes.find(nb => nb.id === nn.notebookId);
    return (
      <div className="px-5 py-3 border-t border-anotata-border bg-anotata-sidebar flex items-center gap-3">
        <span className="text-2xl leading-none">{tType.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-sm font-semibold text-anotata-text truncate max-w-md">{nn.label}</span>
            <span className="text-2xs uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-anotata-lavanda text-anotata-roxo">
              {tType.label || nn.noteType}
            </span>
            {nn.isFavorite && (
              <span className="text-2xs font-semibold text-anotata-favorite">★ favorita</span>
            )}
          </div>
          {parentNb && (
            <div className="text-xs text-anotata-text-suave flex items-center gap-1">
              <span
                className="inline-block w-2 h-2 rounded-full"
                style={{ backgroundColor: parentNb.color || '#5B2D8E' }}
                aria-hidden="true"
              />
              {parentNb.label}
            </div>
          )}
        </div>
        <button
          onClick={() => onOpen(nn.id)}
          className="px-3 py-1.5 text-xs font-medium bg-anotata-roxo text-white rounded-md hover:bg-anotata-roxo-escuro transition-colors focus-visible:ring-2 focus-visible:ring-anotata-roxo/50 shrink-0"
        >
          Abrir nota
        </button>
      </div>
    );
  }

  return null;
}


// ================== ESTADO VAZIO ==================

function MapEmptyState({ onClose, onCreate, hasNotebookNoNotes }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        {/* Ilustração SVG decorativa: núcleo + sementes orbitando (estática) */}
        <div className="mx-auto mb-6 relative" style={{ width: 140, height: 140 }}>
          <svg viewBox="0 0 140 140" width="140" height="140" aria-hidden="true">
            <defs>
              <radialGradient id="emptyHalo" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#5B2D8E" stopOpacity="0.18" />
                <stop offset="100%" stopColor="#5B2D8E" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="emptyCore" cx="35%" cy="35%" r="80%">
                <stop offset="0%" stopColor="#7B4DBA" />
                <stop offset="100%" stopColor="#3D1B66" />
              </radialGradient>
            </defs>
            <circle cx="70" cy="70" r="65" fill="url(#emptyHalo)" />
            <circle cx="70" cy="70" r="46" fill="none" stroke="#5B2D8E" strokeWidth="0.7" strokeDasharray="3 5" opacity="0.25" />
            <circle cx="70" cy="70" r="28" fill="url(#emptyCore)" />
            <circle cx="70" cy="62" r="5" fill="none" stroke="#FFFFFF" strokeWidth="1.6" />
            <path
              d="M 60 78 C 60 70, 65 67, 70 67 C 75 67, 80 70, 80 78"
              fill="none" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round"
            />
            {/* Sementes ao redor */}
            <circle cx="116" cy="70" r="6" fill="#FFFFFF" stroke="#5B2D8E" strokeWidth="1.4" />
            <circle cx="24" cy="70" r="6" fill="#FFFFFF" stroke="#5B2D8E" strokeWidth="1.4" />
            <circle cx="70" cy="116" r="6" fill="#FFFFFF" stroke="#5B2D8E" strokeWidth="1.4" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-anotata-text mb-2">
          {hasNotebookNoNotes
            ? 'Seu mapa está pronto pra crescer'
            : 'Seu mapa ainda está começando'}
        </h3>
        <p className="text-sm text-anotata-text-suave mb-5">
          {hasNotebookNoNotes
            ? 'Você já tem um caderno. Crie sua primeira anotação para vê-la aparecer no ecossistema.'
            : 'Cada anotação que você criar vai aparecer aqui como parte da sua rede de ideias.'}
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-white border border-anotata-border text-anotata-text rounded-lg hover:bg-anotata-sidebar transition-colors focus-visible:ring-2 focus-visible:ring-anotata-roxo/50"
          >
            Voltar
          </button>
          <button
            onClick={onCreate}
            className="px-4 py-2 text-sm font-medium bg-anotata-roxo text-white rounded-lg hover:bg-anotata-roxo-escuro transition-colors focus-visible:ring-2 focus-visible:ring-anotata-roxo/50 inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> Criar primeira anotação
          </button>
        </div>
      </div>
    </div>
  );
}
