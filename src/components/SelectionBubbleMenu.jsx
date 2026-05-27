import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { RotateCw, Link2 } from 'lucide-react';
import RephrasePopover from './RephrasePopover.jsx';
import LinkPickerPopover from './LinkPickerPopover.jsx';

/**
 * ANOTATA — Menu flutuante de seleção (bubble menu)
 *
 * Quando o usuário seleciona um texto significativo no editor (>= 5 caracteres),
 * mostra um botão flutuante colado em cima da seleção com 2 ações:
 *
 *   ┌────────────────────────────────┐
 *   │ 🔄 Reescrever │ 🔗 Ligar a... │
 *   └────────────────────────────────┘
 *
 * - Reescrever: abre o RephrasePopover (engine de reescrita PT-BR)
 * - Ligar a...: abre o LinkPickerPopover (escolher nota ou caderno e
 *   transformar a seleção em link interno)
 *
 * Decisões de UX:
 *   - O botão aparece só depois de 150ms de "calma" (debounce) — evita piscar
 *     enquanto o usuário arrasta o cursor
 *   - Some quando: clica fora, perde foco, ou pressiona Esc
 *   - Esconde durante o popover (não fica empilhado)
 *   - Lembra o último modo de reescrita escolhido na sessão
 *
 * Props:
 *   - editor : instância do Tiptap
 *   - store  : useStore() do app (necessário pro LinkPickerPopover e
 *              registrar conexão entre notas)
 *   - currentNoteId : id da nota atualmente sendo editada
 */

const MIN_CHARS_FOR_BUBBLE = 5;
const SHOW_DELAY_MS = 150;

// Memória do último modo escolhido na sessão (in-memory)
let lastUsedMode = 'geral';

export default function SelectionBubbleMenu({ editor, store, currentNoteId }) {
  const [bubble, setBubble] = useState(null);
  // bubble: { rect, text, range: {from,to} } | null

  // activePopover: 'rephrase' | 'link' | null
  const [activePopover, setActivePopover] = useState(null);
  const [popoverData, setPopoverData] = useState(null);

  const showTimerRef = useRef(null);

  // === DETECÇÃO DE SELEÇÃO ===
  useEffect(() => {
    if (!editor) return undefined;

    const measureAndSchedule = () => {
      if (showTimerRef.current) {
        clearTimeout(showTimerRef.current);
        showTimerRef.current = null;
      }

      const { state, view } = editor;
      const { from, to, empty } = state.selection;

      if (empty || from === to) {
        setBubble(null);
        return;
      }

      let selectedText = '';
      try {
        selectedText = state.doc.textBetween(from, to, ' ');
      } catch (_) {
        setBubble(null);
        return;
      }

      const trimmedLen = (selectedText || '').trim().length;
      if (trimmedLen < MIN_CHARS_FOR_BUBBLE) {
        setBubble(null);
        return;
      }

      showTimerRef.current = setTimeout(() => {
        try {
          const start = view.coordsAtPos(from);
          const end = view.coordsAtPos(to);
          if (!start || !end) return;

          const rect = {
            top: Math.min(start.top, end.top),
            bottom: Math.max(start.bottom, end.bottom),
            left: Math.min(start.left, end.left),
            right: Math.max(start.right, end.right),
            width: 0,
            height: 0,
            x: 0,
            y: 0,
          };
          rect.width = rect.right - rect.left;
          rect.height = rect.bottom - rect.top;
          rect.x = rect.left;
          rect.y = rect.top;

          setBubble({ rect, text: selectedText, range: { from, to } });
        } catch (_) {
          setBubble(null);
        }
      }, SHOW_DELAY_MS);
    };

    const onSelectionUpdate = () => {
      if (activePopover) return; // não interfere quando tem popover aberto
      measureAndSchedule();
    };

    editor.on('selectionUpdate', onSelectionUpdate);

    return () => {
      editor.off('selectionUpdate', onSelectionUpdate);
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  }, [editor, activePopover]);

  // === ESC GLOBAL ESCONDE BUBBLE ===
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && bubble && !activePopover) {
        setBubble(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bubble, activePopover]);

  // === SCROLL/RESIZE DESLIGAM O BUBBLE ===
  useEffect(() => {
    if (!bubble || activePopover) return undefined;
    const onScroll = () => setBubble(null);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [bubble, activePopover]);

  // === ABRIR POPOVERS ===
  const openRephrase = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!bubble) return;
      setPopoverData(bubble);
      setActivePopover('rephrase');
      setBubble(null);
    },
    [bubble]
  );

  const openLinkPicker = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!bubble) return;
      setPopoverData(bubble);
      setActivePopover('link');
      setBubble(null);
    },
    [bubble]
  );

  // === APLICAR REESCRITA ===
  const handleApplyRephrase = useCallback(
    (newText) => {
      if (!editor || !popoverData) {
        setActivePopover(null);
        setPopoverData(null);
        return;
      }
      try {
        const { from, to } = popoverData.range;
        editor.chain().focus().insertContentAt({ from, to }, newText).run();
      } catch (_) {
        // nunca quebra o app
      }
      setActivePopover(null);
      setPopoverData(null);
    },
    [editor, popoverData]
  );

  // === APLICAR LINK INTERNO ===
  // Aplica o mark `internalLink` na faixa selecionada original e — se o
  // destino for outra nota — registra a conexão no store.
  const handlePickLink = useCallback(
    ({ targetType, targetId, targetTitle }) => {
      if (!editor || !popoverData || !targetId) {
        setActivePopover(null);
        setPopoverData(null);
        return;
      }
      try {
        const { from, to } = popoverData.range;

        // 1) Aplica o mark na faixa que o usuário tinha selecionado
        editor
          .chain()
          .focus()
          .setTextSelection({ from, to })
          .setInternalLink({ targetType, targetId, targetTitle })
          .setTextSelection(to)
          .run();

        // 2) Se for link pra outra nota, registra também a conexão no store —
        //    assim aparece no painel de conexões e no mapa visual.
        if (
          targetType === 'note' &&
          currentNoteId &&
          currentNoteId !== targetId &&
          store &&
          typeof store.connectNotes === 'function'
        ) {
          store.connectNotes(currentNoteId, targetId, `Citada em "${popoverData.text}"`);
        }
      } catch (_) {
        // nunca quebra o app
      }
      setActivePopover(null);
      setPopoverData(null);
    },
    [editor, popoverData, store, currentNoteId]
  );

  const handleClosePopover = useCallback(() => {
    setActivePopover(null);
    setPopoverData(null);
  }, []);

  if (!editor) return null;

  return (
    <>
      {bubble && !activePopover &&
        createPortal(
          <BubbleButton
            rect={bubble.rect}
            onRephrase={openRephrase}
            onLink={openLinkPicker}
          />,
          document.body
        )}

      {activePopover === 'rephrase' && popoverData && (
        <RephrasePopover
          originalText={popoverData.text}
          anchorRect={popoverData.rect}
          initialMode={lastUsedMode}
          onModeChange={(m) => {
            lastUsedMode = m;
          }}
          onApply={handleApplyRephrase}
          onClose={handleClosePopover}
        />
      )}

      {activePopover === 'link' && popoverData && store && (
        <LinkPickerPopover
          store={store}
          anchorRect={popoverData.rect}
          currentNoteId={currentNoteId}
          onPick={handlePickLink}
          onClose={handleClosePopover}
        />
      )}
    </>
  );
}

/**
 * Pílula flutuante com 2 ações (Reescrever | Ligar a...).
 * Posicionamento: tenta acima da seleção, vira pra baixo se não couber.
 */
function BubbleButton({ rect, onRephrase, onLink }) {
  const buttonHeight = 32;
  const gap = 8;

  const winW = window.innerWidth;
  const centerX = (rect.left + rect.right) / 2;

  let top = rect.top - buttonHeight - gap;
  let placement = 'top';
  if (top < 8) {
    top = rect.bottom + gap;
    placement = 'bottom';
  }

  // Limita centro pra não vazar nas bordas (pílula tem ~190px de largura)
  const halfWidth = 100;
  let left = centerX;
  if (left - halfWidth < 8) left = halfWidth + 8;
  if (left + halfWidth > winW - 8) left = winW - halfWidth - 8;

  // Fade-in suave
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      role="toolbar"
      aria-label="Ações para o trecho selecionado"
      style={{
        position: 'fixed',
        top,
        left,
        transform: `translate(-50%, 0) scale(${shown ? 1 : 0.92})`,
        opacity: shown ? 1 : 0,
        transition: 'opacity 150ms ease, transform 150ms ease',
        zIndex: 65,
      }}
      className="flex items-stretch rounded-lg bg-anotata-roxo text-white shadow-xl border border-anotata-roxo-escuro/40 overflow-hidden"
    >
      <button
        type="button"
        onMouseDown={onRephrase}
        aria-label="Reescrever trecho selecionado"
        title="Reescrever em modos diferentes"
        className="px-2.5 py-1.5 text-[11px] font-medium flex items-center gap-1.5 hover:bg-anotata-roxo-escuro transition-colors"
      >
        <RotateCw size={11} />
        Reescrever
      </button>

      <div className="w-px bg-white/25" aria-hidden />

      <button
        type="button"
        onMouseDown={onLink}
        aria-label="Ligar trecho a uma nota ou caderno"
        title="Ligar trecho a uma nota ou caderno"
        className="px-2.5 py-1.5 text-[11px] font-medium flex items-center gap-1.5 hover:bg-anotata-roxo-escuro transition-colors"
      >
        <Link2 size={11} />
        Ligar a...
      </button>

      {/* Setinha indicadora apontando pra seleção */}
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          [placement === 'top' ? 'bottom' : 'top']: -4,
          width: 8,
          height: 8,
          background: '#5B2D8E',
          borderRight: '1px solid rgba(61, 27, 102, 0.4)',
          borderBottom: '1px solid rgba(61, 27, 102, 0.4)',
          rotate: placement === 'top' ? '45deg' : '225deg',
        }}
      />
    </div>
  );
}
