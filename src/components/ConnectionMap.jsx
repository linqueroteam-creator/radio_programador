import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { X, Plus, Sparkles, BookOpen, ArrowLeft, UserCircle2, Camera } from 'lucide-react';
import { NOTE_TYPES } from '../engine/RulesEngine';
import rulesEngine from '../engine/RulesEngine';

/**
 * ===== MAPA VISUAL — ECOSSISTEMA PESSOAL (v3 imersivo) =====
 *
 * Hierarquia conceitual mantida:
 *   NÍVEL 1 — Núcleo (você)
 *   NÍVEL 2 — Cadernos
 *   NÍVEL 3 — Anotações
 *   NÍVEL 4 — Conexões
 *
 * Refinamentos R2:
 *  - Tela cheia imersiva (não modal popup)
 *  - Núcleo com avatar (foto upload via clique → base64 localStorage)
 *  - Sem texto "MEU ESPAÇO" embaixo (avatar é a identidade)
 *  - 3 ondas concêntricas pulsando emanando do centro
 *  - Cadernos com aspecto físico: capa colorida + lombada + páginas + relevo
 *  - Linhas orgânicas (Bezier suaves) com leve oscilação contínua
 *  - Pulsos de luz percorrendo as linhas com cores semânticas
 *
 * Implementação 100% SVG nativa + animação CSS — sem dependência nova.
 * Avatar persistido em localStorage 'anotata-avatar' (não toca no useStore).
 */

const AVATAR_STORAGE_KEY = 'anotata-avatar';
const AVATAR_MAX_BYTES = 800 * 1024; // 800KB seguro pra localStorage

// === Paletas de conexões ===
const FORCE_PALETTE = {
  forte: { stroke: '#0F7A3F', glow: '#1FB55C', label: 'forte' },
  média: { stroke: '#9B6F00', glow: '#D49B1F', label: 'média' },
  fraca: { stroke: '#7B4DBA', glow: '#9F77D8', label: 'fraca' },
};
const MANUAL_PALETTE = { stroke: '#5B2D8E', glow: '#7B4DBA', label: 'manual' };

const SVG_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Helvetica Neue", Arial, sans-serif';


// === CSS embutido — animações (centro pulsante, ondas emanando, oscilação orgânica) ===
const SVG_STYLE = `
  @keyframes a-pulse-core {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.025); }
  }
  @keyframes a-emanate {
    0% { transform: scale(0.85); opacity: 0.6; }
    100% { transform: scale(1.55); opacity: 0; }
  }
  @keyframes a-fade-in {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  @keyframes a-fade-up {
    0% { opacity: 0; transform: translateY(10px) scale(0.85); }
    100% { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes a-organic-1 {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-3px); }
  }
  @keyframes a-organic-2 {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(3px); }
  }

  .a-core-pulse {
    transform-origin: center;
    transform-box: fill-box;
    animation: a-pulse-core 4.5s ease-in-out infinite, a-fade-up 700ms ease-out both;
  }
  .a-emanate {
    transform-origin: center;
    transform-box: fill-box;
    animation: a-emanate 3.6s ease-out infinite;
    pointer-events: none;
  }
  .a-emanate-2 { animation-delay: 1.2s; }
  .a-emanate-3 { animation-delay: 2.4s; }

  .a-notebook {
    transform-origin: center;
    transform-box: fill-box;
    transition: transform 250ms cubic-bezier(.2,.7,.3,1.2), filter 250ms ease;
    animation: a-fade-up 600ms ease-out both;
  }
  .a-notebook:hover { transform: translateY(-4px) scale(1.05); filter: drop-shadow(0 8px 18px rgba(91,45,142,0.35)); }

  .a-note {
    transform-origin: center;
    transform-box: fill-box;
    transition: transform 220ms ease, filter 220ms ease;
    animation: a-fade-up 500ms ease-out both;
  }
  .a-note:hover { transform: scale(1.14); }

  .a-organic-line-1 { animation: a-organic-1 7s ease-in-out infinite, a-fade-in 800ms ease-out both; }
  .a-organic-line-2 { animation: a-organic-2 8s ease-in-out infinite, a-fade-in 800ms ease-out both; }

  .a-ghost { opacity: 0.18 !important; filter: saturate(0.4); }
  .a-spotlight { filter: drop-shadow(0 6px 20px rgba(91,45,142,0.32)); }
`;


// === Helpers ===

// Distribui N pontos em um círculo
function radialPositions(count, radius, cx, cy, startAngle = -Math.PI / 2, sweep = Math.PI * 2) {
  if (count <= 0) return [];
  if (count === 1) return [{ x: cx + Math.cos(startAngle) * radius, y: cy + Math.sin(startAngle) * radius, angle: startAngle }];
  const step = sweep / count;
  return Array.from({ length: count }, (_, i) => {
    const a = startAngle + i * step;
    return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius, angle: a };
  });
}

// Posicionamento adaptativo dos cadernos
function placeNotebooks(notebooks, cx, cy, radius) {
  const n = notebooks.length;
  if (n === 0) return [];
  if (n === 1) return radialPositions(1, radius, cx, cy, 0);
  if (n === 2) return [
    { x: cx + radius, y: cy, angle: 0 },
    { x: cx - radius, y: cy, angle: Math.PI },
  ];
  return radialPositions(n, radius, cx, cy, -Math.PI / 2);
}

function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '\u2026' : str;
}

// Curva Bezier orgânica entre 2 pontos (ligeiro arco)
function curvedPath(x1, y1, x2, y2, curvature = 0.18) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  // Vetor perpendicular ao segmento
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const off = len * curvature;
  return `M ${x1} ${y1} Q ${midX + px * off} ${midY + py * off} ${x2} ${y2}`;
}

// Escurece (negativo) ou clareia (positivo) uma cor hex em N pontos percentuais
function shadeColor(hex, percent) {
  if (!hex || hex[0] !== '#') return hex || '#5B2D8E';
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0x00ff) + amt;
  let b = (num & 0x0000ff) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return '#' + ((r << 16) | (g << 8) | b).toString(16).padStart(6, '0');
}

// Curva que desvia do centro (pra conexões inter-notas não passarem por cima do núcleo)
function arcAroundCenter(x1, y1, x2, y2, cx, cy, strength = 0.32) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  // Desvia na direção oposta ao centro
  const offX = (midX - cx) * strength;
  const offY = (midY - cy) * strength;
  return `M ${x1} ${y1} Q ${midX + offX} ${midY + offY} ${x2} ${y2}`;
}


// ================== COMPONENTE PRINCIPAL ==================

export default function ConnectionMap({ note, store, onClose }) {
  // ====== TODOS OS HOOKS NO TOPO ======
  const [hoveredId, setHoveredId] = useState(null);
  const [hoveredType, setHoveredType] = useState(null);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarError, setAvatarError] = useState(null);
  const fileInputRef = useRef(null);

  // ESC fecha
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Carrega avatar do localStorage no mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AVATAR_STORAGE_KEY);
      if (saved && saved.startsWith('data:image/')) {
        setAvatarUrl(saved);
      }
    } catch (_) { /* defensivo */ }
  }, []);

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

  // Layout: centro + 1º anel (cadernos) + 2º anel (notas)
  const layout = useMemo(() => {
    const VIEW = 1000;
    const cx = VIEW / 2;
    const cy = VIEW / 2;
    const RING1 = 230;
    const RING2 = 420;

    const nbPositions = placeNotebooks(notebooks, cx, cy, RING1);
    const notebookNodes = notebooks.map((nb, i) => ({
      id: nb.id,
      type: 'notebook',
      label: nb.name || 'Caderno',
      color: nb.color || '#5B2D8E',
      ...nbPositions[i],
    }));

    const noteNodes = [];
    notebooks.forEach((nb, nbIdx) => {
      const notes = notesByNotebook[nb.id] || [];
      if (notes.length === 0) return;
      const baseAngle = nbPositions[nbIdx]?.angle ?? -Math.PI / 2;
      let maxSpread;
      if (notebooks.length === 1) maxSpread = Math.PI * 1.5;
      else if (notebooks.length === 2) maxSpread = Math.PI * 0.9;
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


  // === Handlers ===
  const handleOpenNote = useCallback((noteId) => {
    if (!noteId) return;
    store.setSelectedNoteId(noteId);
    store.setCurrentView('all');
    onClose();
  }, [store, onClose]);

  const handleCreateNote = useCallback(() => {
    if (typeof store.createNote === 'function') {
      try {
        const firstNbId = (notebooks[0] && notebooks[0].id) || 'default';
        store.createNote(firstNbId);
        store.setCurrentView('all');
      } catch (_) { /* defensivo */ }
    }
    onClose();
  }, [store, onClose, notebooks]);

  // === Avatar handlers ===
  const handleAvatarClick = useCallback(() => {
    if (fileInputRef.current) fileInputRef.current.click();
  }, []);

  const handleAvatarFile = useCallback((e) => {
    setAvatarError(null);
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAvatarError('Arquivo precisa ser uma imagem');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl !== 'string') return;
      if (dataUrl.length > AVATAR_MAX_BYTES * 1.4) {
        setAvatarError('Imagem grande demais. Use até 800KB.');
        return;
      }
      try {
        localStorage.setItem(AVATAR_STORAGE_KEY, dataUrl);
        setAvatarUrl(dataUrl);
      } catch (_) {
        setAvatarError('Não consegui salvar a foto.');
      }
    };
    reader.onerror = () => setAvatarError('Erro ao ler o arquivo.');
    reader.readAsDataURL(file);
    // Reset input pra permitir re-upload da mesma foto
    e.target.value = '';
  }, []);

  const handleAvatarRemove = useCallback(() => {
    try {
      localStorage.removeItem(AVATAR_STORAGE_KEY);
      setAvatarUrl(null);
    } catch (_) { /* defensivo */ }
  }, []);

  // Highlight de subconjunto
  const highlightSet = useMemo(() => {
    if (!hoveredId) return null;
    const set = new Set([hoveredId]);
    if (hoveredType === 'notebook') {
      layout.noteNodes.forEach(nn => {
        if (nn.notebookId === hoveredId) set.add(nn.id);
      });
    } else if (hoveredType === 'note') {
      const nt = layout.noteNodes.find(nn => nn.id === hoveredId);
      if (nt) set.add(nt.notebookId);
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
      className="fixed inset-0 z-[60] bg-gradient-to-br from-[#1A0E33] via-[#2D1B4E] to-[#3D1B66]"
      role="dialog"
      aria-modal="true"
      aria-label="Mapa visual — ecossistema pessoal"
    >
      {/* Camada de textura sobre o fundo escuro pra criar profundidade */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(123,77,186,0.18) 0%, transparent 60%)',
        }}
      />

      {/* HEADER FLUTUANTE glass */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-3 backdrop-blur-md bg-white/8 border-b border-white/10">
        <button
          onClick={onClose}
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-white/85 hover:text-white hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="Voltar para o editor"
        >
          <ArrowLeft size={16} />
          <span className="text-sm font-medium">Voltar</span>
        </button>
        <div className="flex flex-col items-center text-center">
          <h2 className="text-sm font-semibold text-white tracking-wide">Meu Ecossistema</h2>
          <p className="text-2xs text-white/60">
            {totalNotebooks} {totalNotebooks === 1 ? 'caderno' : 'cadernos'} · {totalNotes} {totalNotes === 1 ? 'anotação' : 'anotações'} · {totalConnections} {totalConnections === 1 ? 'conexão' : 'conexões'}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-white/85 hover:text-white hover:bg-white/10 transition-colors focus-visible:ring-2 focus-visible:ring-white/40"
          aria-label="Fechar mapa"
          title="Fechar (Esc)"
        >
          <X size={18} />
        </button>
      </div>

      {/* Input file invisível pra avatar */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarFile}
        className="hidden"
        aria-label="Escolher foto de perfil"
      />

      {/* CORPO DO MAPA — ocupa tela toda */}
      <div className="absolute inset-0 pt-16">
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
            avatarUrl={avatarUrl}
            onAvatarClick={handleAvatarClick}
            onAvatarRemove={handleAvatarRemove}
          />
        )}
      </div>

      {/* Toast de erro de avatar */}
      {avatarError && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-anotata-goiaba text-white text-sm shadow-2xl z-20">
          {avatarError}
        </div>
      )}

      {/* PAINEL INFERIOR flutuante glass */}
      <div className="absolute bottom-0 left-0 right-0 z-10">
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


// ================== SVG PRINCIPAL ==================

function EcosystemSvg({
  layout, connections, hoveredId, hoveredType, highlightSet,
  setHoveredId, setHoveredType, onOpenNote,
  avatarUrl, onAvatarClick, onAvatarRemove,
}) {
  const { cx, cy, view, notebookNodes, noteNodes, ring1, ring2 } = layout;

  // Mapa de posição por id
  const posById = useMemo(() => {
    const m = {};
    noteNodes.forEach(n => { m[n.id] = { x: n.x, y: n.y }; });
    notebookNodes.forEach(nb => { m[nb.id] = { x: nb.x, y: nb.y }; });
    return m;
  }, [noteNodes, notebookNodes]);

  // Atrasos de cascata
  const delayCenter = 0;
  const delayNotebookBase = 250;
  const delayNoteBase = 250 + notebookNodes.length * 90 + 100;
  const delayConnections = delayNoteBase + noteNodes.length * 35 + 100;

  return (
    <svg
      viewBox={`0 0 ${view} ${view}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full"
      style={{ fontFamily: SVG_FONT }}
    >
      <style>{SVG_STYLE}</style>

      <defs>
        {/* Halo do núcleo */}
        <radialGradient id="coreHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7B4DBA" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#5B2D8E" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#5B2D8E" stopOpacity="0" />
        </radialGradient>
        {/* Núcleo gradiente (caso sem avatar) */}
        <radialGradient id="coreFill" cx="35%" cy="35%" r="80%">
          <stop offset="0%" stopColor="#A07BD6" />
          <stop offset="55%" stopColor="#7B4DBA" />
          <stop offset="100%" stopColor="#5B2D8E" />
        </radialGradient>
        {/* Anel pulsante ao redor do avatar */}
        <radialGradient id="coreRing" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7B4DBA" stopOpacity="0" />
          <stop offset="80%" stopColor="#A07BD6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#A07BD6" stopOpacity="0" />
        </radialGradient>
        {/* Padrão de pontos */}
        <pattern id="dotgrid" patternUnits="userSpaceOnUse" width="44" height="44">
          <circle cx="22" cy="22" r="0.9" fill="#FFFFFF" opacity="0.05" />
        </pattern>
        {/* Filtro glow pra pulsos */}
        <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Mascara circular pro avatar */}
        <clipPath id="avatarClip">
          <circle cx={cx} cy={cy} r="64" />
        </clipPath>
        {/* Sombras de relevo dos cadernos */}
        <filter id="bookShadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="2" dy="6" stdDeviation="4" floodColor="#000000" floodOpacity="0.35" />
        </filter>
      </defs>

      {/* Fundo de pontos */}
      <rect x="0" y="0" width={view} height={view} fill="url(#dotgrid)" />

      {/* Halo central */}
      <circle cx={cx} cy={cy} r={320} fill="url(#coreHalo)" />

      {/* === Anéis-guia muito sutis === */}
      <circle cx={cx} cy={cy} r={ring1} fill="none" stroke="#FFFFFF" strokeWidth="0.5" strokeDasharray="3 8" opacity="0.08" />
      <circle cx={cx} cy={cy} r={ring2} fill="none" stroke="#FFFFFF" strokeWidth="0.4" strokeDasharray="2 10" opacity="0.06" />


      {/* === 3 ondas concêntricas emanando do núcleo === */}
      <circle cx={cx} cy={cy} r="78" fill="none" stroke="#A07BD6" strokeWidth="2" opacity="0.5" className="a-emanate" />
      <circle cx={cx} cy={cy} r="78" fill="none" stroke="#A07BD6" strokeWidth="2" opacity="0.5" className="a-emanate a-emanate-2" />
      <circle cx={cx} cy={cy} r="78" fill="none" stroke="#A07BD6" strokeWidth="2" opacity="0.5" className="a-emanate a-emanate-3" />

      {/* === Conexões inter-notas (atrás de tudo) — orgânicas com pulso === */}
      {connections.map((conn) => {
        const src = posById[conn.sourceId];
        const tgt = posById[conn.targetId];
        if (!src || !tgt) return null;
        const palette = conn.kind === 'manual' ? MANUAL_PALETTE : (FORCE_PALETTE[conn.strength] || FORCE_PALETTE.fraca);
        const isHighlight = hoveredId && (hoveredId === conn.sourceId || hoveredId === conn.targetId);
        const isDimmed = highlightSet && !isHighlight;
        const path = arcAroundCenter(src.x, src.y, tgt.x, tgt.y, cx, cy, 0.32);
        const pathId = `path-conn-${conn.key}`;
        return (
          <g key={`conn-${conn.key}`} style={{ animationDelay: `${delayConnections}ms` }} className="a-organic-line-1">
            <path id={pathId} d={path} fill="none" stroke="none" />
            <use
              href={`#${pathId}`}
              fill="none"
              stroke={palette.stroke}
              strokeWidth={isHighlight ? 2.4 : 1.2}
              strokeDasharray={conn.kind === 'manual' ? '0' : '5 6'}
              strokeLinecap="round"
              opacity={isDimmed ? 0.1 : (isHighlight ? 0.85 : 0.4)}
              style={{ transition: 'all 250ms ease' }}
            />
            {/* Pulso de luz percorrendo a curva (apenas quando destacada, performance) */}
            {isHighlight && (
              <circle r="3.5" fill={palette.glow} filter="url(#lineGlow)">
                <animateMotion dur="2s" repeatCount="indefinite">
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </circle>
            )}
            <title>{conn.kind === 'manual' ? `Conexão manual: ${conn.reason || 'sem motivo'}` : `Conexão ${conn.strength || 'sugerida'}: ${conn.reason || ''}`}</title>
          </g>
        );
      })}

      {/* === Linhas estruturais centro → cadernos (orgânicas) === */}
      {notebookNodes.map((nb, idx) => {
        const dim = highlightSet && !highlightSet.has(nb.id);
        const lit = hoveredId === nb.id;
        const path = curvedPath(cx, cy, nb.x, nb.y, 0.12);
        const pathId = `path-c2nb-${nb.id}`;
        return (
          <g key={`struct-c-${nb.id}`} style={{ animationDelay: `${delayNotebookBase + idx * 90}ms` }} className={idx % 2 === 0 ? 'a-organic-line-1' : 'a-organic-line-2'}>
            <path id={pathId} d={path} fill="none" stroke="none" />
            <use
              href={`#${pathId}`}
              fill="none"
              stroke="#FFFFFF"
              strokeWidth={lit ? 2 : 1.2}
              strokeLinecap="round"
              opacity={dim ? 0.08 : (lit ? 0.55 : 0.22)}
              style={{ transition: 'all 250ms ease' }}
            />
            {/* Pulso permanente sutil percorrendo do núcleo até o caderno */}
            <circle r="2.5" fill="#A07BD6" filter="url(#lineGlow)" opacity={dim ? 0.2 : 0.7}>
              <animateMotion dur={`${4 + (idx % 3)}s`} repeatCount="indefinite" begin={`${idx * 0.5}s`}>
                <mpath href={`#${pathId}`} />
              </animateMotion>
            </circle>
          </g>
        );
      })}


      {/* === Linhas caderno → notas (pertencimento) === */}
      {noteNodes.map((nn, idx) => {
        const parent = notebookNodes.find(nb => nb.id === nn.notebookId);
        if (!parent) return null;
        const dim = highlightSet && !(highlightSet.has(nn.id) || highlightSet.has(parent.id));
        const lit = hoveredId === nn.id || hoveredId === parent.id;
        const path = curvedPath(parent.x, parent.y, nn.x, nn.y, 0.15);
        const pathId = `path-nb2n-${nn.id}`;
        return (
          <g key={`struct-n-${nn.id}`} style={{ animationDelay: `${delayNoteBase + idx * 35}ms` }} className={idx % 2 === 0 ? 'a-organic-line-2' : 'a-organic-line-1'}>
            <path id={pathId} d={path} fill="none" stroke="none" />
            <use
              href={`#${pathId}`}
              fill="none"
              stroke={parent.color || '#A07BD6'}
              strokeWidth={lit ? 1.8 : 1}
              strokeLinecap="round"
              opacity={dim ? 0.08 : (lit ? 0.7 : 0.32)}
              style={{ transition: 'all 250ms ease' }}
            />
            {lit && (
              <circle r="2.5" fill={parent.color || '#A07BD6'} filter="url(#lineGlow)">
                <animateMotion dur="1.6s" repeatCount="indefinite">
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </circle>
            )}
          </g>
        );
      })}


      {/* === NÚCLEO — avatar com clique pra trocar foto === */}
      <g
        className="a-core-pulse"
        style={{ cursor: 'pointer', animationDelay: `${delayCenter}ms` }}
        onClick={onAvatarClick}
        role="button"
        tabIndex={0}
        aria-label={avatarUrl ? 'Trocar foto de perfil' : 'Adicionar foto de perfil'}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAvatarClick(); } }}
      >
        {/* Anel pulsante externo */}
        <circle cx={cx} cy={cy} r="78" fill="url(#coreRing)" />
        {/* Borda branca */}
        <circle cx={cx} cy={cy} r="68" fill="#FFFFFF" />
        {/* Conteúdo: avatar (foto) ou placeholder */}
        {avatarUrl ? (
          <>
            <image
              href={avatarUrl}
              x={cx - 64} y={cy - 64}
              width="128" height="128"
              clipPath="url(#avatarClip)"
              preserveAspectRatio="xMidYMid slice"
            />
            <circle cx={cx} cy={cy} r="64" fill="none" stroke="#FFFFFF" strokeWidth="2" />
          </>
        ) : (
          <>
            <circle cx={cx} cy={cy} r="64" fill="url(#coreFill)" />
            {/* Ícone de pessoa estilizado (paths elegantes) */}
            <circle cx={cx} cy={cy - 14} r="13" fill="none" stroke="#FFFFFF" strokeWidth="2.6" />
            <path
              d={`M ${cx - 22} ${cy + 24}
                  C ${cx - 22} ${cy + 8}, ${cx - 10} ${cy} ${cx} ${cy}
                  C ${cx + 10} ${cy}, ${cx + 22} ${cy + 8}, ${cx + 22} ${cy + 24}`}
              fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round"
            />
            {/* Indicador de "adicionar foto" — câmera pequena no canto */}
            <g transform={`translate(${cx + 38}, ${cy + 38})`}>
              <circle cx="0" cy="0" r="14" fill="#5B2D8E" stroke="#FFFFFF" strokeWidth="2.5" />
              <rect x="-7" y="-4" width="14" height="9" rx="1.5" fill="#FFFFFF" />
              <circle cx="0" cy="0.5" r="3" fill="#5B2D8E" />
              <rect x="-2" y="-6" width="4" height="2" rx="0.5" fill="#FFFFFF" />
            </g>
          </>
        )}
        <title>{avatarUrl ? 'Clique para trocar sua foto' : 'Clique para adicionar sua foto de perfil'}</title>
      </g>

      {/* Botão pequeno "remover foto" (só se tiver foto) */}
      {avatarUrl && (
        <g
          transform={`translate(${cx + 50}, ${cy + 50})`}
          style={{ cursor: 'pointer' }}
          onClick={(e) => { e.stopPropagation(); onAvatarRemove(); }}
          role="button"
          tabIndex={0}
          aria-label="Remover foto de perfil"
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onAvatarRemove(); } }}
        >
          <circle cx="0" cy="0" r="13" fill="#5B2D8E" stroke="#FFFFFF" strokeWidth="2.5" />
          <line x1="-5" y1="-5" x2="5" y2="5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          <line x1="5" y1="-5" x2="-5" y2="5" stroke="#FFFFFF" strokeWidth="2.2" strokeLinecap="round" />
          <title>Remover foto</title>
        </g>
      )}


      {/* === NÍVEL 2: Cadernos físicos === */}
      {notebookNodes.map((nb, idx) => {
        const isHover = hoveredId === nb.id && hoveredType === 'notebook';
        const dim = highlightSet && !highlightSet.has(nb.id);
        const noteCount = noteNodes.filter(n => n.notebookId === nb.id).length;
        const w = 96;  // largura
        const h = 116; // altura
        const x = nb.x - w / 2;
        const y = nb.y - h / 2;
        const color = nb.color || '#5B2D8E';

        // Gradiente único pra capa de cada caderno
        const gradId = `nbGrad-${nb.id}`;
        // Sombra interna da capa (lado direito mais escuro = "abertura")
        const shadowId = `nbShadow-${nb.id}`;

        return (
          <g
            key={`nb-${nb.id}`}
            className={`a-notebook ${dim ? 'a-ghost' : ''} ${isHover ? 'a-spotlight' : ''}`}
            style={{ cursor: 'pointer', animationDelay: `${delayNotebookBase + idx * 90}ms` }}
            onMouseEnter={() => { setHoveredId(nb.id); setHoveredType('notebook'); }}
            onMouseLeave={() => { setHoveredId(null); setHoveredType(null); }}
            tabIndex={0}
            role="button"
            aria-label={`Caderno ${nb.label}, ${noteCount} ${noteCount === 1 ? 'nota' : 'notas'}`}
          >
            <title>{nb.label} — {noteCount} {noteCount === 1 ? 'nota' : 'notas'}</title>

            <defs>
              <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={shadeColor(color, 30)} />
                <stop offset="55%" stopColor={color} />
                <stop offset="100%" stopColor={shadeColor(color, -25)} />
              </linearGradient>
              <linearGradient id={shadowId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#000000" stopOpacity="0.25" />
                <stop offset="8%" stopColor="#000000" stopOpacity="0" />
                <stop offset="100%" stopColor="#000000" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Páginas (atrás da capa, à direita) — folhas brancas empilhadas */}
            <rect x={x + w - 4} y={y + 3} width="6" height={h - 6} fill="#F9F6FA" stroke="#D8D3E0" strokeWidth="0.5" rx="1" />
            <rect x={x + w - 6} y={y + 5} width="6" height={h - 10} fill="#FFFFFF" stroke="#E5E0EB" strokeWidth="0.5" rx="1" />

            {/* CAPA principal */}
            <rect
              x={x} y={y} width={w} height={h}
              rx="3"
              fill={`url(#${gradId})`}
              filter="url(#bookShadow)"
            />

            {/* Lombada à esquerda (faixa mais escura, vertical) */}
            <rect x={x} y={y} width="14" height={h} fill={shadeColor(color, -40)} rx="3" />
            <line x1={x + 14} y1={y} x2={x + 14} y2={y + h} stroke="#000000" strokeWidth="0.4" opacity="0.3" />
            {/* Linhas decorativas na lombada (gomos) */}
            <line x1={x + 4} y1={y + 14} x2={x + 10} y2={y + 14} stroke="#FFFFFF" strokeWidth="0.6" opacity="0.45" />
            <line x1={x + 4} y1={y + h - 14} x2={x + 10} y2={y + h - 14} stroke="#FFFFFF" strokeWidth="0.6" opacity="0.45" />

            {/* Sombra interna na junção lombada/capa */}
            <rect x={x + 14} y={y} width={w - 14} height={h} fill={`url(#${shadowId})`} pointerEvents="none" />

            {/* "Etiqueta" branca no centro da capa pro título */}
            <rect
              x={x + 22} y={y + 26}
              width={w - 30} height={h - 52}
              rx="2"
              fill="#FFFFFF"
              opacity="0.94"
            />
            {/* Sombra suave na etiqueta */}
            <rect
              x={x + 22} y={y + 26}
              width={w - 30} height={h - 52}
              rx="2"
              fill="none" stroke={shadeColor(color, -50)} strokeWidth="0.4" opacity="0.4"
            />

            {/* Título do caderno NA CAPA */}
            <foreignObject
              x={x + 24} y={y + 28}
              width={w - 34} height={h - 56}
            >
              <div
                xmlns="http://www.w3.org/1999/xhtml"
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textAlign: 'center',
                  fontSize: '9.5px',
                  lineHeight: 1.2,
                  fontWeight: 600,
                  color: shadeColor(color, -40),
                  fontFamily: SVG_FONT,
                  padding: '2px',
                  overflow: 'hidden',
                  wordBreak: 'break-word',
                }}
              >
                {truncate(nb.label, 26)}
              </div>
            </foreignObject>

            {/* Pequena fita marcadora pendente no topo */}
            <path
              d={`M ${x + w - 18} ${y} L ${x + w - 18} ${y + 16} L ${x + w - 14} ${y + 12} L ${x + w - 10} ${y + 16} L ${x + w - 10} ${y}`}
              fill={shadeColor(color, -20)}
              opacity="0.85"
            />

            {/* Contador de notas — círculo abaixo */}
            <circle cx={nb.x} cy={y + h + 14} r="11" fill="#FFFFFF" stroke={color} strokeWidth="1.5" />
            <text
              x={nb.x} y={y + h + 18}
              textAnchor="middle"
              fontSize="11"
              fontWeight="700"
              fill={color}
              fontFamily={SVG_FONT}
            >
              {noteCount}
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
        const borderColor = parentNb?.color || '#7B4DBA';
        const r = 32;
        return (
          <g
            key={`note-${nn.id}`}
            className={`a-note ${dim ? 'a-ghost' : ''} ${isHover ? 'a-spotlight' : ''}`}
            style={{ cursor: 'pointer', animationDelay: `${delayNoteBase + idx * 35}ms` }}
            onMouseEnter={() => { setHoveredId(nn.id); setHoveredType('note'); }}
            onMouseLeave={() => { setHoveredId(null); setHoveredType(null); }}
            onClick={() => onOpenNote(nn.id)}
            tabIndex={0}
            role="button"
            aria-label={`Anotação ${nn.label}, abrir`}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenNote(nn.id); } }}
          >
            <title>{nn.label}{parentNb ? ` — ${parentNb.label}` : ''}</title>
            {/* Anel externo da cor do caderno-pai */}
            <circle cx={nn.x} cy={nn.y} r={r + 3} fill="none" stroke={borderColor} strokeWidth="1.3" opacity="0.45" />
            {/* Card branco com sombra */}
            <circle cx={nn.x} cy={nn.y + 2} r={r} fill="#000000" opacity="0.25" />
            <circle
              cx={nn.x} cy={nn.y} r={r}
              fill="#FFFFFF"
              stroke={borderColor}
              strokeWidth={isHover ? 2.4 : 1.4}
            />
            {/* Ícone do tipo */}
            <text x={nn.x} y={nn.y + 1} textAnchor="middle" fontSize="22" dominantBaseline="middle">
              {tType.icon}
            </text>
            {/* Estrela favorito */}
            {nn.isFavorite && (
              <g transform={`translate(${nn.x + r - 8}, ${nn.y - r + 8})`}>
                <circle cx="0" cy="0" r="7" fill="#FFFFFF" />
                <path
                  d="M 0 -5 L 1.5 -1.5 L 5 -1.5 L 2.2 0.7 L 3.3 4 L 0 2 L -3.3 4 L -2.2 0.7 L -5 -1.5 L -1.5 -1.5 Z"
                  fill="#F0B400" stroke="#F0B400" strokeWidth="0.8" strokeLinejoin="round"
                />
              </g>
            )}
            {/* Título — agora sobre fundo escuro com box translúcido */}
            <foreignObject x={nn.x - 70} y={nn.y + r + 8} width="140" height="24">
              <div
                xmlns="http://www.w3.org/1999/xhtml"
                style={{
                  width: '100%',
                  textAlign: 'center',
                  fontSize: '10.5px',
                  fontWeight: 500,
                  color: '#FFFFFF',
                  fontFamily: SVG_FONT,
                  textShadow: '0 1px 4px rgba(0,0,0,0.7)',
                  overflow: 'hidden',
                  whiteSpace: 'nowrap',
                  textOverflow: 'ellipsis',
                }}
              >
                {truncate(nn.label, 22)}
              </div>
            </foreignObject>
          </g>
        );
      })}
    </svg>
  );
}


// ================== PAINEL INFERIOR (glass) ==================

function EcosystemDetailPanel({ hoveredId, hoveredType, layout, onOpen }) {
  if (!hoveredId) {
    return (
      <div className="px-5 py-3 backdrop-blur-md bg-white/8 border-t border-white/10 text-2xs text-white/60 flex items-center justify-center gap-2">
        <Sparkles size={12} className="text-white/70" />
        Passe o mouse sobre um caderno ou anotação · Clique no centro para adicionar sua foto · Clique numa anotação para abri-la
      </div>
    );
  }

  if (hoveredType === 'notebook') {
    const nb = layout.notebookNodes.find(n => n.id === hoveredId);
    if (!nb) return null;
    const noteCount = layout.noteNodes.filter(n => n.notebookId === nb.id).length;
    return (
      <div className="px-5 py-3 backdrop-blur-md bg-white/8 border-t border-white/10 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shadow-lg shrink-0"
          style={{ backgroundColor: nb.color || '#5B2D8E' }}
        >
          <BookOpen size={18} className="text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">{nb.label}</div>
          <div className="text-xs text-white/60">
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
      <div className="px-5 py-3 backdrop-blur-md bg-white/8 border-t border-white/10 flex items-center gap-3">
        <span className="text-2xl leading-none shrink-0">{tType.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5 flex-wrap">
            <span className="text-sm font-semibold text-white truncate max-w-md">{nn.label}</span>
            <span className="text-2xs uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-white/15 text-white/90">
              {tType.label || nn.noteType}
            </span>
            {nn.isFavorite && (
              <span className="text-2xs font-semibold text-anotata-favorite">★ favorita</span>
            )}
          </div>
          {parentNb && (
            <div className="text-xs text-white/60 flex items-center gap-1.5">
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
          className="px-3 py-1.5 text-xs font-medium bg-white text-anotata-roxo-escuro rounded-md hover:bg-white/90 transition-colors focus-visible:ring-2 focus-visible:ring-white/50 shrink-0"
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
        {/* Ilustração SVG decorativa */}
        <div className="mx-auto mb-6 relative" style={{ width: 160, height: 160 }}>
          <svg viewBox="0 0 160 160" width="160" height="160" aria-hidden="true">
            <defs>
              <radialGradient id="emptyHalo" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#A07BD6" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#5B2D8E" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="emptyCore" cx="35%" cy="35%" r="80%">
                <stop offset="0%" stopColor="#A07BD6" />
                <stop offset="100%" stopColor="#5B2D8E" />
              </radialGradient>
            </defs>
            <circle cx="80" cy="80" r="75" fill="url(#emptyHalo)" />
            <circle cx="80" cy="80" r="56" fill="none" stroke="#FFFFFF" strokeWidth="0.6" strokeDasharray="3 6" opacity="0.3" />
            <circle cx="80" cy="80" r="32" fill="url(#emptyCore)" />
            <circle cx="80" cy="72" r="6" fill="none" stroke="#FFFFFF" strokeWidth="1.8" />
            <path
              d="M 68 90 C 68 82, 74 79, 80 79 C 86 79, 92 82, 92 90"
              fill="none" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round"
            />
            <circle cx="132" cy="80" r="7" fill="#FFFFFF" stroke="#A07BD6" strokeWidth="1.6" />
            <circle cx="28" cy="80" r="7" fill="#FFFFFF" stroke="#A07BD6" strokeWidth="1.6" />
            <circle cx="80" cy="132" r="7" fill="#FFFFFF" stroke="#A07BD6" strokeWidth="1.6" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          {hasNotebookNoNotes
            ? 'Seu mapa está pronto pra crescer'
            : 'Seu mapa ainda está começando'}
        </h3>
        <p className="text-sm text-white/70 mb-6">
          {hasNotebookNoNotes
            ? 'Você já tem um caderno. Crie sua primeira anotação para vê-la aparecer no ecossistema.'
            : 'Cada anotação que você criar vai aparecer aqui como parte da sua rede de ideias.'}
        </p>
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/15 transition-colors focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Voltar
          </button>
          <button
            onClick={onCreate}
            className="px-4 py-2 text-sm font-medium bg-white text-anotata-roxo-escuro rounded-lg hover:bg-white/90 transition-colors focus-visible:ring-2 focus-visible:ring-white/50 inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> Criar primeira anotação
          </button>
        </div>
      </div>
    </div>
  );
}
