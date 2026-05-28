import React, {
  forwardRef, useEffect, useImperativeHandle, useLayoutEffect,
  useMemo, useRef, useState,
} from 'react';
import { createPortal } from 'react-dom';

/**
 * ============================================================================
 *  <SlashMenu> — menu flutuante de blocos disparado pela barra "/"
 * ============================================================================
 *
 *  Renderizado via ReactRenderer do Tiptap. Recebe (do plugin Suggestion):
 *
 *    items        : array filtrado pela query atual (já vem filtrado)
 *    command(item): chama o command do item escolhido (deleta a "/" e o
 *                   filtro, e aplica a transformação no editor)
 *    clientRect() : retorna o DOMRect da posição do cursor — usamos pra
 *                   posicionar o popover na tela
 *    query        : string digitada após a "/"
 *    editor       : a instância Tiptap (não usamos diretamente aqui)
 *
 *  Comportamento:
 *    - Abre ancorado nas coordenadas do cursor
 *    - Auto-flip: se não couber abaixo, abre acima
 *    - Setas ↑/↓ navegam, Enter confirma, Esc fecha (Tab também confirma)
 *    - Mouseover destaca item
 *    - Renderiza via createPortal(document.body) pra escapar de containers
 *      com overflow:hidden ou z-index baixo
 * ============================================================================
 */

const POPOVER_WIDTH = 280;
const POPOVER_MAX_HEIGHT = 320;

const SlashMenu = forwardRef(function SlashMenu(props, ref) {
  const { items, command, clientRect } = props;
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const [pos, setPos] = useState({ top: -9999, left: -9999, placement: 'bottom' });

  // Quando a lista muda (filtro), reseta a seleção pro topo
  useEffect(() => {
    setActiveIndex(0);
  }, [items]);

  // Posição: recalcula sempre que clientRect muda (cursor se move,
  // janela é redimensionada, etc.)
  useLayoutEffect(() => {
    const rect = typeof clientRect === 'function' ? clientRect() : clientRect;
    if (!rect) {
      setPos({ top: -9999, left: -9999, placement: 'bottom' });
      return;
    }

    const margin = 8;
    const popH = Math.min(POPOVER_MAX_HEIGHT, items.length * 44 + 32);
    const popW = POPOVER_WIDTH;

    // Tenta posicionar abaixo do cursor
    let top = rect.bottom + 4;
    let placement = 'bottom';
    if (top + popH + margin > window.innerHeight) {
      // Não cabe abaixo: tenta acima
      top = rect.top - popH - 4;
      placement = 'top';
      if (top < margin) {
        // Se também não cabe acima, gruda no topo da tela
        top = margin;
      }
    }

    let left = rect.left;
    if (left + popW + margin > window.innerWidth) {
      left = window.innerWidth - popW - margin;
    }
    if (left < margin) left = margin;

    setPos({ top, left, placement });
  }, [clientRect, items.length]);

  // Scroll automático pro item ativo
  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-slash-index="${activeIndex}"]`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  // === Expõe controle de teclado pro plugin Tiptap Suggestion ===
  // O plugin do Tiptap chama ref.onKeyDown(props) pra cada tecla. Se a
  // gente devolve true, o plugin entende que consumimos o evento e
  // bloqueia o comportamento default (ex: cursor mexer).
  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }) => {
      if (!items || items.length === 0) {
        // Se não tem itens, deixa o usuário continuar digitando normal
        return false;
      }
      if (event.key === 'ArrowDown') {
        setActiveIndex((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === 'ArrowUp') {
        setActiveIndex((i) => (i - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        const item = items[activeIndex];
        if (item) command(item);
        return true;
      }
      // Esc é tratado pelo Tiptap automaticamente pra fechar; não precisamos
      return false;
    },
  }));

  // Sem itens → mostra mensagem amigável (mas mantém o popover aberto;
  // assim o usuário sabe que o menu está ativo e basta apagar a query)
  if (typeof document === 'undefined') return null;

  const popover = (
    <div
      ref={containerRef}
      role="listbox"
      aria-label="Menu de blocos"
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        width: POPOVER_WIDTH,
        maxHeight: POPOVER_MAX_HEIGHT,
        zIndex: 200,
      }}
      className="bg-white border border-anotata-border rounded-xl shadow-2xl overflow-hidden flex flex-col animate-fade-in"
    >
      <div className="px-3 py-2 bg-anotata-sidebar border-b border-anotata-border flex items-center justify-between">
        <span className="text-2xs font-semibold uppercase tracking-wider text-anotata-text-suave">
          Inserir bloco
        </span>
        <span className="text-2xs text-anotata-muted">
          ↑↓ ↵ Esc
        </span>
      </div>

      <div className="flex-1 overflow-y-auto py-1">
        {(!items || items.length === 0) ? (
          <div className="px-3 py-6 text-center text-xs text-anotata-muted italic">
            Nenhum bloco encontrado
            <div className="text-2xs mt-1 not-italic">apague a busca ou Esc pra fechar</div>
          </div>
        ) : (
          items.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                role="option"
                aria-selected={isActive}
                data-slash-index={idx}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => command(item)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  isActive
                    ? 'bg-anotata-roxo text-white'
                    : 'hover:bg-anotata-hover text-anotata-text'
                }`}
              >
                <span
                  className={`shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-sm font-mono font-bold ${
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-anotata-lavanda-clara text-anotata-roxo'
                  }`}
                  aria-hidden="true"
                >
                  {item.icon}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-anotata-text'}`}>
                    {item.label}
                  </div>
                  {item.description && (
                    <div className={`text-2xs truncate ${isActive ? 'text-white/85' : 'text-anotata-text-suave'}`}>
                      {item.description}
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );

  return createPortal(popover, document.body);
});

export default SlashMenu;
