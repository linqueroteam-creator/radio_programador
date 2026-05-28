import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { X, Map as MapIcon, Plus, Sparkles, Link2, User, BookOpen } from 'lucide-react';
import { NOTE_TYPES } from '../engine/RulesEngine';
import rulesEngine from '../engine/RulesEngine';

/**
 * ===== MAPA VISUAL — ECOSSISTEMA PESSOAL =====
 *
 * Hierarquia conceitual:
 *   NÍVEL 1 (centro) — "Meu Espaço" (o eu, o núcleo, ponto de origem)
 *   NÍVEL 2 (1º anel) — Cadernos (agrupadores)
 *   NÍVEL 3 (2º anel) — Anotações (ligadas ao caderno-pai)
 *   NÍVEL 4 (arcos)  — Conexões entre anotações (manuais + sugeridas)
 *
 * O mapa representa o ecossistema inteiro do usuário, não apenas
 * uma nota isolada. Funciona com poucos dados (1 caderno, 1-3 notas)
 * e escala naturalmente conforme o acervo cresce.
 *
 * Implementação 100% SVG nativa — sem dependência nova.
 * Layout radial com 2 anéis concêntricos.
 *
 * Segurança:
 *  - TODOS os hooks ANTES de qualquer early return
 *  - Defensivo: ?., || [], try
 *  - Não toca em useStore além de funções já existentes
 */

const FORCE_PALETTE = {
  forte: { stroke: '#0F7A3F', fill: '#D4F4DD', text: '#0F7A3F', label: 'forte' },
  média: { stroke: '#9B6F00', fill: '#FFF4D9', text: '#9B6F00', label: 'média' },
  fraca: { stroke: '#5B2D8E', fill: '#EDE8F2', text: '#5B2D8E', label: 'fraca' },
};

const MANUAL_PALETTE = {
  stroke: '#5B2D8E',
  fill: '#FFFFFF',
  text: '#5B2D8E',
  label: 'manual',
};

const NOTEBOOK_PALETTE = {
  stroke: '#3D1B66',
  fill: '#EDE8F2',
};


// Distribui N pontos em um círculo de raio r, começando em -90° (topo)
function radialPositions(count, radius, cx, cy, startAngle = -Math.PI / 2) {
  if (count <= 0) return [];
  const step = (Math.PI * 2) / count;
  return Array.from({ length: count }, (_, i) => {
    const a = startAngle + i * step;
    return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius, angle: a };
  });
}

function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '\u2026' : str;
}


export default function ConnectionMap({ note, store, onClose }) {
  // ====== TODOS OS HOOKS NO TOPO ======
  const [hoveredId, setHoveredId] = useState(null);
  const [hoveredType, setHoveredType] = useState(null); // 'notebook' | 'note' | null

  // ESC fecha o mapa
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Cadernos do store (excluindo lixeira se houver)
  const notebooks = useMemo(() => {
    return (store.notebooks || []).filter(nb => nb && nb.id);
  }, [store.notebooks]);

  // Notas ativas (não-lixeira, não-arquivadas) agrupadas por caderno
  const notesByNotebook = useMemo(() => {
    const map = {};
    (store.notes || []).forEach(n => {
      if (n.isTrash || n.isArchived) return;
      const nbId = n.notebookId || 'default';
      if (!map[nbId]) map[nbId] = [];
      map[nbId].push(n);
    });
    return map;
  }, [store.notes]);


  // Conexões entre notas (manuais + sugeridas) para desenhar arcos
  const interNoteConnections = useMemo(() => {
    const connections = [];
    const activeNotes = (store.notes || []).filter(n => !n.isTrash && !n.isArchived);
    activeNotes.forEach(n => {
      // Manuais
      (n.manualConnections || []).forEach(c => {
        const targetId = typeof c === 'string' ? c : c?.noteId;
        const reason = typeof c === 'string' ? '' : (c?.reason || '');
        const target = targetId ? store.getNoteById(targetId) : null;
        if (target && !target.isTrash && !target.isArchived) {
          // Evitar duplicatas (A→B e B→A)
          const key = [n.id, targetId].sort().join('-');
          if (!connections.find(x => x.key === key)) {
            connections.push({ key, sourceId: n.id, targetId, reason, kind: 'manual' });
          }
        }
      });
      // Sugeridas
      try {
        const suggested = rulesEngine.suggestConnections(n, store.notes, 4) || [];
        suggested.forEach(s => {
          const target = store.getNoteById(s.noteId);
          if (target && !target.isTrash && !target.isArchived) {
            const key = [n.id, s.noteId].sort().join('-');
            if (!connections.find(x => x.key === key)) {
              connections.push({
                key, sourceId: n.id, targetId: s.noteId,
                reason: (s.reasons && s.reasons[0]) || 'sugerida',
                strength: s.strength || 'fraca', kind: 'suggested',
              });
            }
          }
        });
      } catch (_) { /* defensivo */ }
    });
    return connections;
  }, [store.notes]);


  // Layout completo: centro + cadernos (anel 1) + notas (anel 2)
  const layout = useMemo(() => {
    const VIEW = 1000;
    const cx = VIEW / 2;
    const cy = VIEW / 2;
    const RING1_RADIUS = 200; // cadernos
    const RING2_RADIUS = 400; // notas

    // Posições dos cadernos no 1º anel
    const nbPositions = radialPositions(notebooks.length, RING1_RADIUS, cx, cy);
    const notebookNodes = notebooks.map((nb, i) => ({
      id: nb.id,
      type: 'notebook',
      label: nb.name || 'Caderno',
      color: nb.color || '#5B2D8E',
      ...nbPositions[i],
    }));

    // Posições das notas no 2º anel — agrupadas perto do caderno-pai
    const noteNodes = [];
    notebooks.forEach((nb, nbIdx) => {
      const notes = notesByNotebook[nb.id] || [];
      if (notes.length === 0) return;
      // Ângulo base do caderno
      const baseAngle = nbPositions[nbIdx]?.angle ?? (-Math.PI / 2 + nbIdx * (Math.PI * 2 / notebooks.length));
      // Spread angular: notas se espalham ±30° ao redor do ângulo do caderno
      const maxSpread = Math.min(Math.PI / 3, (Math.PI * 2 / Math.max(notebooks.length, 1)) * 0.8);
      const step = notes.length > 1 ? maxSpread / (notes.length - 1) : 0;
      const startA = baseAngle - maxSpread / 2;

      notes.forEach((n, nIdx) => {
        const a = notes.length === 1 ? baseAngle : startA + nIdx * step;
        noteNodes.push({
          id: n.id,
          type: 'note',
          label: n.title || 'Sem título',
          noteType: n.type || 'rascunho',
          notebookId: nb.id,
          isFavorite: n.isFavorite,
          x: cx + Math.cos(a) * RING2_RADIUS,
          y: cy + Math.sin(a) * RING2_RADIUS,
          angle: a,
        });
      });
    });

    return { cx, cy, view: VIEW, notebookNodes, noteNodes, ring1: RING1_RADIUS, ring2: RING2_RADIUS };
  }, [notebooks, notesByNotebook]);


  // Handlers
  const handleOpenNote = useCallback((noteId) => {
    if (!noteId) return;
    store.setSelectedNoteId(noteId);
    store.setCurrentView('all');
    onClose();
  }, [store, onClose]);

  // ====== A PARTIR DAQUI: SEM HOOKS NOVOS ======
  const totalNotes = layout.noteNodes.length;
  const totalNotebooks = layout.notebookNodes.length;
  const totalConnections = interNoteConnections.length;
  const isEmpty = totalNotebooks === 0 && totalNotes === 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(45, 27, 78, 0.55)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Mapa visual — ecossistema pessoal"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] max-h-[90vh] flex flex-col overflow-hidden border border-anotata-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== HEADER ===== */}
        <div className="px-5 py-3 border-b border-anotata-border bg-anotata-sidebar flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-anotata-roxo to-anotata-roxo-escuro flex items-center justify-center text-white shadow-sm">
            <MapIcon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-anotata-text">Meu Ecossistema</h2>
            <p className="text-xs text-anotata-muted truncate">
              {totalNotebooks} {totalNotebooks === 1 ? 'caderno' : 'cadernos'} · {totalNotes} {totalNotes === 1 ? 'nota' : 'notas'} · {totalConnections} {totalConnections === 1 ? 'conexão' : 'conexões'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-anotata-muted hover:text-anotata-goiaba hover:bg-white transition-colors"
            title="Fechar (Esc)"
          >
            <X size={16} />
          </button>
        </div>


        {/* ===== LEGENDA ===== */}
        <div className="px-5 py-2 bg-anotata-bg border-b border-anotata-border flex items-center gap-4 text-xs text-anotata-text-suave flex-wrap">
          <LegendItem swatchType="circle" color="#5B2D8E" label="Núcleo (você)" />
          <LegendItem swatchType="square" color="#3D1B66" label="Caderno" />
          <LegendItem swatchType="circle" color="#EDE8F2" label="Anotação" />
          <LegendItem swatchColor="#5B2D8E" dashed={false} label="Pertence ao caderno" />
          <LegendItem swatchColor="#0F7A3F" dashed={true} label="Conexão forte" />
          <LegendItem swatchColor="#9B6F00" dashed={true} label="Conexão média" />
          <LegendItem swatchColor="#5B2D8E" dashed={true} label="Conexão fraca" />
        </div>

        {/* ===== CORPO ===== */}
        <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-anotata-bg via-white to-anotata-lavanda-clara">
          {isEmpty ? (
            <MapEmptyState onClose={onClose} />
          ) : (
            <EcosystemSvg
              layout={layout}
              connections={interNoteConnections}
              hoveredId={hoveredId}
              hoveredType={hoveredType}
              setHoveredId={setHoveredId}
              setHoveredType={setHoveredType}
              onOpenNote={handleOpenNote}
            />
          )}
        </div>

        {/* ===== PAINEL INFERIOR ===== */}
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


// ================== Subcomponentes ==================

function LegendItem({ swatchColor, swatchType, color, dashed, label }) {
  if (swatchType === 'circle') {
    return (
      <div className="flex items-center gap-1.5">
        <svg width="14" height="14">
          <circle cx="7" cy="7" r="5" fill={color} stroke={color} strokeWidth="1.5" />
        </svg>
        {label}
      </div>
    );
  }
  if (swatchType === 'square') {
    return (
      <div className="flex items-center gap-1.5">
        <svg width="14" height="14">
          <rect x="2" y="2" width="10" height="10" rx="2" fill={color} />
        </svg>
        {label}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      <svg width="22" height="6">
        <line
          x1="0" y1="3" x2="22" y2="3"
          stroke={swatchColor}
          strokeWidth="2"
          strokeDasharray={dashed ? '4 3' : '0'}
          strokeLinecap="round"
        />
      </svg>
      {label}
    </div>
  );
}


function MapEmptyState({ onClose }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-anotata-roxo to-anotata-roxo-escuro mx-auto mb-5 flex items-center justify-center shadow-lg">
          <User size={32} className="text-white" />
        </div>
        <h3 className="text-lg font-semibold text-anotata-text mb-2">
          Seu mapa ainda está começando.
        </h3>
        <p className="text-sm text-anotata-text-suave mb-4">
          Crie mais anotações e cadernos para expandir seu ecossistema pessoal de conhecimento.
          Cada nota que você criar vai aparecer aqui como parte da sua rede de ideias.
        </p>
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium bg-anotata-roxo text-white rounded-lg hover:bg-anotata-roxo-escuro transition-colors"
        >
          Voltar e criar
        </button>
      </div>
    </div>
  );
}


function EcosystemSvg({ layout, connections, hoveredId, hoveredType, setHoveredId, setHoveredType, onOpenNote }) {
  const { cx, cy, view, notebookNodes, noteNodes } = layout;

  // Mapa de posições por ID para desenhar conexões
  const posById = useMemo(() => {
    const map = {};
    noteNodes.forEach(n => { map[n.id] = { x: n.x, y: n.y }; });
    notebookNodes.forEach(nb => { map[nb.id] = { x: nb.x, y: nb.y }; });
    return map;
  }, [noteNodes, notebookNodes]);

  return (
    <svg
      viewBox={`0 0 ${view} ${view}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full"
    >
      <defs>
        <radialGradient id="centerHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5B2D8E" stopOpacity="0.15" />
          <stop offset="70%" stopColor="#5B2D8E" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#5B2D8E" stopOpacity="0" />
        </radialGradient>
        <pattern id="dotgrid" patternUnits="userSpaceOnUse" width="40" height="40">
          <circle cx="20" cy="20" r="1" fill="#5B2D8E" opacity="0.05" />
        </pattern>
      </defs>

      {/* Fundo com pontos suaves */}
      <rect x="0" y="0" width={view} height={view} fill="url(#dotgrid)" />

      {/* Halo do centro */}
      <circle cx={cx} cy={cy} r={280} fill="url(#centerHalo)" />

      {/* Anéis guia (círculos tracejados muito suaves) */}
      <circle cx={cx} cy={cy} r={layout.ring1} fill="none" stroke="#5B2D8E" strokeWidth="0.8" strokeDasharray="4 6" opacity="0.15" />
      <circle cx={cx} cy={cy} r={layout.ring2} fill="none" stroke="#5B2D8E" strokeWidth="0.5" strokeDasharray="3 8" opacity="0.1" />


      {/* === NÍVEL 4: Conexões entre notas (arcos atrás de tudo) === */}
      {connections.map((conn) => {
        const src = posById[conn.sourceId];
        const tgt = posById[conn.targetId];
        if (!src || !tgt) return null;
        const palette = conn.kind === 'manual' ? MANUAL_PALETTE : (FORCE_PALETTE[conn.strength] || FORCE_PALETTE.fraca);
        const isHighlight = hoveredId === conn.sourceId || hoveredId === conn.targetId;
        // Curva suave desviando do centro
        const midX = (src.x + tgt.x) / 2 + (cy - (src.y + tgt.y) / 2) * 0.3;
        const midY = (src.y + tgt.y) / 2 + ((src.x + tgt.x) / 2 - cx) * 0.3;
        return (
          <path
            key={`conn-${conn.key}`}
            d={`M ${src.x} ${src.y} Q ${midX} ${midY} ${tgt.x} ${tgt.y}`}
            fill="none"
            stroke={palette.stroke}
            strokeWidth={isHighlight ? 2.5 : 1.5}
            strokeDasharray={conn.kind === 'manual' ? '0' : '5 4'}
            strokeLinecap="round"
            opacity={hoveredId && !isHighlight ? 0.2 : 0.6}
            style={{ transition: 'all 200ms ease' }}
          />
        );
      })}

      {/* === Linhas centro → cadernos (estruturais) === */}
      {notebookNodes.map((nb) => (
        <line
          key={`struct-center-${nb.id}`}
          x1={cx} y1={cy} x2={nb.x} y2={nb.y}
          stroke="#3D1B66"
          strokeWidth="2"
          strokeLinecap="round"
          opacity={hoveredId && hoveredId !== nb.id ? 0.2 : 0.4}
          style={{ transition: 'opacity 200ms ease' }}
        />
      ))}

      {/* === Linhas caderno → notas (pertencimento) === */}
      {noteNodes.map((nn) => {
        const parent = notebookNodes.find(nb => nb.id === nn.notebookId);
        if (!parent) return null;
        return (
          <line
            key={`struct-nb-${nn.id}`}
            x1={parent.x} y1={parent.y} x2={nn.x} y2={nn.y}
            stroke={parent.color || '#5B2D8E'}
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity={hoveredId && hoveredId !== nn.id && hoveredId !== parent.id ? 0.15 : 0.35}
            style={{ transition: 'opacity 200ms ease' }}
          />
        );
      })}


      {/* === NÍVEL 1: Nó central — "Meu Espaço" === */}
      <g>
        <circle cx={cx} cy={cy} r={70} fill="#FFFFFF" stroke="#5B2D8E" strokeWidth="3.5" />
        <circle cx={cx} cy={cy} r={56} fill="url(#centerGrad)" />
        <defs>
          <linearGradient id="centerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5B2D8E" />
            <stop offset="100%" stopColor="#3D1B66" />
          </linearGradient>
        </defs>
        {/* Ícone de usuário/núcleo */}
        <circle cx={cx} cy={cy - 8} r={14} fill="none" stroke="#FFFFFF" strokeWidth="2.5" />
        <path
          d={`M ${cx - 18} ${cy + 22} Q ${cx - 18} ${cy + 6} ${cx} ${cy + 6} Q ${cx + 18} ${cy + 6} ${cx + 18} ${cy + 22}`}
          fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round"
        />
        <text
          x={cx} y={cy + 50}
          textAnchor="middle"
          fontSize="11"
          fontWeight="700"
          fill="#5B2D8E"
          style={{ textTransform: 'uppercase', letterSpacing: '0.12em' }}
        >
          MEU ESPAÇO
        </text>
      </g>


      {/* === NÍVEL 2: Cadernos (1º anel) === */}
      {notebookNodes.map((nb) => {
        const isHover = hoveredId === nb.id && hoveredType === 'notebook';
        const noteCount = (noteNodes.filter(n => n.notebookId === nb.id)).length;
        const r = isHover ? 48 : 42;
        return (
          <g
            key={`nb-${nb.id}`}
            style={{ cursor: 'pointer', transition: 'all 200ms ease' }}
            onMouseEnter={() => { setHoveredId(nb.id); setHoveredType('notebook'); }}
            onMouseLeave={() => { setHoveredId(null); setHoveredType(null); }}
            opacity={hoveredId && !isHover && hoveredId !== nb.id ? 0.5 : 1}
          >
            {/* Sombra */}
            <rect x={nb.x - r} y={nb.y - r + 3} width={r * 2} height={r * 2} rx={12} fill="#000" opacity="0.06" />
            {/* Card do caderno (quadrado arredondado) */}
            <rect
              x={nb.x - r} y={nb.y - r} width={r * 2} height={r * 2}
              rx={12}
              fill={NOTEBOOK_PALETTE.fill}
              stroke={nb.color || NOTEBOOK_PALETTE.stroke}
              strokeWidth={isHover ? 3 : 2}
            />
            {/* Ícone de livro */}
            <g transform={`translate(${nb.x - 10}, ${nb.y - 14})`}>
              <rect x="0" y="0" width="20" height="24" rx="2" fill={nb.color || '#5B2D8E'} opacity="0.9" />
              <line x1="5" y1="4" x2="15" y2="4" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="5" y1="8" x2="12" y2="8" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
              <line x1="5" y1="11" x2="14" y2="11" stroke="#fff" strokeWidth="1" strokeLinecap="round" opacity="0.5" />
            </g>
            {/* Contador */}
            <text
              x={nb.x} y={nb.y + 26}
              textAnchor="middle" fontSize="9" fontWeight="600" fill={nb.color || '#5B2D8E'}
            >
              {noteCount} {noteCount === 1 ? 'nota' : 'notas'}
            </text>
            {/* Título abaixo */}
            <text
              x={nb.x} y={nb.y + r + 18}
              textAnchor="middle" fontSize="13" fontWeight="600" fill="#2D1B4E"
            >
              {truncate(nb.label, 18)}
            </text>
          </g>
        );
      })}


      {/* === NÍVEL 3: Anotações (2º anel) === */}
      {noteNodes.map((nn) => {
        const isHover = hoveredId === nn.id && hoveredType === 'note';
        const tType = NOTE_TYPES[nn.noteType] || NOTE_TYPES.rascunho;
        const r = isHover ? 38 : 32;
        const parentNb = notebookNodes.find(nb => nb.id === nn.notebookId);
        const borderColor = parentNb?.color || '#5B2D8E';
        return (
          <g
            key={`note-${nn.id}`}
            style={{ cursor: 'pointer', transition: 'all 200ms ease' }}
            onMouseEnter={() => { setHoveredId(nn.id); setHoveredType('note'); }}
            onMouseLeave={() => { setHoveredId(null); setHoveredType(null); }}
            onClick={() => onOpenNote(nn.id)}
            opacity={hoveredId && !isHover && hoveredId !== nn.notebookId ? 0.45 : 1}
          >
            {/* Sombra */}
            <circle cx={nn.x} cy={nn.y + 2} r={r} fill="#000" opacity="0.06" />
            {/* Card circular */}
            <circle
              cx={nn.x} cy={nn.y} r={r}
              fill="#FFFFFF"
              stroke={borderColor}
              strokeWidth={isHover ? 2.5 : 1.5}
            />
            {/* Ícone do tipo */}
            <text
              x={nn.x} y={nn.y + 2}
              textAnchor="middle" fontSize="22" dominantBaseline="middle"
            >
              {tType.icon}
            </text>
            {/* Indicador favorito */}
            {nn.isFavorite && (
              <circle cx={nn.x + r - 6} cy={nn.y - r + 6} r={6} fill="#F0B400" />
            )}
            {/* Título abaixo */}
            <text
              x={nn.x} y={nn.y + r + 16}
              textAnchor="middle" fontSize="11" fontWeight="500" fill="#2D1B4E"
            >
              {truncate(nn.label, 16)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}


function EcosystemDetailPanel({ hoveredId, hoveredType, layout, onOpen }) {
  if (!hoveredId) {
    return (
      <div className="px-5 py-3 border-t border-anotata-border bg-anotata-sidebar text-xs text-anotata-muted flex items-center gap-2">
        <Sparkles size={12} className="text-anotata-roxo" />
        Passe o mouse sobre um elemento para ver detalhes · Clique numa nota para abrir
      </div>
    );
  }

  if (hoveredType === 'notebook') {
    const nb = layout.notebookNodes.find(n => n.id === hoveredId);
    if (!nb) return null;
    const noteCount = layout.noteNodes.filter(n => n.notebookId === nb.id).length;
    return (
      <div className="px-5 py-3 border-t border-anotata-border bg-anotata-sidebar flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: nb.color || '#5B2D8E' }}>
          <BookOpen size={14} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-anotata-text">{nb.label}</span>
          <span className="text-xs text-anotata-muted ml-2">
            {noteCount} {noteCount === 1 ? 'anotação' : 'anotações'}
          </span>
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
        <span className="text-2xl">{tType.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-sm font-semibold text-anotata-text truncate">{nn.label}</span>
            <span className="text-2xs uppercase font-bold tracking-wide px-1.5 py-0.5 rounded bg-anotata-lavanda text-anotata-roxo">
              {tType.label || nn.noteType}
            </span>
          </div>
          <span className="text-xs text-anotata-text-suave">
            Caderno: {parentNb?.label || 'desconhecido'}
          </span>
        </div>
        <button
          onClick={() => onOpen(nn.id)}
          className="px-2.5 py-1.5 text-xs font-medium bg-anotata-roxo text-white rounded-md hover:bg-anotata-roxo-escuro transition-colors"
        >
          Abrir nota
        </button>
      </div>
    );
  }

  return null;
}
