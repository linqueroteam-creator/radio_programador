import React, { useState, useRef, useEffect } from 'react';
import {
  Heart, Smile, Brain, Briefcase, Coins, Users,
  Home as HomeIcon, Palette, Compass, CircleDot, Sparkles, ChevronDown,
} from 'lucide-react';
import { listLifeAreas, getLifeArea } from '../engine/LifeAreas';

/**
 * LifeAreaPicker — Chip clicável que mostra a área da vida da nota
 * e permite alternar para outra área via dropdown compacto.
 *
 * Props:
 *  - currentArea: string (id da área, ex: 'saude', 'outros')
 *  - onChange: (newAreaId: string) => void
 *  - size: 'sm' | 'md' (default 'sm')
 *
 * Comportamento:
 *  - Clique abre dropdown com as 10 áreas + outros
 *  - Selecionar fecha dropdown e chama onChange
 *  - Esc fecha
 *  - Clique fora fecha
 *
 * Acessibilidade:
 *  - aria-expanded, aria-haspopup, role="listbox"
 *  - Navegação por teclado (↑↓ navegar, Enter selecionar, Esc fechar)
 */

const ICON_MAP = {
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

export default function LifeAreaPicker({ currentArea, onChange, size = 'sm' }) {
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const wrapRef = useRef(null);
  const areas = listLifeAreas();

  const area = getLifeArea(currentArea);
  const IconComp = ICON_MAP[area.id] || CircleDot;

  // Fechar ao clicar fora
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Teclado
  const handleKeyDown = (e) => {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault();
        setOpen(true);
        setFocusIdx(0);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx(i => (i + 1) % areas.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx(i => (i - 1 + areas.length) % areas.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (focusIdx >= 0 && focusIdx < areas.length) {
        onChange(areas[focusIdx].id);
        setOpen(false);
      }
    }
  };

  const isSm = size === 'sm';

  return (
    <div ref={wrapRef} className="relative inline-block" onKeyDown={handleKeyDown}>
      {/* Chip trigger */}
      <button
        onClick={() => { setOpen(!open); setFocusIdx(-1); }}
        className={`inline-flex items-center gap-1.5 rounded-full border transition-colors focus-visible:ring-2 focus-visible:ring-anotata-roxo/50 ${
          isSm ? 'px-2 py-0.5 text-2xs' : 'px-2.5 py-1 text-xs'
        }`}
        style={{
          backgroundColor: area.colorLight,
          borderColor: area.color,
          color: area.colorDark,
        }}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={`Área da vida: ${area.name}. Clique para mudar.`}
      >
        <IconComp size={isSm ? 11 : 13} />
        <span className="font-medium">{area.shortName || area.name}</span>
        <ChevronDown size={isSm ? 10 : 12} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-full mt-1 z-50 w-56 py-1.5 bg-white rounded-xl shadow-2xl border border-anotata-border overflow-hidden"
          role="listbox"
          aria-label="Selecionar área da vida"
        >
          {areas.map((a, idx) => {
            const Icon = ICON_MAP[a.id] || CircleDot;
            const isSelected = a.id === area.id;
            const isFocused = idx === focusIdx;
            return (
              <button
                key={a.id}
                onClick={() => { onChange(a.id); setOpen(false); }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-left text-xs transition-colors ${
                  isSelected ? 'bg-anotata-lavanda-clara font-semibold' : ''
                } ${isFocused ? 'bg-anotata-bg' : 'hover:bg-anotata-bg'}`}
                role="option"
                aria-selected={isSelected}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: a.colorLight, color: a.colorDark }}
                >
                  <Icon size={13} />
                </span>
                <span className="flex-1 truncate" style={{ color: a.colorDark }}>
                  {a.name}
                </span>
                {isSelected && (
                  <span className="text-anotata-roxo text-2xs font-bold">✓</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
