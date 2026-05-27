/**
 * ANOTATA — Texto Preditivo Inline (Ghost Text)
 *
 * Extensão Tiptap que mostra a sugestão de continuação dentro do próprio
 * texto, em cinza claro, à direita do cursor. Igual ao que você vê no
 * GitHub Copilot ou no Gmail Smart Compose.
 *
 * Atalhos:
 *   →  (seta direita) ou Tab : aceita a sugestão
 *   Esc                       : descarta a sugestão
 *
 * Implementação:
 * - Usa Plugin do ProseMirror (a engine por baixo do Tiptap)
 * - Renderiza a sugestão com Decoration.widget — não modifica o documento,
 *   só decora visualmente. Quando o usuário aceita, AÍ insere texto.
 * - Recalcula a sugestão a cada mudança no documento ou cursor.
 *
 * Defesas anti-tela-branca:
 * - try/catch envolvendo a chamada à engine
 * - se algo der errado, simplesmente NÃO mostra ghost text — o editor
 *   continua funcionando normalmente
 * - seta direita só é interceptada quando: há sugestão E cursor está
 *   no fim do bloco textual (não atrapalha navegação dentro do texto)
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

const KEY = new PluginKey('anotataInlinePredictive');

// Captura o contexto à esquerda do cursor (no mesmo bloco).
// Retorna { textBefore, atBlockEnd } ou null se não for um lugar válido pra sugerir.
function getCursorContext(state) {
  const sel = state.selection;
  if (!sel.empty) return null;
  const $from = sel.$from;
  if (!$from.parent || !$from.parent.isTextblock) return null;

  const offset = $from.parentOffset;
  const blockSize = $from.parent.content.size;
  const atBlockEnd = offset === blockSize;

  // Texto à esquerda do cursor dentro do bloco
  const textBefore = $from.parent.textBetween(0, offset, ' ');
  return { textBefore, atBlockEnd };
}

// Calcula a sugestão a mostrar dada uma engine e o estado atual.
function computeSuggestion(state, engine) {
  if (!engine || typeof engine.predictPhrase !== 'function') return null;
  let ctx;
  try {
    ctx = getCursorContext(state);
  } catch (_) {
    return null;
  }
  if (!ctx) return null;

  // Só sugere se o cursor está ao FIM do bloco (não no meio do texto).
  // Isso evita o ghost text aparecer no meio de uma frase já escrita.
  if (!ctx.atBlockEnd) return null;

  const text = ctx.textBefore;
  if (!text || text.trim().length < 2) return null;

  const lastChar = text[text.length - 1];
  const isTypingWord = lastChar && !/[\s\n]/.test(lastChar);

  let suffix = null;
  let kind = null;

  try {
    if (isTypingWord) {
      // Está digitando uma palavra — completar
      const lastWordMatch = text.match(/[\wàáâãéêíóôõúüç-]+$/i);
      const partial = lastWordMatch ? lastWordMatch[0] : '';
      if (partial.length < 2) return null;
      suffix = engine.completeWord(partial);
      kind = 'completion';
    } else {
      // Acabou de digitar espaço ou pontuação — sugerir próxima(s) palavra(s)
      suffix = engine.predictPhrase(text);
      kind = 'phrase';
    }
  } catch (_) {
    return null;
  }

  if (!suffix || typeof suffix !== 'string' || suffix.length === 0) return null;
  // Sanity: nada de quebra de linha, nada gigante
  suffix = suffix.replace(/[\r\n]+/g, ' ').slice(0, 80);

  return { from: state.selection.from, suffix, kind };
}

export const InlinePredictive = Extension.create({
  name: 'inlinePredictive',

  addOptions() {
    return { engine: null };
  },

  addProseMirrorPlugins() {
    const engine = this.options.engine;

    return [
      new Plugin({
        key: KEY,

        state: {
          init() {
            return { suggestion: null };
          },
          apply(tr, prev, oldState, newState) {
            // Recalcula a sugestão sempre que docChanged ou selectionSet
            const meta = tr.getMeta(KEY);
            if (meta && meta.action === 'clear') {
              return { suggestion: null };
            }
            if (tr.docChanged || tr.selectionSet) {
              const sugg = computeSuggestion(newState, engine);
              return { suggestion: sugg };
            }
            // Se nada mudou, mantém
            return prev;
          },
        },

        props: {
          decorations(state) {
            const ps = KEY.getState(state);
            if (!ps || !ps.suggestion) return null;
            const { from, suffix } = ps.suggestion;

            // Cria o widget DOM do ghost text
            const span = document.createElement('span');
            span.className = 'anotata-ghost-suggestion';
            span.textContent = suffix;
            span.setAttribute('data-anotata-ghost', 'true');
            span.style.cssText = [
              'color: #A89DC0',
              'opacity: 0.65',
              'pointer-events: none',
              'user-select: none',
              'font-style: normal',
              'white-space: pre',
            ].join(';');

            const deco = Decoration.widget(from, span, {
              side: 1,
              ignoreSelection: true,
              key: 'anotata-ghost-' + from + '-' + suffix.length,
            });
            return DecorationSet.create(state.doc, [deco]);
          },

          handleKeyDown(view, event) {
            const ps = KEY.getState(view.state);
            const sugg = ps && ps.suggestion;
            if (!sugg) return false;

            // ACEITAR: → (seta direita) quando cursor está no fim do bloco; ou Tab
            const acceptKey =
              (event.key === 'ArrowRight' && !event.shiftKey && !event.ctrlKey && !event.metaKey && !event.altKey) ||
              (event.key === 'Tab' && !event.shiftKey);

            if (acceptKey) {
              try {
                // Confere uma vez mais se cursor está no fim do bloco
                const ctx = getCursorContext(view.state);
                if (!ctx || !ctx.atBlockEnd) return false;
                event.preventDefault();
                const tr = view.state.tr.insertText(sugg.suffix);
                tr.setMeta(KEY, { action: 'clear' });
                view.dispatch(tr);
                return true;
              } catch (_) {
                return false;
              }
            }

            // CANCELAR: Esc só se houver ghost text — não atrapalha outros usos do Esc
            if (event.key === 'Escape') {
              const tr = view.state.tr.setMeta(KEY, { action: 'clear' });
              view.dispatch(tr);
              return true;
            }

            return false;
          },
        },
      }),
    ];
  },
});

export default InlinePredictive;
