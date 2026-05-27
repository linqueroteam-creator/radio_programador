import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  useCallback,
  useLayoutEffect,
} from 'react';
import { createPortal } from 'react-dom';
import { X, Link2, Search, BookOpen, FileText } from 'lucide-react';
import { NOTE_TYPES } from '../engine/RulesEngine';

/**
 * ANOTATA — Popover de seleção de destino para link interno
 *
 * Aparece colado à seleção do usuário quando ele clica em "Ligar a..." no
 * bubble menu. Mostra notas e cadernos buscáveis e navegáveis por teclado.
 *
 * Props:
 *  - store          : useStore() do app
 *  - anchorRect     : DOMRect da seleção (pra ancorar o popover)
 *  - currentNoteId  : id da nota onde o link está sendo criado (filtra ela mesma da lista)
 *  - onPick({type, id, title})  : callback ao escolher destino
 *  - onClose()      : callback ao fechar
 *
 * Atalhos:
 *   ↑↓ navegam     ↵ confirma     Esc fecha
 *
 * Posicionamento idêntico ao RephrasePopover (auto-flip se não couber).
 */

const POPOVER_WIDTH = 380;
const VIEWPORT_MARGIN = 12;
const SELECTION_GAP = 10;

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 70);
}

export default function LinkPickerPopover({
  store,
  anchorRect,
  currentNoteId,
  onPick,
  onClose,
}) {
  const [search, setSearch] = useState('');
  const [highlightIdx, setHighlightIdx] = useState(0);
  const popoverRef = useRef(null);
  const listRef = useRef(null);

  // Lista unificada de candidatos: cadernos primeiro, depois notas
  const items = useMemo(() => {
    const notebooks = (store.notebooks || []).map((nb) => {
      const noteCount = (store.notes || []).filter(
        (n) => n.notebookId === nb.id && !n.isTrash
      ).length;
      return {
        type: 'notebook',
        id: nb.id,
        title: nb.name,
        subtitle: `${noteCount} nota${noteCount !== 1 ? 's' : ''}`,
        icon: '📒',
        searchText: (nb.name || '').toLowerCase(),
      };
    });

    const notes = (store.notes || [])
      .filter((n) => !n.isTrash && n.id !== currentNoteId)
      .map((n) => {
        const typeMeta = NOTE_TYPES[n.type] || NOTE_TYPES.rascunho;
        const preview = stripHtml(n.content);
        return {
          type: 'note',
          id: n.id,
          title: n.title || 'Sem título',
          subtitle: preview || 'Vazia...',
          icon: typeMeta.icon || '📝',
          tags: n.tags || [],
          searchText: [
            n.title || '',
            preview,
            ...(n.tags || []),
          ]
            .join(' ')
            .toLowerCase(),
        };
      });

    return [...notebooks, ...notes];
  }, [store.notebooks, store.notes, currentNoteId]);

  // Filtragem por busca (substring simples; pode evoluir pra fuzzy se preciso)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items.slice(0, 50);
    return items.filter((it) => it.searchText.includes(q)).slice(0, 50);
  }, [items, search]);

  // Reset do highlight quando filtro muda
  useEffect(() => {
    setHighlightIdx(0);
  }, [search]);

  // === POSICIONAMENTO INTELIGENTE ===
  // Mesma lógica do RephrasePopover: tenta abaixo, vira pra cima se não couber.
  const [pos, setPos] = useState({ top: 0, left: 0, ready: false });

  useLayoutEffect(() => {
    if (!popoverRef.current || !anchorRect) return;
    const rect = popoverRef.current.getBoundingClientRect();
    const winH = window.innerHeight;
    const winW = window.innerWidth;

    let top = anchorRect.bottom + SELECTION_GAP;
    let left = anchorRect.left;

    if (top + rect.height > winH - VIEWPORT_MARGIN) {
      const aboveTop = anchorRect.top - rect.height - SELECTION_GAP;
      if (aboveTop >= VIEWPORT_MARGIN) top = aboveTop;
      else top = VIEWPORT_MARGIN;
    }

    if (left + rect.width > winW - VIEWPORT_MARGIN) {
      left = winW - rect.width - VIEWPORT_MARGIN;
    }
    if (left < VIEWPORT_MARGIN) left = VIEWPORT_MARGIN;

    setPos({ top, left, ready: true });
  }, [anchorRect, filtered.length]);

  const confirmItem = useCallback(
    (item) => {
      if (!item) return;
      onPick && onPick({ targetType: item.type, targetId: item.id, targetTitle: item.title });
    },
    [onPick]
  );

  // === ATALHOS DE TECLADO ===
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose && onClose();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlightIdx((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlightIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === 'Enter') {
        // Só ação de confirmar se foco ainda no input ou no popover
        e.preventDefault();
        const item = filtered[highlightIdx];
        if (item) confirmItem(item);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [filtered, highlightIdx, confirmItem, onClose]);

  // === CLICAR FORA FECHA ===
  useEffect(() => {
    const onMouseDown = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        onClose && onClose();
      }
    };
    const id = setTimeout(() => {
      document.addEventListener('mousedown', onMouseDown);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', onMouseDown);
    };
  }, [onClose]);

  // === MANTER ITEM DESTACADO VISÍVEL ===
  // Quando o usuário usa setas, o item destacado precisa rolar pra dentro da view.
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-item-idx="${highlightIdx}"]`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightIdx]);

  return createPortal(
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Ligar a outra nota ou caderno"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: POPOVER_WIDTH,
        maxHeight: '60vh',
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
      <div className="px-3 py-2.5 border-b border-anotata-border bg-anotata-sidebar flex items-center gap-2 shrink-0">
        <div className="w-6 h-6 rounded-md bg-anotata-roxo flex items-center justify-center shrink-0">
          <Link2 size={12} className="text-white" />
        </div>
        <span className="text-xs font-semibold text-anotata-text">Ligar a...</span>
        <button
          onClick={onClose}
          className="ml-auto p-1 rounded text-anotata-muted hover:text-anotata-goiaba hover:bg-white transition-colors"
          title="Fechar (Esc)"
          aria-label="Fechar"
        >
          <X size={12} />
        </button>
      </div>

      {/* SEARCH */}
      <div className="px-3 py-2 border-b border-anotata-border bg-white shrink-0">
        <div className="relative">
          <Search
            size={12}
            className="absolute left-2.5 top-1/2 -translate-y-1/2 text-anotata-muted"
          />
          <input
            autoFocus
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar notas e cadernos..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-anotata-bg/40 rounded-md border border-anotata-border focus:outline-none focus:border-anotata-roxo focus:ring-1 focus:ring-anotata-roxo/20 placeholder:text-anotata-muted"
          />
        </div>
      </div>

      {/* LISTA */}
      <div ref={listRef} className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-5 text-center">
            <p className="text-xs text-anotata-muted">Nenhum resultado.</p>
            <p className="text-2xs text-anotata-muted mt-1">
              Tente outras palavras ou crie a nota primeiro.
            </p>
          </div>
        ) : (
          filtered.map((item, idx) => {
            const isActive = idx === highlightIdx;
            const isNotebook = item.type === 'notebook';
            return (
              <button
                key={`${item.type}-${item.id}`}
                data-item-idx={idx}
                onClick={() => confirmItem(item)}
                onMouseEnter={() => setHighlightIdx(idx)}
                className={`w-full text-left px-3 py-2 flex items-start gap-2.5 transition-colors border-l-2 ${
                  isActive
                    ? 'bg-anotata-lavanda-clara border-l-anotata-roxo'
                    : 'border-l-transparent hover:bg-anotata-sidebar/40'
                }`}
              >
                <span className="text-base shrink-0 leading-none mt-0.5" aria-hidden>
                  {item.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span
                      className={`text-[8px] uppercase font-bold tracking-wide px-1.5 py-0.5 rounded ${
                        isNotebook
                          ? 'bg-anotata-roxo/15 text-anotata-roxo'
                          : 'bg-anotata-bg text-anotata-muted'
                      }`}
                    >
                      {isNotebook ? 'caderno' : 'nota'}
                    </span>
                    <h4 className="text-xs font-medium text-anotata-text truncate">
                      {item.title}
                    </h4>
                  </div>
                  {item.subtitle && (
                    <p className="text-2xs text-anotata-text-suave truncate mt-0.5">
                      {item.subtitle}
                    </p>
                  )}
                  {item.tags && item.tags.length > 0 && (
                    <div className="flex gap-1 mt-1">
                      {item.tags.slice(0, 3).map((t) => (
                        <span
                          key={t}
                          className="text-2xs bg-anotata-lavanda text-anotata-roxo px-1.5 py-0.5 rounded"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>

      {/* FOOTER COM ATALHOS */}
      <div className="px-3 py-2 border-t border-anotata-border bg-white flex items-center gap-1.5 shrink-0">
        <Kbd>↑↓</Kbd>
        <span className="text-2xs text-anotata-muted">navegar</span>
        <span className="text-anotata-border mx-1">·</span>
        <Kbd>↵</Kbd>
        <span className="text-2xs text-anotata-muted">confirmar</span>
        <span className="text-anotata-border mx-1">·</span>
        <Kbd>Esc</Kbd>
        <span className="text-2xs text-anotata-muted">fechar</span>
      </div>
    </div>,
    document.body
  );
}

function Kbd({ children }) {
  return (
    <kbd
      className="px-1 py-0.5 bg-anotata-bg rounded border border-anotata-border text-2xs font-mono text-anotata-text-suave"
      style={{ lineHeight: 1 }}
    >
      {children}
    </kbd>
  );
}
