import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { X, Map as MapIcon, Plus, Sparkles, Link2 } from 'lucide-react';
import { NOTE_TYPES } from '../engine/RulesEngine';
import rulesEngine from '../engine/RulesEngine';

/**
 * ===== MAPA VISUAL DE CONEXÕES =====
 *
 * Mostra a nota atual no centro e tudo que ela "puxa":
 *  - conexões manuais (linha sólida lavanda)
 *  - conexões sugeridas (linha tracejada, cor varia com a força)
 *
 * Implementação 100% SVG nativa — sem react-flow, sem d3, sem
 * dependência nova. Layout radial: nota central + um (ou dois) anéis
 * de notas ao redor distribuídos em ângulos iguais. Leve, estável e
 * responsivo via viewBox.
 *
 * Decisões de segurança (lições do bug do dia):
 *  - TODOS os hooks são chamados no topo, ANTES de qualquer early return
 *  - Cobertura defensiva: note?., || [], try não-críticos
 *  - Listener de teclado tem cleanup garantido no useEffect
 *  - Não toca em nada do useStore além de funções já existentes
 *    (setSelectedNoteId, setCurrentView, connectNotes, disconnectNotes,
 *    ignoreSuggestion, getNoteById, notes)
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

// Distribui N pontos em um círculo de raio r, começando em -90° (topo)
function radialPositions(count, radius, cx, cy, startAngle = -Math.PI / 2) {
  if (count <= 0) return [];
  const step = (Math.PI * 2) / count;
  return Array.from({ length: count }, (_, i) => {
    const a = startAngle + i * step;
    return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius, angle: a };
  });
}

export default function ConnectionMap({ note, store, onClose }) {
  // ====== TODOS OS HOOKS NO TOPO ======
  const [hoveredId, setHoveredId] = useState(null);

  // ESC fecha o mapa
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Conexões manuais resolvidas (com a nota destino existente)
  const manualNodes = useMemo(() => {
    if (!note) return [];
    const list = note.manualConnections || [];
    return list
      .map(c => {
        const noteId = typeof c === 'string' ? c : c?.noteId;
        const reason = typeof c === 'string' ? '' : (c?.reason || '');
        const target = noteId ? store.getNoteById(noteId) : null;
        if (!target || target.isTrash) return null;
        return { kind: 'manual', noteId, reason, target };
      })
      .filter(Boolean);
  }, [note, store.notes]);

  // Conexões sugeridas (vem do RulesEngine), excluindo as que JÁ existem como manuais
  const suggestedNodes = useMemo(() => {
    if (!note) return [];
    let suggested = [];
    try {
      suggested = rulesEngine.suggestConnections(note, store.notes, 8) || [];
    } catch (_) {
      suggested = [];
    }
    return suggested.map(s => ({
      kind: 'suggested',
      noteId: s.noteId,
      reason: (s.reasons && s.reasons[0]) || 'sugerida',
      reasons: s.reasons || [],
      strength: s.strength || 'fraca',
      target: store.getNoteById(s.noteId),
    })).filter(s => s.target && !s.target.isTrash);
  }, [note, store.notes]);

  // Nós (manuais primeiro, sugeridos depois)
  const allNodes = useMemo(() => [...manualNodes, ...suggestedNodes], [manualNodes, suggestedNodes]);

  // Layout radial: 1 anel se ≤8 nós, 2 anéis se mais
  const layout = useMemo(() => {
    const VIEW = 1000; // viewBox virtual
    const cx = VIEW / 2;
    const cy = VIEW / 2;
    const total = allNodes.length;
    if (total === 0) return { cx, cy, view: VIEW, items: [] };

    if (total <= 8) {
      const radius = 320;
      const positions = radialPositions(total, radius, cx, cy);
      return { cx, cy, view: VIEW, items: allNodes.map((n, i) => ({ ...n, ...positions[i] })) };
    }

    // 2 anéis: anel interno com prioridade pras manuais e fortes
    const sorted = [...allNodes].sort((a, b) => {
      const score = (n) => (n.kind === 'manual' ? 100 : 0) + (n.strength === 'forte' ? 10 : n.strength === 'média' ? 5 : 1);
      return score(b) - score(a);
    });
    const half = Math.ceil(sorted.length / 2);
    const inner = sorted.slice(0, half);
    const outer = sorted.slice(half);
    const innerPos = radialPositions(inner.length, 280, cx, cy);
    const outerPos = radialPositions(outer.length, 430, cx, cy, -Math.PI / 2 + Math.PI / outer.length);
    return {
      cx, cy, view: VIEW,
      items: [
        ...inner.map((n, i) => ({ ...n, ...innerPos[i] })),
        ...outer.map((n, i) => ({ ...n, ...outerPos[i] })),
      ],
    };
  }, [allNodes]);

  // Handlers (memoizados)
  const handleOpenNote = useCallback((noteId) => {
    if (!noteId) return;
    store.setSelectedNoteId(noteId);
    store.setCurrentView('all');
    onClose();
  }, [store, onClose]);

  const handleAcceptSuggestion = useCallback((suggestion) => {
    if (!note || !suggestion?.noteId) return;
    store.connectNotes(note.id, suggestion.noteId, suggestion.reason || 'sugerida pelo sistema');
  }, [note, store]);

  const handleIgnoreSuggestion = useCallback((suggestion) => {
    if (!note || !suggestion?.noteId) return;
    store.ignoreSuggestion(note.id, suggestion.noteId);
  }, [note, store]);

  const handleRemoveManual = useCallback((conn) => {
    if (!note || !conn?.noteId) return;
    if (confirm('Remover esta conexão?')) {
      store.disconnectNotes(note.id, conn.noteId);
    }
  }, [note, store]);

  // ====== A PARTIR DAQUI: SEM HOOKS NOVOS ======
  if (!note) return null;

  const centerType = NOTE_TYPES[note.type] || NOTE_TYPES.rascunho;
  const totalConnections = layout.items.length;
  const manualCount = manualNodes.length;
  const suggestedCount = suggestedNodes.length;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(45, 27, 78, 0.55)', backdropFilter: 'blur(4px)' }}
      role="dialog"
      aria-modal="true"
      aria-label="Mapa visual de conexões"
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col overflow-hidden border border-anotata-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===== HEADER ===== */}
        <div className="px-5 py-3 border-b border-anotata-border bg-anotata-sidebar flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-anotata-roxo to-anotata-roxo-escuro flex items-center justify-center text-white shadow-sm">
            <MapIcon size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold text-anotata-text">Mapa de conexões</h2>
            <p className="text-xs text-anotata-muted truncate">
              {note.title || 'Sem título'} · {manualCount} {manualCount === 1 ? 'manual' : 'manuais'} · {suggestedCount} {suggestedCount === 1 ? 'sugerida' : 'sugeridas'}
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
        <div className="px-5 py-2 bg-anotata-bg border-b border-anotata-border flex items-center gap-4 text-xs text-anotata-text-suave">
          <LegendItem swatchColor="#5B2D8E" dashed={false} label="Conexão manual" />
          <LegendItem swatchColor="#0F7A3F" dashed={true} label="Sugerida forte" />
          <LegendItem swatchColor="#9B6F00" dashed={true} label="Sugerida média" />
          <LegendItem swatchColor="#5B2D8E" dashed={true} label="Sugerida fraca" />
        </div>

        {/* ===== CORPO ===== */}
        <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-anotata-bg via-white to-anotata-lavanda-clara">
          {totalConnections === 0 ? (
            <EmptyState noteTitle={note.title} />
          ) : (
            <MapSvg
              note={note}
              centerType={centerType}
              layout={layout}
              hoveredId={hoveredId}
              setHoveredId={setHoveredId}
              onOpenNote={handleOpenNote}
            />
          )}
        </div>

        {/* ===== PAINEL INFERIOR DE DETALHE (quando hover) ===== */}
        <DetailPanel
          hoveredId={hoveredId}
          nodes={layout.items}
          onOpen={handleOpenNote}
          onAccept={handleAcceptSuggestion}
          onIgnore={handleIgnoreSuggestion}
          onRemove={handleRemoveManual}
        />
      </div>
    </div>
  );
}

// ================== Subcomponentes ==================

function LegendItem({ swatchColor, dashed, label }) {
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

function EmptyState({ noteTitle }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-anotata-lavanda-clara to-anotata-lavanda mx-auto mb-4 flex items-center justify-center">
          <Link2 size={26} className="text-anotata-roxo" />
        </div>
        <h3 className="text-base font-semibold text-anotata-text mb-1.5">
          Sem conexões ainda
        </h3>
        <p className="text-sm text-anotata-text-suave mb-3">
          A nota <strong className="text-anotata-roxo">{noteTitle || 'sem título'}</strong> ainda não está ligada a nenhuma outra nota, e o sistema também não encontrou sugestões automáticas com base no conteúdo atual.
        </p>
        <p className="text-xs text-anotata-muted">
          Dicas para o sistema sugerir conexões:
          <br />
          adicionar tags, escrever mais conteúdo, mover para um caderno com outras notas relacionadas.
        </p>
      </div>
    </div>
  );
}

function MapSvg({ note, centerType, layout, hoveredId, setHoveredId, onOpenNote }) {
  const { cx, cy, view, items } = layout;
  return (
    <svg
      viewBox={`0 0 ${view} ${view}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full"
    >
      {/* === Halo no fundo do nó central === */}
      <defs>
        <radialGradient id="centerHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#5B2D8E" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#5B2D8E" stopOpacity="0" />
        </radialGradient>
        <pattern id="dotgrid" patternUnits="userSpaceOnUse" width="40" height="40">
          <circle cx="20" cy="20" r="1" fill="#5B2D8E" opacity="0.07" />
        </pattern>
      </defs>

      <rect x="0" y="0" width={view} height={view} fill="url(#dotgrid)" />
      <circle cx={cx} cy={cy} r={210} fill="url(#centerHalo)" />

      {/* === Linhas (atrás dos nós) === */}
      {items.map((item) => {
        const isHover = hoveredId === item.noteId;
        const palette = item.kind === 'manual' ? MANUAL_PALETTE : (FORCE_PALETTE[item.strength] || FORCE_PALETTE.fraca);
        // Curva suave: M cx,cy Q midX,midY itemX,itemY
        const midX = (cx + item.x) / 2;
        const midY = (cy + item.y) / 2;
        return (
          <path
            key={`line-${item.noteId}`}
            d={`M ${cx} ${cy} Q ${midX} ${midY} ${item.x} ${item.y}`}
            fill="none"
            stroke={palette.stroke}
            strokeWidth={isHover ? 4 : (item.kind === 'manual' ? 2.5 : 1.8)}
            strokeDasharray={item.kind === 'manual' ? '0' : '6 5'}
            strokeLinecap="round"
            opacity={hoveredId && !isHover ? 0.35 : 0.85}
            style={{ transition: 'all 180ms ease' }}
          />
        );
      })}

      {/* === Nó central (nota atual) === */}
      <g>
        <circle cx={cx} cy={cy} r={86} fill="#FFFFFF" stroke="#5B2D8E" strokeWidth="3" />
        <circle cx={cx} cy={cy} r={68} fill="#5B2D8E" />
        <text
          x={cx} y={cy - 4}
          textAnchor="middle"
          fontSize="44"
          dominantBaseline="middle"
        >
          {centerType.icon}
        </text>
        <text
          x={cx} y={cy + 32}
          textAnchor="middle"
          fontSize="13"
          fontWeight="700"
          fill="#FFFFFF"
          style={{ textTransform: 'uppercase', letterSpacing: '0.08em' }}
        >
          ATUAL
        </text>
        <text
          x={cx} y={cy + 116}
          textAnchor="middle"
          fontSize="18"
          fontWeight="600"
          fill="#2D1B4E"
        >
          {truncate(note.title || 'Sem título', 32)}
        </text>
      </g>

      {/* === Nós ao redor === */}
      {items.map((item) => {
        const palette = item.kind === 'manual' ? MANUAL_PALETTE : (FORCE_PALETTE[item.strength] || FORCE_PALETTE.fraca);
        const isHover = hoveredId === item.noteId;
        const tType = NOTE_TYPES[item.target.type] || NOTE_TYPES.rascunho;
        const r = isHover ? 60 : 54;

        return (
          <g
            key={`node-${item.noteId}`}
            style={{ cursor: 'pointer', transition: 'all 180ms ease' }}
            onMouseEnter={() => setHoveredId(item.noteId)}
            onMouseLeave={() => setHoveredId(null)}
            onClick={() => onOpenNote(item.noteId)}
            opacity={hoveredId && !isHover ? 0.55 : 1}
          >
            {/* Base/sombra do card */}
            <circle cx={item.x} cy={item.y + 3} r={r} fill="#000" opacity="0.08" />
            {/* Card */}
            <circle
              cx={item.x} cy={item.y} r={r}
              fill={palette.fill}
              stroke={palette.stroke}
              strokeWidth={item.kind === 'manual' ? 2.5 : 2}
            />
            {/* Ícone do tipo */}
            <text
              x={item.x} y={item.y - 10}
              textAnchor="middle"
              fontSize="28"
              dominantBaseline="middle"
            >
              {tType.icon}
            </text>
            {/* Badge de força/origem */}
            <rect
              x={item.x - 30} y={item.y + 14}
              width="60" height="18"
              rx="9"
              fill={palette.stroke}
            />
            <text
              x={item.x} y={item.y + 23}
              textAnchor="middle"
              fontSize="10"
              fontWeight="700"
              fill="#FFFFFF"
              dominantBaseline="middle"
              style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}
            >
              {palette.label}
            </text>
            {/* Título da nota (abaixo do círculo) */}
            <text
              x={item.x} y={item.y + r + 22}
              textAnchor="middle"
              fontSize="14"
              fontWeight="600"
              fill="#2D1B4E"
            >
              {truncate(item.target.title || 'Sem título', 22)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function DetailPanel({ hoveredId, nodes, onOpen, onAccept, onIgnore, onRemove }) {
  const node = nodes.find(n => n.noteId === hoveredId);
  if (!node) {
    return (
      <div className="px-5 py-3 border-t border-anotata-border bg-anotata-sidebar text-xs text-anotata-muted flex items-center gap-2">
        <Sparkles size={12} className="text-anotata-roxo" />
        Passe o mouse sobre uma nota para ver detalhes · Clique para abrir
      </div>
    );
  }

  const tType = NOTE_TYPES[node.target.type] || NOTE_TYPES.rascunho;
  const isManual = node.kind === 'manual';

  return (
    <div className="px-5 py-3 border-t border-anotata-border bg-anotata-sidebar flex items-center gap-3">
      <span className="text-2xl">{tType.icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-sm font-semibold text-anotata-text truncate">
            {node.target.title || 'Sem título'}
          </span>
          <span className="text-2xs uppercase font-bold tracking-wide px-1.5 py-0.5 rounded text-white"
            style={{ backgroundColor: isManual ? MANUAL_PALETTE.stroke : (FORCE_PALETTE[node.strength] || FORCE_PALETTE.fraca).stroke }}
          >
            {isManual ? 'manual' : (node.strength || 'fraca')}
          </span>
        </div>
        <div className="text-xs text-anotata-text-suave">
          {isManual
            ? (node.reason ? `"${node.reason}"` : 'conexão manual sem motivo registrado')
            : (node.reasons || []).map((r, i) => <span key={i} className="mr-2">• {r}</span>)
          }
        </div>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={() => onOpen(node.noteId)}
          className="px-2.5 py-1.5 text-xs font-medium bg-anotata-roxo text-white rounded-md hover:bg-anotata-roxo-escuro transition-colors"
        >
          Abrir nota
        </button>
        {!isManual ? (
          <>
            <button
              onClick={() => onAccept(node)}
              className="px-2.5 py-1.5 text-xs font-medium bg-white border border-anotata-roxo text-anotata-roxo rounded-md hover:bg-anotata-lavanda-clara transition-colors flex items-center gap-1"
              title="Aceitar conexão sugerida"
            >
              <Plus size={12} /> Aceitar
            </button>
            <button
              onClick={() => onIgnore(node)}
              className="px-2.5 py-1.5 text-xs text-anotata-muted hover:text-anotata-goiaba transition-colors"
              title="Ignorar sugestão"
            >
              Ignorar
            </button>
          </>
        ) : (
          <button
            onClick={() => onRemove(node)}
            className="px-2.5 py-1.5 text-xs text-anotata-goiaba hover:underline transition-colors"
            title="Remover conexão manual"
          >
            Remover
          </button>
        )}
      </div>
    </div>
  );
}

function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}
