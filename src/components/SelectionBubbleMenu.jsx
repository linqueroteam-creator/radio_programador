import React, { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { RotateCw } from 'lucide-react';
import RephrasePopover from './RephrasePopover.jsx';

/**
 * ANOTATA — Menu flutuante de seleção (bubble menu)
 *
 * Quando o usuário seleciona um texto significativo no editor (>= 5 caracteres),
 * mostra um botão flutuante "🔄 Reescrever" colado em cima da seleção.
 *
 * Ao clicar no botão:
 *   - Captura a range atual da seleção (porque ao abrir o popover, o foco vai
 *     pro popover e a seleção do editor pode se perder visualmente)
 *   - Mede o retângulo da seleção no viewport (pra ancorar o popover)
 *   - Abre o `RephrasePopover` compacto com aquele texto
 *   - Ao aplicar: substitui apenas o trecho selecionado pelo texto reescrito
 *
 * Decisões de UX:
 *   - O botão aparece só depois de 150ms de "calma" (debounce) — evita
 *     piscar enquanto o usuário arrasta o cursor
 *   - Some quando: clica no editor sem selecionar, perde o foco do editor,
 *     ou usuário aperta Esc
 *   - Esconde durante o popover (não fica empilhado)
 *   - Lembra o último modo escolhido na sessão (memória curta)
 *
 * Acessibilidade:
 *   - O botão flutuante tem aria-label
 *   - Pode ser ativado por teclado (Tab + Enter), embora normalmente
 *     seja invocado por mouse após seleção
 *
 * Props:
 *   - editor : instância do Tiptap (objeto com .state, .view, .commands)
 */

const MIN_CHARS_FOR_BUBBLE = 5;
const SHOW_DELAY_MS = 150;

// Memória do último modo escolhido na sessão (in-memory; some ao recarregar)
let lastUsedMode = 'geral';

export default function SelectionBubbleMenu({ editor }) {
  const [bubble, setBubble] = useState(null);
  // bubble: { rect: DOMRect, text: string, range: {from,to} } | null

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [popoverData, setPopoverData] = useState(null);
  // popoverData: { rect, text, range } — capturado no momento do clique

  const showTimerRef = useRef(null);

  // === DETECÇÃO DE SELEÇÃO ===
  // Escuta selectionUpdate do Tiptap. Quando a seleção muda, agenda mostrar
  // o bubble. Se a seleção sumir antes de 150ms, cancela.
  useEffect(() => {
    if (!editor) return undefined;

    const measureAndSchedule = () => {
      // Cancela qualquer scheduling anterior
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

      // Pega o texto selecionado
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

      // Agenda a aparição do bubble depois de SHOW_DELAY_MS
      showTimerRef.current = setTimeout(() => {
        try {
          // Re-mede no momento de mostrar (pode ter mudado)
          const start = view.coordsAtPos(from);
          const end = view.coordsAtPos(to);
          if (!start || !end) return;

          // Constrói um rect "envolvente" da seleção
          const rect = {
            top: Math.min(start.top, end.top),
            bottom: Math.max(start.bottom, end.bottom),
            left: Math.min(start.left, end.left),
            right: Math.max(start.right, end.right),
            width: 0,
            height: 0,
            x: 0, y: 0,
          };
          rect.width = rect.right - rect.left;
          rect.height = rect.bottom - rect.top;
          rect.x = rect.left;
          rect.y = rect.top;

          setBubble({
            rect,
            text: selectedText,
            range: { from, to },
          });
        } catch (_) {
          setBubble(null);
        }
      }, SHOW_DELAY_MS);
    };

    const onSelectionUpdate = () => {
      // Se o popover estiver aberto, não interfere
      if (popoverOpen) return;
      measureAndSchedule();
    };

    const onBlur = () => {
      // Quando o editor perde foco mas ainda há seleção, mantemos o bubble
      // (caso o usuário esteja indo clicar nele). Mas se o popover não abriu
      // depois de um tempo, descarta.
      // Por simplicidade, NAO escondemos no blur — o clique fora vai esconder.
    };

    editor.on('selectionUpdate', onSelectionUpdate);
    editor.on('blur', onBlur);

    return () => {
      editor.off('selectionUpdate', onSelectionUpdate);
      editor.off('blur', onBlur);
      if (showTimerRef.current) clearTimeout(showTimerRef.current);
    };
  }, [editor, popoverOpen]);

  // === ESC GLOBAL ESCONDE BUBBLE ===
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape' && bubble && !popoverOpen) {
        setBubble(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [bubble, popoverOpen]);

  // === SCROLL/RESIZE DESLIGAM O BUBBLE ===
  // Se o usuário scrolla a página, o rect calculado vira lixo. É mais simples
  // esconder e remostrar quando ele soltar a seleção de novo.
  useEffect(() => {
    if (!bubble || popoverOpen) return undefined;
    const onScroll = () => setBubble(null);
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [bubble, popoverOpen]);

  // === ABRIR POPOVER ===
  const handleOpenPopover = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!bubble) return;
    setPopoverData(bubble);
    setPopoverOpen(true);
    setBubble(null); // esconde o bubble enquanto o popover está visível
  }, [bubble]);

  // === APLICAR REESCRITA ===
  const handleApply = useCallback((newText) => {
    if (!editor || !popoverData) {
      setPopoverOpen(false);
      setPopoverData(null);
      return;
    }
    try {
      const { from, to } = popoverData.range;
      // Substitui apenas o trecho selecionado pelo texto reescrito como TEXTO
      // (sem HTML), preservando a estrutura ao redor.
      editor.chain().focus().insertContentAt({ from, to }, newText).run();
    } catch (_) {
      // se algo der errado, deixa o original — nunca quebra o app
    }
    setPopoverOpen(false);
    setPopoverData(null);
  }, [editor, popoverData]);

  const handleClosePopover = useCallback(() => {
    setPopoverOpen(false);
    setPopoverData(null);
  }, []);

  // === RENDERIZACAO ===
  // O bubble é renderizado via portal direto no body, com position: fixed.
  if (!editor) return null;

  return (
    <>
      {bubble && !popoverOpen && createPortal(
        <BubbleButton rect={bubble.rect} onClick={handleOpenPopover} />,
        document.body
      )}

      {popoverOpen && popoverData && (
        <RephrasePopover
          originalText={popoverData.text}
          anchorRect={popoverData.rect}
          initialMode={lastUsedMode}
          onModeChange={(m) => { lastUsedMode = m; }}
          onApply={handleApply}
          onClose={handleClosePopover}
        />
      )}
    </>
  );
}

/**
 * Botão flutuante que aparece colado à seleção.
 * Usa position: fixed (o anchorRect é viewport-relative do Tiptap coordsAtPos).
 */
function BubbleButton({ rect, onClick }) {
  // Posiciona o botão centralizado horizontalmente sobre o topo da seleção,
  // com 8px de gap. Se for muito perto do topo da tela, joga embaixo.
  const buttonHeight = 32;
  const gap = 8;

  const winH = window.innerHeight;
  const winW = window.innerWidth;

  // Centro horizontal da seleção
  const centerX = (rect.left + rect.right) / 2;

  // Tenta acima primeiro
  let top = rect.top - buttonHeight - gap;
  let placement = 'top';
  if (top < 8) {
    top = rect.bottom + gap;
    placement = 'bottom';
  }

  // Limita centro pra não vazar
  const halfWidth = 65; // metade da largura aproximada do botão
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
    <button
      type="button"
      onMouseDown={onClick}
      aria-label="Reescrever trecho selecionado"
      style={{
        position: 'fixed',
        top,
        left,
        transform: `translate(-50%, 0) scale(${shown ? 1 : 0.92})`,
        opacity: shown ? 1 : 0,
        transition: 'opacity 150ms ease, transform 150ms ease',
        zIndex: 65,
      }}
      className="px-2.5 py-1.5 rounded-lg bg-anotata-roxo text-white text-[11px] font-medium flex items-center gap-1.5 shadow-lg hover:bg-anotata-roxo-escuro hover:shadow-xl border border-anotata-roxo-escuro/30"
    >
      <RotateCw size={11} />
      Reescrever
      <span
        aria-hidden
        style={{
          position: 'absolute',
          left: '50%',
          transform: 'translateX(-50%)',
          [placement === 'top' ? 'bottom' : 'top']: -4,
          width: 8,
          height: 8,
          background: 'inherit',
          borderRight: '1px solid rgba(61, 27, 102, 0.3)',
          borderBottom: '1px solid rgba(61, 27, 102, 0.3)',
          rotate: placement === 'top' ? '45deg' : '225deg',
          backgroundColor: '#5B2D8E',
        }}
      />
    </button>
  );
}
