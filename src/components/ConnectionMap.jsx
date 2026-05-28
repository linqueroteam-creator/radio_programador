import React, { useEffect, useMemo, useState, useCallback, useRef, useDeferredValue } from 'react';
import {
  X, Plus, Sparkles, BookOpen, ArrowLeft, FileText, Camera, ZoomIn, ZoomOut, Maximize2,
  // Ícones para cada área da vida (Camada 2 — regra-de-cor.md / areas-da-vida.md)
  Heart, Smile, Brain, Briefcase, Coins, Users, Home as HomeIcon, Palette, Compass, CircleDot, Layers,
} from 'lucide-react';
import { NOTE_TYPES } from '../engine/RulesEngine';
import rulesEngine from '../engine/RulesEngine';
import NotebookCover from './NotebookCover';
import {
  LIFE_AREAS,
  getLifeArea,
  listLifeAreas,
  getAreaUsage,
  calculateAreaGravity,
} from '../engine/LifeAreas';

// Mapa de ícone Lucide por id de área (resolução estática — sem dynamic import)
const LIFE_AREA_ICON_MAP = {
  saude: Heart,
  emocoes: Smile,
  intelectual: Brain,
  carreira: Briefcase,
  financas: Coins,
  relacoes: Users,
  espiritual: Sparkles,
  lar: HomeIcon,
  lazer: Palette,
  crescimento: Compass,
  outros: CircleDot,
};

// Persistência da preferência de visão do mapa
const MAP_VIEW_STORAGE_KEY = 'anotata-map-view';
const MAP_VIEW_NOTEBOOKS = 'notebooks';
const MAP_VIEW_LIFE_AREAS = 'lifeAreas';

/**
 * ===== MAPA VISUAL — ECOSSISTEMA PESSOAL (v3 premium) =====
 *
 * R3 incorpora feedback profissional UI/UX:
 *  - Núcleo minimalista premium (avatar limpo, hover overlay elegante)
 *  - Cadernos usando o mesmo NotebookCover da Home (capas premium reais)
 *  - Notas como folhas de papel (não círculo) com ícone FileText
 *  - Pulso sutil em cadernos (cada um com fase própria)
 *  - Lei da gravidade: cadernos com mais notas se aproximam do centro
 *  - Pan + zoom estilo MindMeister (scroll = zoom, drag = pan)
 *
 * Implementação 100% SVG nativa + foreignObject + animação CSS.
 * Avatar persistido em localStorage 'anotata-avatar'.
 */

const AVATAR_STORAGE_KEY = 'anotata-avatar';
const AVATAR_MAX_BYTES = 800 * 1024;

const FORCE_PALETTE = {
  forte: { stroke: '#0F7A3F', glow: '#1FB55C', label: 'forte' },
  média: { stroke: '#9B6F00', glow: '#D49B1F', label: 'média' },
  fraca: { stroke: '#7B4DBA', glow: '#9F77D8', label: 'fraca' },
};
const MANUAL_PALETTE = { stroke: '#E5DBF2', glow: '#FFFFFF', label: 'manual' };

const SVG_FONT = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, "Helvetica Neue", Arial, sans-serif';

// Pan/zoom limites
const ZOOM_MIN = 0.4;
const ZOOM_MAX = 2.5;
const ZOOM_STEP = 0.1;


// === CSS embutido ===
const SVG_STYLE = `
  @keyframes a-pulse-core {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.022); }
  }
  @keyframes a-pulse-book {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.015); }
  }
  @keyframes a-emanate {
    0% { transform: scale(0.85); opacity: 0.55; }
    100% { transform: scale(1.6); opacity: 0; }
  }
  @keyframes a-fade-in {
    0% { opacity: 0; }
    100% { opacity: 1; }
  }
  @keyframes a-fade-up {
    0% { opacity: 0; transform: translateY(12px) scale(0.85); }
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
    transition: transform 280ms cubic-bezier(.2,.7,.3,1.2), filter 280ms ease;
    animation: a-fade-up 600ms ease-out both;
  }
  .a-notebook-pulse {
    transform-origin: center;
    transform-box: fill-box;
    animation: a-pulse-book 5.5s ease-in-out infinite;
  }
  .a-notebook:hover { transform: translateY(-5px) scale(1.06); filter: drop-shadow(0 12px 28px rgba(0,0,0,0.5)); }

  .a-note {
    transform-origin: center;
    transform-box: fill-box;
    transition: transform 220ms ease, filter 220ms ease;
    animation: a-fade-up 500ms ease-out both;
  }
  .a-note:hover { transform: scale(1.12) translateY(-2px); filter: drop-shadow(0 6px 14px rgba(0,0,0,0.45)); }

  .a-organic-line-1 { animation: a-organic-1 7s ease-in-out infinite, a-fade-in 800ms ease-out both; }
  .a-organic-line-2 { animation: a-organic-2 8s ease-in-out infinite, a-fade-in 800ms ease-out both; }

  .a-ghost { opacity: 0.18 !important; filter: saturate(0.4); }
  .a-spotlight { filter: drop-shadow(0 8px 24px rgba(160,123,214,0.5)); }

  /* Avatar hover overlay */
  .a-avatar-wrap { cursor: pointer; }
  .a-avatar-wrap .a-avatar-overlay { opacity: 0; transition: opacity 200ms ease; }
  .a-avatar-wrap:hover .a-avatar-overlay { opacity: 1; }
  .a-avatar-remove { opacity: 0; transition: opacity 200ms ease; }
  .a-avatar-wrap:hover .a-avatar-remove { opacity: 1; }

  /* === Paralaxe estelar (fundo "universo") === */
  @keyframes a-starfield-slow {
    0% { background-position: 0% 0%; }
    100% { background-position: 100% 100%; }
  }
  @keyframes a-starfield-mid {
    0% { background-position: 0% 50%; }
    100% { background-position: 100% -50%; }
  }
  @keyframes a-starfield-fast {
    0% { background-position: 50% 0%; }
    100% { background-position: -50% 100%; }
  }
`;


// === Helpers ===

function radialPositions(count, radius, cx, cy, startAngle = -Math.PI / 2, sweep = Math.PI * 2) {
  if (count <= 0) return [];
  if (count === 1) return [{ x: cx + Math.cos(startAngle) * radius, y: cy + Math.sin(startAngle) * radius, angle: startAngle }];
  const step = sweep / count;
  return Array.from({ length: count }, (_, i) => {
    const a = startAngle + i * step;
    return { x: cx + Math.cos(a) * radius, y: cy + Math.sin(a) * radius, angle: a };
  });
}

function placeNotebooksWithGravity(notebooks, notesByNotebook, cx, cy, baseRadius, gravityRange = 60) {
  const n = notebooks.length;
  if (n === 0) return [];

  // Calcular noteCount máximo pra normalizar
  const counts = notebooks.map(nb => (notesByNotebook[nb.id] || []).length);
  const maxCount = Math.max(1, ...counts);

  // Posições angulares base
  const angles = (() => {
    if (n === 1) return [0];
    if (n === 2) return [0, Math.PI];
    return Array.from({ length: n }, (_, i) => -Math.PI / 2 + i * (Math.PI * 2 / n));
  })();

  // Lei da gravidade: caderno com mais notas → raio menor (mais perto do centro)
  return notebooks.map((nb, i) => {
    const cnt = counts[i];
    const gravityFactor = cnt / maxCount; // 0 (vazio) → 1 (mais cheio)
    const radius = baseRadius - gravityFactor * gravityRange;
    return {
      x: cx + Math.cos(angles[i]) * radius,
      y: cy + Math.sin(angles[i]) * radius,
      angle: angles[i],
      radius,
      noteCount: cnt,
      gravityFactor,
    };
  });
}

/**
 * Posiciona núcleos das áreas da vida com lei da gravidade.
 * Áreas com mais Pulsos → mais perto do centro.
 * Áreas vazias → não aparecem (filter).
 *
 * Doc: estrutura_neurocognitiva_mestre/areas-da-vida.md
 */
function placeLifeAreasWithGravity(activeAreas, gravity, cx, cy, baseRadius, gravityRange = 60) {
  const n = activeAreas.length;
  if (n === 0) return [];

  // Posições angulares base — distribui em círculo, começando do topo
  const angles = (() => {
    if (n === 1) return [-Math.PI / 2]; // topo
    return Array.from({ length: n }, (_, i) => -Math.PI / 2 + i * (Math.PI * 2 / n));
  })();

  return activeAreas.map((area, i) => {
    const g = gravity[area.id] || 0; // 0..1
    const radius = baseRadius - g * gravityRange;
    return {
      x: cx + Math.cos(angles[i]) * radius,
      y: cy + Math.sin(angles[i]) * radius,
      angle: angles[i],
      radius,
      noteCount: area.usage || 0,
      gravityFactor: g,
    };
  });
}

function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '\u2026' : str;
}

function curvedPath(x1, y1, x2, y2, curvature = 0.18) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const px = -dy / len;
  const py = dx / len;
  const off = len * curvature;
  return `M ${x1} ${y1} Q ${midX + px * off} ${midY + py * off} ${x2} ${y2}`;
}

function arcAroundCenter(x1, y1, x2, y2, cx, cy, strength = 0.32) {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const offX = (midX - cx) * strength;
  const offY = (midY - cy) * strength;
  return `M ${x1} ${y1} Q ${midX + offX} ${midY + offY} ${x2} ${y2}`;
}


// ================== COMPONENTE PRINCIPAL ==================

export default function ConnectionMap({ note, store, onClose }) {
  // === HOOKS ===
  const [hoveredId, setHoveredId] = useState(null);
  const [hoveredType, setHoveredType] = useState(null);
  // Deferimos o hover: o React aplica o highlight em prioridade baixa,
  // mantendo o cursor/UI responsivos mesmo em mapa grande.
  const deferredHoveredId = useDeferredValue(hoveredId);
  const deferredHoveredType = useDeferredValue(hoveredType);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarError, setAvatarError] = useState(null);
  const [avatarHover, setAvatarHover] = useState(false);
  // Visão do mapa: 'notebooks' (padrão, comportamento atual) | 'lifeAreas' (núcleos das áreas da vida)
  const [mapView, setMapView] = useState(MAP_VIEW_NOTEBOOKS);
  const fileInputRef = useRef(null);
  const svgRef = useRef(null);

  // Pan/zoom
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const panStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  // rAF-throttle: agenda 1 update de pan por frame, mesmo que o mouse
  // dispare 100+ eventos por segundo. Reduz drasticamente re-renders.
  const panRafId = useRef(null);
  const pendingPan = useRef(null);

  // ESC fecha
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Carrega avatar
  useEffect(() => {
    try {
      const saved = localStorage.getItem(AVATAR_STORAGE_KEY);
      if (saved && saved.startsWith('data:image/')) setAvatarUrl(saved);
    } catch (_) { /* defensivo */ }
  }, []);

  // Carrega preferência de visão do mapa
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MAP_VIEW_STORAGE_KEY);
      if (saved === MAP_VIEW_LIFE_AREAS || saved === MAP_VIEW_NOTEBOOKS) {
        setMapView(saved);
      }
    } catch (_) { /* defensivo */ }
  }, []);

  // Persiste preferência ao mudar
  useEffect(() => {
    try {
      localStorage.setItem(MAP_VIEW_STORAGE_KEY, mapView);
    } catch (_) { /* defensivo */ }
  }, [mapView]);

  // Limpa frame pendente do pan ao desmontar (evita leak / set-state em ciclos finalizados)
  useEffect(() => {
    return () => {
      if (panRafId.current != null) {
        cancelAnimationFrame(panRafId.current);
        panRafId.current = null;
      }
    };
  }, []);

  // Cadernos
  const notebooks = useMemo(() => {
    return (store.notebooks || []).filter(nb => nb && nb.id);
  }, [store.notebooks]);

  // Notas por caderno
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

  // Conexões inter-notas
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


  // Layout
  const layout = useMemo(() => {
    const VIEW = 1000;
    const cx = VIEW / 2;
    const cy = VIEW / 2;
    const RING1_BASE = 270;        // raio base dos cadernos/áreas
    const GRAVITY_RANGE = 70;       // amplitude da gravidade
    const RING2_OFFSET = 170;       // notas ficam X unidades além do núcleo-pai

    const isLifeAreasView = mapView === MAP_VIEW_LIFE_AREAS;

    // ============================================================
    // Camada de núcleos (anel 1): cadernos OU áreas da vida
    // ============================================================
    let ringNodes = [];

    if (isLifeAreasView) {
      // === Visão por áreas da vida ===
      // Calcula áreas ativas (com Pulsos) e suas gravidades
      const activeNotes = (store.notes || []).filter(n => !n.isTrash && !n.isArchived);
      const usage = getAreaUsage(activeNotes);
      const gravity = calculateAreaGravity(activeNotes);
      // Lista as áreas ativas em ordem canônica (saúde primeiro, outros por último)
      const activeAreas = listLifeAreas()
        .filter(a => (usage[a.id] || 0) > 0)
        .map(a => ({ ...a, usage: usage[a.id] || 0 }));

      const positions = placeLifeAreasWithGravity(activeAreas, gravity, cx, cy, RING1_BASE, GRAVITY_RANGE);
      ringNodes = activeAreas.map((area, i) => ({
        kind: 'lifeArea',
        id: area.id,
        type: 'lifeArea',
        label: area.name,
        shortName: area.shortName,
        color: area.color,
        colorDark: area.colorDark,
        colorLight: area.colorLight,
        colorGlow: area.colorGlow,
        iconName: area.icon,
        ...positions[i],
      }));
    } else {
      // === Visão por cadernos (comportamento original) ===
      const nbPositions = placeNotebooksWithGravity(notebooks, notesByNotebook, cx, cy, RING1_BASE, GRAVITY_RANGE);
      ringNodes = notebooks.map((nb, i) => ({
        kind: 'notebook',
        id: nb.id,
        type: 'notebook',
        label: nb.name || 'Caderno',
        color: nb.color || '#5B2D8E',
        raw: nb, // pra passar pra NotebookCover
        ...nbPositions[i],
      }));
    }

    // ============================================================
    // Camada de notas (anel 2): notas distribuídas em volta do núcleo-pai
    // ============================================================
    const noteNodes = [];

    if (isLifeAreasView) {
      // Agrupar notas por área da vida
      const notesByArea = {};
      (store.notes || []).forEach(n => {
        if (n.isTrash || n.isArchived) return;
        const areaId = (n.lifeArea && LIFE_AREAS[n.lifeArea]) ? n.lifeArea : 'outros';
        if (!notesByArea[areaId]) notesByArea[areaId] = [];
        notesByArea[areaId].push(n);
      });

      ringNodes.forEach((areaNode, areaIdx) => {
        const notes = notesByArea[areaNode.id] || [];
        if (notes.length === 0) return;
        const baseAngle = areaNode.angle ?? -Math.PI / 2;
        const nbR = areaNode.radius ?? RING1_BASE;
        const notesR = nbR + RING2_OFFSET;

        let maxSpread;
        if (ringNodes.length === 1) maxSpread = Math.PI * 1.5;
        else if (ringNodes.length === 2) maxSpread = Math.PI * 0.9;
        else maxSpread = Math.min(Math.PI / 2.4, (Math.PI * 2 / ringNodes.length) * 0.78);

        const step = notes.length > 1 ? maxSpread / (notes.length - 1) : 0;
        const startA = baseAngle - maxSpread / 2;

        notes.forEach((nt, nIdx) => {
          const a = notes.length === 1 ? baseAngle : startA + nIdx * step;
          noteNodes.push({
            id: nt.id,
            type: 'note',
            label: nt.title || 'Sem título',
            noteType: nt.type || 'rascunho',
            // notebookId mantido pra retrocompat de hover/highlight
            notebookId: areaNode.id,
            isFavorite: nt.isFavorite,
            x: cx + Math.cos(a) * notesR,
            y: cy + Math.sin(a) * notesR,
            angle: a,
          });
        });
      });
    } else {
      // === Visão por cadernos: notas em volta do caderno-pai (original) ===
      notebooks.forEach((nb, nbIdx) => {
        const notes = notesByNotebook[nb.id] || [];
        if (notes.length === 0) return;
        const ringNode = ringNodes[nbIdx];
        const baseAngle = ringNode?.angle ?? -Math.PI / 2;
        const nbR = ringNode?.radius ?? RING1_BASE;
        const notesR = nbR + RING2_OFFSET;

        let maxSpread;
        if (notebooks.length === 1) maxSpread = Math.PI * 1.5;
        else if (notebooks.length === 2) maxSpread = Math.PI * 0.9;
        else maxSpread = Math.min(Math.PI / 2.4, (Math.PI * 2 / notebooks.length) * 0.78);

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
            x: cx + Math.cos(a) * notesR,
            y: cy + Math.sin(a) * notesR,
            angle: a,
          });
        });
      });
    }

    return { cx, cy, view: VIEW, notebookNodes: ringNodes, noteNodes, mapView };
  }, [notebooks, notesByNotebook, mapView, store.notes]);

  // === HANDLERS ===
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
    e.target.value = '';
  }, []);

  const handleAvatarRemove = useCallback(() => {
    try {
      localStorage.removeItem(AVATAR_STORAGE_KEY);
      setAvatarUrl(null);
    } catch (_) { /* defensivo */ }
  }, []);


  // === Pan/Zoom (MindMeister-like) ===
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom(prev => {
      const next = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, prev + delta));
      // Zoom centrado no cursor (compensando pan)
      if (svgRef.current && next !== prev) {
        const rect = svgRef.current.getBoundingClientRect();
        const cursorX = e.clientX - rect.left - rect.width / 2;
        const cursorY = e.clientY - rect.top - rect.height / 2;
        const ratio = next / prev;
        setPan(p => ({
          x: cursorX - (cursorX - p.x) * ratio,
          y: cursorY - (cursorY - p.y) * ratio,
        }));
      }
      return next;
    });
  }, []);

  const handleMouseDown = useCallback((e) => {
    // Só inicia pan se o clique foi em área "vazia" (não em nó)
    // O target precisa ser o próprio SVG ou o background rect
    const isBackground = e.target === svgRef.current || e.target.tagName === 'rect' || e.target.classList?.contains('a-pan-bg');
    if (!isBackground) return;
    setIsPanning(true);
    panStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e) => {
    if (!isPanning) return;
    const dx = e.clientX - panStart.current.x;
    const dy = e.clientY - panStart.current.y;
    // Guarda a posição mais recente; o rAF pega o último valor no próximo frame
    pendingPan.current = { x: panStart.current.panX + dx, y: panStart.current.panY + dy };
    if (panRafId.current == null) {
      panRafId.current = requestAnimationFrame(() => {
        panRafId.current = null;
        if (pendingPan.current) {
          setPan(pendingPan.current);
          pendingPan.current = null;
        }
      });
    }
  }, [isPanning]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
    // Cancela frame pendente e aplica o último pan se houver
    if (panRafId.current != null) {
      cancelAnimationFrame(panRafId.current);
      panRafId.current = null;
    }
    if (pendingPan.current) {
      setPan(pendingPan.current);
      pendingPan.current = null;
    }
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const zoomIn = useCallback(() => setZoom(z => Math.min(ZOOM_MAX, z + ZOOM_STEP * 2)), []);
  const zoomOut = useCallback(() => setZoom(z => Math.max(ZOOM_MIN, z - ZOOM_STEP * 2)), []);

  // Highlight de subconjunto — usa o hover deferido pra não travar a UI
  const highlightSet = useMemo(() => {
    if (!deferredHoveredId) return null;
    const set = new Set([deferredHoveredId]);
    if (deferredHoveredType === 'notebook') {
      layout.noteNodes.forEach(nn => {
        if (nn.notebookId === deferredHoveredId) set.add(nn.id);
      });
    } else if (deferredHoveredType === 'note') {
      const nt = layout.noteNodes.find(nn => nn.id === deferredHoveredId);
      if (nt) set.add(nt.notebookId);
      interNoteConnections.forEach(c => {
        if (c.sourceId === deferredHoveredId) set.add(c.targetId);
        if (c.targetId === deferredHoveredId) set.add(c.sourceId);
      });
    }
    return set;
  }, [deferredHoveredId, deferredHoveredType, layout.noteNodes, interNoteConnections]);

  // ====== SEM HOOKS NOVOS A PARTIR DAQUI ======
  const totalNotes = layout.noteNodes.length;
  const totalNotebooks = layout.notebookNodes.length;
  const totalConnections = interNoteConnections.length;
  const isEmpty = totalNotebooks === 0 && totalNotes === 0;
  const onlyNotebooksNoNotes = totalNotebooks > 0 && totalNotes === 0;


  return (
    <div
      className="fixed inset-0 z-[60] bg-gradient-to-br from-[#1A0E33] via-[#2D1B4E] to-[#3D1B66] select-none"
      role="dialog"
      aria-modal="true"
      aria-label="Mapa visual — ecossistema pessoal"
    >
      {/* Injeção CSS para animações fora do SVG (paralaxe estelar) */}
      <style dangerouslySetInnerHTML={{ __html: SVG_STYLE }} />
      {/* Textura sutil */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(123,77,186,0.18) 0%, transparent 60%)' }}
      />

      {/* === FUNDO UNIVERSO — 3 camadas de paralaxe estelar === */}
      {/* Camada 1 (fundo): estrelas pequenas fixas — tom roxo muito sutil */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          backgroundImage: `
            radial-gradient(1px 1px at 10% 15%, rgba(160,123,214,0.35), transparent),
            radial-gradient(1px 1px at 25% 45%, rgba(160,123,214,0.25), transparent),
            radial-gradient(1px 1px at 50% 80%, rgba(160,123,214,0.3), transparent),
            radial-gradient(1px 1px at 70% 20%, rgba(160,123,214,0.2), transparent),
            radial-gradient(1px 1px at 85% 60%, rgba(160,123,214,0.3), transparent),
            radial-gradient(1px 1px at 40% 10%, rgba(160,123,214,0.25), transparent),
            radial-gradient(1px 1px at 60% 55%, rgba(160,123,214,0.2), transparent),
            radial-gradient(1.2px 1.2px at 15% 70%, rgba(200,180,253,0.3), transparent),
            radial-gradient(0.8px 0.8px at 90% 35%, rgba(200,180,253,0.25), transparent),
            radial-gradient(1px 1px at 35% 90%, rgba(160,123,214,0.3), transparent),
            radial-gradient(0.8px 0.8px at 75% 75%, rgba(160,123,214,0.2), transparent),
            radial-gradient(1px 1px at 5% 50%, rgba(200,180,253,0.25), transparent),
            radial-gradient(1.2px 1.2px at 55% 25%, rgba(160,123,214,0.3), transparent),
            radial-gradient(0.8px 0.8px at 45% 65%, rgba(160,123,214,0.2), transparent)
          `,
          backgroundSize: '200% 200%',
          animation: 'a-starfield-slow 120s linear infinite',
        }}
      />
      {/* Camada 2 (média): partículas maiores — brilho sutil */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          backgroundImage: `
            radial-gradient(1.5px 1.5px at 20% 30%, rgba(200,180,253,0.4), transparent),
            radial-gradient(2px 2px at 65% 15%, rgba(200,180,253,0.3), transparent),
            radial-gradient(1.5px 1.5px at 80% 70%, rgba(200,180,253,0.35), transparent),
            radial-gradient(1.8px 1.8px at 30% 85%, rgba(160,123,214,0.3), transparent),
            radial-gradient(2px 2px at 50% 50%, rgba(200,180,253,0.25), transparent),
            radial-gradient(1.5px 1.5px at 10% 90%, rgba(160,123,214,0.3), transparent)
          `,
          backgroundSize: '180% 180%',
          animation: 'a-starfield-mid 80s linear infinite reverse',
        }}
      />
      {/* Camada 3 (frente): poucas estrelas grandes — brilho roxo claro */}
      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={{
          backgroundImage: `
            radial-gradient(2.5px 2.5px at 15% 45%, rgba(200,180,253,0.5), transparent),
            radial-gradient(3px 3px at 75% 25%, rgba(200,180,253,0.35), transparent),
            radial-gradient(2px 2px at 45% 75%, rgba(200,180,253,0.4), transparent)
          `,
          backgroundSize: '150% 150%',
          animation: 'a-starfield-fast 55s linear infinite',
        }}
      />

      {/* HEADER glass */}
      <div className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-5 py-3 backdrop-blur-md bg-white/8 border-b border-white/10">
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
            {totalNotebooks} {totalNotebooks === 1 ? (mapView === MAP_VIEW_LIFE_AREAS ? 'área ativa' : 'caderno') : (mapView === MAP_VIEW_LIFE_AREAS ? 'áreas ativas' : 'cadernos')} · {totalNotes} {totalNotes === 1 ? 'anotação' : 'anotações'} · {totalConnections} {totalConnections === 1 ? 'conexão' : 'conexões'}
          </p>
          {/* Toggle de visão (segmented control) */}
          <div className="mt-1.5 inline-flex items-center bg-white/10 rounded-full p-0.5 border border-white/15">
            <button
              onClick={() => setMapView(MAP_VIEW_NOTEBOOKS)}
              className={`text-2xs font-medium px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 ${
                mapView === MAP_VIEW_NOTEBOOKS
                  ? 'bg-white text-anotata-roxo-escuro shadow-sm'
                  : 'text-white/75 hover:text-white'
              }`}
              aria-pressed={mapView === MAP_VIEW_NOTEBOOKS}
              title="Ver mapa por cadernos"
            >
              <BookOpen size={11} />
              <span>Cadernos</span>
            </button>
            <button
              onClick={() => setMapView(MAP_VIEW_LIFE_AREAS)}
              className={`text-2xs font-medium px-2.5 py-1 rounded-full transition-colors flex items-center gap-1 ${
                mapView === MAP_VIEW_LIFE_AREAS
                  ? 'bg-white text-anotata-roxo-escuro shadow-sm'
                  : 'text-white/75 hover:text-white'
              }`}
              aria-pressed={mapView === MAP_VIEW_LIFE_AREAS}
              title="Ver mapa por áreas da vida"
            >
              <Layers size={11} />
              <span>Áreas da vida</span>
            </button>
          </div>
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

      {/* CONTROLES DE ZOOM (canto inferior direito) */}
      <div className="absolute bottom-20 right-5 z-30 flex flex-col gap-1.5 backdrop-blur-md bg-white/8 border border-white/10 rounded-lg p-1.5">
        <button
          onClick={zoomIn}
          className="p-1.5 rounded text-white/85 hover:text-white hover:bg-white/15 transition-colors"
          title="Aproximar (scroll)"
          aria-label="Aproximar"
        >
          <ZoomIn size={16} />
        </button>
        <button
          onClick={zoomOut}
          className="p-1.5 rounded text-white/85 hover:text-white hover:bg-white/15 transition-colors"
          title="Afastar (scroll)"
          aria-label="Afastar"
        >
          <ZoomOut size={16} />
        </button>
        <button
          onClick={resetView}
          className="p-1.5 rounded text-white/85 hover:text-white hover:bg-white/15 transition-colors"
          title="Centralizar e resetar zoom"
          aria-label="Resetar visualização"
        >
          <Maximize2 size={16} />
        </button>
        <div className="text-2xs text-white/55 text-center pt-1 border-t border-white/10">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Dica de navegação (canto inferior esquerdo, só na primeira vez) */}
      <div className="absolute bottom-20 left-5 z-30 backdrop-blur-md bg-white/8 border border-white/10 rounded-lg px-3 py-2 text-2xs text-white/65 max-w-[240px]">
        <div className="font-semibold text-white/85 mb-0.5">Como navegar:</div>
        <div>· Scroll = zoom</div>
        <div>· Arrastar fundo = mover mapa</div>
      </div>

      {/* Input file invisível */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleAvatarFile}
        className="hidden"
        aria-label="Escolher foto de perfil"
      />

      {/* CORPO DO MAPA */}
      <div className="absolute inset-0 pt-16">
        {isEmpty ? (
          <MapEmptyState onClose={onClose} onCreate={handleCreateNote} hasNotebookNoNotes={false} />
        ) : onlyNotebooksNoNotes ? (
          <MapEmptyState onClose={onClose} onCreate={handleCreateNote} hasNotebookNoNotes={true} />
        ) : (
          <EcosystemSvg
            ref={svgRef}
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
            zoom={zoom}
            pan={pan}
            isPanning={isPanning}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            notesByNotebook={notesByNotebook}
          />
        )}
      </div>

      {avatarError && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg bg-anotata-goiaba text-white text-sm shadow-2xl z-40">
          {avatarError}
        </div>
      )}

      {/* PAINEL INFERIOR */}
      <div className="absolute bottom-0 left-0 right-0 z-30">
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

// Componente da Nota — memoizado para evitar re-render quando outras notas
// mudam de hover/highlight. Recebe todas as derivações já calculadas pelo pai
// (accentColor, isHover, dim, delayMs) — assim a comparação shallow do
// React.memo funciona perfeitamente: nota que não mudou, não re-renderiza.
const NoteNode = React.memo(function NoteNode({
  nn, accentColor, parentLabel,
  isHover, dim, delayMs,
  onHoverEnter, onHoverLeave, onOpen,
}) {
  // Dimensões da folha
  const PW = 64;
  const PH = 78;
  const px = nn.x - PW / 2;
  const py = nn.y - PH / 2;

  return (
    <g
      className={`a-note ${dim ? 'a-ghost' : ''} ${isHover ? 'a-spotlight' : ''}`}
      style={{ cursor: 'pointer', animationDelay: `${delayMs}ms` }}
      onMouseEnter={() => onHoverEnter(nn.id)}
      onMouseLeave={onHoverLeave}
      onClick={() => onOpen(nn.id)}
      tabIndex={0}
      role="button"
      aria-label={`Anotação ${nn.label}, abrir`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(nn.id); } }}
    >
      <title>{nn.label}{parentLabel ? ` — ${parentLabel}` : ''}</title>

      {/* Sombra projetada da folha (suave) */}
      <rect
        x={px + 2} y={py + 4}
        width={PW} height={PH}
        rx="16"
        fill="#000000" opacity="0.25"
      />

      {/* Folha branca pura — borda branca delicada separa do fundo escuro;
          borda colorida só no hover (feedback de interação) */}
      <rect
        x={px} y={py}
        width={PW} height={PH}
        rx="16"
        fill="#FFFFFF"
        stroke={isHover ? accentColor : 'rgba(255,255,255,0.55)'}
        strokeWidth={isHover ? 1.8 : 1}
      />

      {/* Tag colorida (etiqueta) — DENTRO da folha, canto superior esquerdo:
          marcador discreto da área/caderno-pai, sem invadir a página */}
      <rect
        x={px + 8} y={py + 8}
        width={22} height={5}
        rx="2.5"
        fill={accentColor}
      />

      {/* Linhas simulando texto — começam logo abaixo da tag */}
      <line x1={px + 8} y1={py + 22} x2={px + PW - 8} y2={py + 22} stroke="#5B4A7A" strokeWidth="1" opacity="0.55" strokeLinecap="round" />
      <line x1={px + 8} y1={py + 30} x2={px + PW - 14} y2={py + 30} stroke="#5B4A7A" strokeWidth="0.9" opacity="0.4" strokeLinecap="round" />
      <line x1={px + 8} y1={py + 38} x2={px + PW - 10} y2={py + 38} stroke="#5B4A7A" strokeWidth="0.9" opacity="0.4" strokeLinecap="round" />
      <line x1={px + 8} y1={py + 46} x2={px + PW - 20} y2={py + 46} stroke="#5B4A7A" strokeWidth="0.9" opacity="0.4" strokeLinecap="round" />
      <line x1={px + 8} y1={py + 54} x2={px + PW - 16} y2={py + 54} stroke="#5B4A7A" strokeWidth="0.9" opacity="0.4" strokeLinecap="round" />

      {/* Estrela de favorito — canto superior direito, sem conflitar com a tag */}
      {nn.isFavorite && (
        <g transform={`translate(${px + PW - 9}, ${py + 10})`}>
          <path
            d="M 0 -2.8 L 0.8 -0.8 L 2.8 -0.8 L 1.2 0.5 L 1.8 2.5 L 0 1.3 L -1.8 2.5 L -1.2 0.5 L -2.8 -0.8 L -0.8 -0.8 Z"
            fill="#F0B400"
            stroke="#F0B400"
            strokeWidth="0.6"
            strokeLinejoin="round"
          />
        </g>
      )}

      {/* Dobra de canto (efeito de papel dobrado) — canto inferior direito */}
      <path
        d={`M ${px + PW - 8} ${py + PH} L ${px + PW} ${py + PH - 8} L ${px + PW} ${py + PH} Z`}
        fill={accentColor}
        opacity="0.18"
      />
      <path
        d={`M ${px + PW - 8} ${py + PH} L ${px + PW} ${py + PH - 8}`}
        stroke={accentColor}
        strokeWidth="0.6"
        opacity="0.4"
      />

      {/* Título da nota abaixo da folha (legível sobre fundo escuro) */}
      <foreignObject x={nn.x - 70} y={py + PH + 6} width="140" height="32">
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            width: '100%',
            textAlign: 'center',
            fontSize: '10.5px',
            lineHeight: 1.3,
            fontWeight: 500,
            color: '#FFFFFF',
            fontFamily: SVG_FONT,
            textShadow: '0 1px 4px rgba(0,0,0,0.7)',
            overflow: 'hidden',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
          }}
        >
          {truncate(nn.label, 38)}
        </div>
      </foreignObject>
    </g>
  );
});

const EcosystemSvg = React.forwardRef(function EcosystemSvgInner({
  layout, connections, hoveredId, hoveredType, highlightSet,
  setHoveredId, setHoveredType, onOpenNote,
  avatarUrl, onAvatarClick, onAvatarRemove,
  zoom, pan, isPanning, onWheel, onMouseDown, onMouseMove, onMouseUp,
  notesByNotebook,
}, ref) {
  const { cx, cy, view, notebookNodes, noteNodes } = layout;

  const posById = useMemo(() => {
    const m = {};
    noteNodes.forEach(n => { m[n.id] = { x: n.x, y: n.y }; });
    notebookNodes.forEach(nb => { m[nb.id] = { x: nb.x, y: nb.y }; });
    return m;
  }, [noteNodes, notebookNodes]);

  // Mapa de notebookId -> { color, label } — calculado uma vez por mudança
  // de layout. Evita o .find() por nota a cada render.
  const notebookMeta = useMemo(() => {
    const m = {};
    notebookNodes.forEach(nb => {
      m[nb.id] = { color: nb.color || '#7B4DBA', label: nb.label };
    });
    return m;
  }, [notebookNodes]);

  // Handlers de hover estáveis — permitem que o React.memo do NoteNode
  // funcione (props de função não mudam de referência entre renders).
  const handleNoteHoverEnter = useCallback((id) => {
    setHoveredId(id);
    setHoveredType('note');
  }, [setHoveredId, setHoveredType]);
  const handleNoteHoverLeave = useCallback(() => {
    setHoveredId(null);
    setHoveredType(null);
  }, [setHoveredId, setHoveredType]);

  const delayCenter = 0;
  const delayNotebookBase = 250;
  const delayNoteBase = 250 + notebookNodes.length * 90 + 100;
  const delayConnections = delayNoteBase + noteNodes.length * 35 + 100;

  // Tamanho dos cadernos
  const NB_W = 130;
  const NB_H = 168;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${view} ${view}`}
      preserveAspectRatio="xMidYMid meet"
      className="w-full h-full"
      style={{
        fontFamily: SVG_FONT,
        cursor: isPanning ? 'grabbing' : 'grab',
        touchAction: 'none',
      }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <style>{SVG_STYLE}</style>

      <defs>
        <radialGradient id="coreHalo" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7B4DBA" stopOpacity="0.5" />
          <stop offset="50%" stopColor="#5B2D8E" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#5B2D8E" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="coreFill" cx="35%" cy="35%" r="80%">
          <stop offset="0%" stopColor="#A07BD6" />
          <stop offset="55%" stopColor="#7B4DBA" />
          <stop offset="100%" stopColor="#5B2D8E" />
        </radialGradient>
        <radialGradient id="coreRing" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#7B4DBA" stopOpacity="0" />
          <stop offset="80%" stopColor="#A07BD6" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#A07BD6" stopOpacity="0" />
        </radialGradient>
        <pattern id="dotgrid" patternUnits="userSpaceOnUse" width="44" height="44">
          <circle cx="22" cy="22" r="0.9" fill="#FFFFFF" opacity="0.05" />
        </pattern>
        <filter id="lineGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <clipPath id="avatarClip">
          <circle cx={cx} cy={cy} r="58" />
        </clipPath>
      </defs>

      {/* Fundo (clicável pra pan) */}
      <rect x="0" y="0" width={view} height={view} fill="url(#dotgrid)" className="a-pan-bg" />

      {/* Camada principal: tudo aqui sofre pan + zoom */}
      <g
        transform={`translate(${cx + pan.x / zoom * 1} ${cy + pan.y / zoom * 1}) scale(${zoom}) translate(${-cx} ${-cy})`}
        style={{ willChange: 'transform' }}
      >

        {/* Halo central */}
        <circle cx={cx} cy={cy} r={320} fill="url(#coreHalo)" />

        {/* Anéis-guia (sutilíssimos) */}
        <circle cx={cx} cy={cy} r={270} fill="none" stroke="#FFFFFF" strokeWidth="0.5" strokeDasharray="3 8" opacity="0.07" />
        <circle cx={cx} cy={cy} r={440} fill="none" stroke="#FFFFFF" strokeWidth="0.4" strokeDasharray="2 10" opacity="0.05" />


        {/* === Linhas caderno → notas === */}
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

        {/* === 3 ondas concêntricas === */}
        <circle cx={cx} cy={cy} r="68" fill="none" stroke="#A07BD6" strokeWidth="2" opacity="0.45" className="a-emanate" />
        <circle cx={cx} cy={cy} r="68" fill="none" stroke="#A07BD6" strokeWidth="2" opacity="0.45" className="a-emanate a-emanate-2" />
        <circle cx={cx} cy={cy} r="68" fill="none" stroke="#A07BD6" strokeWidth="2" opacity="0.45" className="a-emanate a-emanate-3" />

        {/* === Conexões inter-notas === */}
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

        {/* === Linhas centro → cadernos === */}
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
              <circle r="2.5" fill="#A07BD6" filter="url(#lineGlow)" opacity={dim ? 0.2 : 0.7}>
                <animateMotion dur={`${4 + (idx % 3)}s`} repeatCount="indefinite" begin={`${idx * 0.5}s`}>
                  <mpath href={`#${pathId}`} />
                </animateMotion>
              </circle>
            </g>
          );
        })}


        {/* === NÚCLEO MINIMALISTA PREMIUM === */}
        <g
          className="a-core-pulse"
          style={{ animationDelay: `${delayCenter}ms` }}
        >
          {/* Anel pulsante externo (gradiente sutil) */}
          <circle cx={cx} cy={cy} r="74" fill="url(#coreRing)" />
          {/* Borda branca fina */}
          <circle cx={cx} cy={cy} r="62" fill="none" stroke="#FFFFFF" strokeWidth="2" opacity="0.95" />

          {/* Conteúdo via foreignObject (HTML/CSS = mais flexível e premium) */}
          <foreignObject x={cx - 60} y={cy - 60} width="120" height="120" style={{ overflow: 'visible' }}>
            <div
              xmlns="http://www.w3.org/1999/xhtml"
              className="a-avatar-wrap"
              style={{
                width: 120,
                height: 120,
                position: 'relative',
                borderRadius: '50%',
                overflow: 'hidden',
                background: avatarUrl
                  ? 'transparent'
                  : 'radial-gradient(circle at 30% 30%, #A07BD6, #5B2D8E 70%, #3D1B66)',
                boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.15), 0 8px 24px rgba(0,0,0,0.3)',
              }}
              onClick={onAvatarClick}
              role="button"
              tabIndex={0}
              aria-label={avatarUrl ? 'Trocar foto de perfil' : 'Adicionar foto de perfil'}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onAvatarClick(); } }}
              title={avatarUrl ? 'Clique para trocar sua foto' : 'Clique para adicionar sua foto'}
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Foto de perfil"
                  draggable={false}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                />
              ) : (
                // Placeholder minimalista — apenas tipografia "VOCÊ" elegante
                <div
                  style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    gap: 6,
                    color: '#FFFFFF',
                    fontFamily: SVG_FONT,
                  }}
                >
                  <div style={{ fontSize: 13, fontWeight: 300, letterSpacing: '0.32em', opacity: 0.7 }}>
                    VOCÊ
                  </div>
                  <div style={{ width: 28, height: 1, backgroundColor: 'rgba(255,255,255,0.4)' }} />
                  <div style={{ fontSize: 9, fontWeight: 400, letterSpacing: '0.18em', opacity: 0.55 }}>
                    O NÚCLEO
                  </div>
                </div>
              )}

              {/* Overlay no hover (elegante, sem ícone amador) */}
              <div
                className="a-avatar-overlay"
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexDirection: 'column',
                  gap: 4,
                  background: 'linear-gradient(180deg, rgba(0,0,0,0) 30%, rgba(0,0,0,0.55) 100%)',
                  color: '#FFFFFF',
                  fontFamily: SVG_FONT,
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  paddingBottom: 14,
                  pointerEvents: 'none',
                }}
              >
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.18)',
                  backdropFilter: 'blur(6px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1px solid rgba(255,255,255,0.4)',
                  marginBottom: 2,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                    <circle cx="12" cy="13" r="3"/>
                  </svg>
                </div>
                <span>{avatarUrl ? 'Trocar' : 'Foto'}</span>
              </div>
            </div>
          </foreignObject>

          {/* Botão remover foto (só visível no hover quando há foto) */}
          {avatarUrl && (
            <foreignObject x={cx + 38} y={cy + 38} width="32" height="32">
              <div
                xmlns="http://www.w3.org/1999/xhtml"
                className="a-avatar-remove"
                onClick={(e) => { e.stopPropagation(); onAvatarRemove(); }}
                role="button"
                tabIndex={0}
                aria-label="Remover foto de perfil"
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onAvatarRemove(); } }}
                title="Remover foto"
                style={{
                  width: 26, height: 26,
                  borderRadius: '50%',
                  background: '#5B2D8E',
                  border: '2px solid #FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </div>
            </foreignObject>
          )}
        </g>


        {/* === NÍVEL 2: Cadernos PREMIUM (NotebookCover) ou Áreas da Vida === */}
        {notebookNodes.map((nb, idx) => {
          const isHover = hoveredId === nb.id && hoveredType === 'notebook';
          const dim = highlightSet && !highlightSet.has(nb.id);
          const noteCount = noteNodes.filter(n => n.notebookId === nb.id).length;
          const isLifeArea = nb.kind === 'lifeArea';

          // Pulso defasado
          const pulseDelay = (idx * 0.7) % 5.5;

          // Renderização condicional do conteúdo (NotebookCover OU Disco da Área)
          let innerContent;
          if (isLifeArea) {
            // === ÁREA DA VIDA: disco premium com cor + ícone Lucide ===
            const IconComp = LIFE_AREA_ICON_MAP[nb.id] || CircleDot;
            innerContent = (
              <foreignObject
                x={nb.x - NB_W / 2}
                y={nb.y - NB_H / 2}
                width={NB_W}
                height={NB_H}
                style={{ overflow: 'visible' }}
              >
                <div
                  xmlns="http://www.w3.org/1999/xhtml"
                  style={{
                    width: NB_W,
                    height: NB_H,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    background: `radial-gradient(circle at 30% 30%, ${nb.colorGlow || nb.color}, ${nb.color} 65%, ${nb.colorDark || nb.color})`,
                    borderRadius: '50%',
                    boxShadow: `inset 0 0 0 2px rgba(255,255,255,0.18), 0 8px 24px rgba(0,0,0,0.35), 0 0 28px ${nb.color}40`,
                    color: '#FFFFFF',
                    fontFamily: SVG_FONT,
                    border: `2px solid rgba(255,255,255,0.3)`,
                    aspectRatio: '1 / 1',
                    width: NB_W,
                    height: NB_W, // disco circular
                  }}
                >
                  <IconComp size={28} strokeWidth={1.8} />
                  <div style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: '0.04em',
                    textAlign: 'center',
                    lineHeight: 1.2,
                    padding: '0 8px',
                    textShadow: '0 1px 4px rgba(0,0,0,0.4)',
                  }}>
                    {nb.shortName || nb.label}
                  </div>
                  <div style={{
                    position: 'absolute',
                    bottom: -6,
                    background: nb.colorDark || nb.color,
                    color: '#FFFFFF',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 9px',
                    borderRadius: 999,
                    border: '2px solid rgba(255,255,255,0.55)',
                    boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                  }}>
                    {noteCount}
                  </div>
                </div>
              </foreignObject>
            );
          } else {
            // === CADERNO: NotebookCover original ===
            const enrichedNb = { ...nb.raw, _noteCount: noteCount };
            innerContent = (
              <foreignObject
                x={nb.x - NB_W / 2}
                y={nb.y - NB_H / 2}
                width={NB_W}
                height={NB_H}
                style={{ overflow: 'visible' }}
              >
                <div xmlns="http://www.w3.org/1999/xhtml" style={{ width: NB_W, height: NB_H, cursor: 'pointer' }}>
                  <NotebookCover
                    notebook={enrichedNb}
                    size="sm"
                    showSpine={true}
                    style={{ width: NB_W, height: NB_H }}
                  />
                </div>
              </foreignObject>
            );
          }

          return (
            <g
              key={`nb-${nb.id}`}
              className={`a-notebook ${dim ? 'a-ghost' : ''} ${isHover ? 'a-spotlight' : ''}`}
              style={{ animationDelay: `${delayNotebookBase + idx * 90}ms` }}
              onMouseEnter={() => { setHoveredId(nb.id); setHoveredType('notebook'); }}
              onMouseLeave={() => { setHoveredId(null); setHoveredType(null); }}
              tabIndex={0}
              role="button"
              aria-label={
                isLifeArea
                  ? `Área ${nb.label}, ${noteCount} ${noteCount === 1 ? 'anotação' : 'anotações'}`
                  : `Caderno ${nb.label}, ${noteCount} ${noteCount === 1 ? 'nota' : 'notas'}`
              }
            >
              <title>{nb.label} — {noteCount} {noteCount === 1 ? 'anotação' : 'anotações'}</title>

              {/* Wrapper que pulsa sutilmente, com delay próprio */}
              <g
                className="a-notebook-pulse"
                style={{ animationDelay: `${-pulseDelay}s` }}
              >
                {innerContent}
              </g>
            </g>
          );
        })}


        {/* === NÍVEL 3: Anotações como FOLHAS de papel === */}
        {noteNodes.map((nn, idx) => {
          const meta = notebookMeta[nn.notebookId];
          const accentColor = meta?.color || '#7B4DBA';
          const parentLabel = meta?.label || '';
          const isHover = hoveredId === nn.id && hoveredType === 'note';
          const dim = !!(highlightSet && !highlightSet.has(nn.id));
          const delayMs = delayNoteBase + idx * 35;

          return (
            <NoteNode
              key={`note-${nn.id}`}
              nn={nn}
              accentColor={accentColor}
              parentLabel={parentLabel}
              isHover={isHover}
              dim={dim}
              delayMs={delayMs}
              onHoverEnter={handleNoteHoverEnter}
              onHoverLeave={handleNoteHoverLeave}
              onOpen={onOpenNote}
            />
          );
        })}

      </g>
      {/* Fim da camada com pan/zoom */}
    </svg>
  );
});


// ================== PAINEL INFERIOR ==================

function EcosystemDetailPanel({ hoveredId, hoveredType, layout, onOpen }) {
  if (!hoveredId) {
    return (
      <div className="px-5 py-3 backdrop-blur-md bg-white/8 border-t border-white/10 text-2xs text-white/60 flex items-center justify-center gap-2">
        <Sparkles size={12} className="text-white/70" />
        Passe o mouse · Clique no centro para sua foto · Clique numa anotação para abrir · Scroll = zoom · Arrastar = mover
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
        <div className="w-10 h-12 rounded shadow-lg shrink-0 flex items-center justify-center" style={{ background: '#FFFFFF' }}>
          <FileText size={18} className="text-anotata-roxo" />
        </div>
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
            <text x="80" y="83" textAnchor="middle" fontSize="9" fontWeight="300" letterSpacing="2" fill="#FFFFFF" opacity="0.85">VOCÊ</text>
            <circle cx="132" cy="80" r="7" fill="#FFFFFF" stroke="#A07BD6" strokeWidth="1.6" />
            <circle cx="28" cy="80" r="7" fill="#FFFFFF" stroke="#A07BD6" strokeWidth="1.6" />
            <circle cx="80" cy="132" r="7" fill="#FFFFFF" stroke="#A07BD6" strokeWidth="1.6" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-white mb-2">
          {hasNotebookNoNotes ? 'Seu mapa está pronto pra crescer' : 'Seu mapa ainda está começando'}
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
