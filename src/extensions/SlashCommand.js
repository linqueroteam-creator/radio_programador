/**
 * ANOTATA — Extensão Tiptap: Slash Commands
 *
 * Detecta quando o usuário digita "/" no início de uma linha (ou após
 * um espaço em branco) e abre um menu flutuante com ações rápidas:
 * cabeçalhos, listas, checklist, citação, divisor, data atual, etc.
 *
 * Como funciona
 * -------------
 * - Plugin do ProseMirror escuta cada transação (`appendTransaction`)
 *   e mantém um `state` interno: { active, query, range }.
 * - Quando o cursor está logo após "/" + zero ou mais letras (sem
 *   espaço), o estado fica ativo e o callback `onChange` é disparado
 *   passando { active, query, range, clientRect }.
 * - O Editor renderiza um popover (componente <SlashMenu>) baseado
 *   nesse callback. O popover navega com setas, executa com Enter,
 *   fecha com Esc — toda a interação é capturada pelo `handleKeyDown`
 *   da extensão e delegada ao componente via `onKeyDown`.
 *
 * Inserir conteúdo
 * ----------------
 * Cada item do menu chama `editor.chain().focus().deleteRange(range)
 * .[ação]().run()` — primeiro apaga o "/foo" digitado, depois aplica
 * o comando do Tiptap correspondente. Isso garante que não sobre lixo.
 *
 * STALE CLOSURE FIX
 * -----------------
 * O `useEditor` do Tiptap instancia as extensions APENAS no primeiro render.
 * As callbacks de `configure({ onChange, onKeyDown })` ficam congeladas.
 * Para resolver, a extensão usa `this.storage` como "ponte": o Editor.jsx
 * escreve nele (.onChange / .onKeyDown) via useEffect toda vez que os
 * handlers mudam, e o plugin lê de lá em tempo real. Isso garante que
 * a referência é sempre a mais recente sem precisar re-instanciar o editor.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const SlashCommandPluginKey = new PluginKey('anotataSlashCommand');

const EMPTY_STATE = { active: false, query: '', range: null };

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      // Callbacks iniciais (podem ser no-ops — o Editor.jsx sobrescreve via storage)
      onChange: () => {},
      onKeyDown: () => false,
    };
  },

  addStorage() {
    return {
      // Referências mutáveis — sempre atualizadas pelo Editor.jsx
      onChange: this.options.onChange,
      onKeyDown: this.options.onKeyDown,
    };
  },

  addProseMirrorPlugins() {
    const storage = this.storage;

    return [
      new Plugin({
        key: SlashCommandPluginKey,

        state: {
          init() {
            return EMPTY_STATE;
          },
          apply(tr, value) {
            const meta = tr.getMeta(SlashCommandPluginKey);
            if (meta) return meta;
            return value;
          },
        },

        props: {
          handleKeyDown(view, event) {
            const state = SlashCommandPluginKey.getState(view.state);
            if (!state || !state.active) return false;

            // Esc fecha sempre
            if (event.key === 'Escape') {
              view.dispatch(view.state.tr.setMeta(SlashCommandPluginKey, EMPTY_STATE));
              storage.onChange({ ...EMPTY_STATE, clientRect: null });
              return true;
            }

            // Setas e Enter ficam a cargo do componente React (que conhece o
            // estado de "qual item está ativo"). Se ele consumir, retornamos
            // true. Senão, deixamos o ProseMirror tratar normalmente.
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === 'Tab') {
              const consumed = storage.onKeyDown(event);
              if (consumed) return true;
            }

            return false;
          },
        },

        appendTransaction(transactions, oldState, newState) {
          // Otimização: só reage a mudanças de doc ou seleção
          const docChanged = transactions.some((t) => t.docChanged);
          const selChanged = !oldState.selection.eq(newState.selection);
          if (!docChanged && !selChanged) return null;

          const oldMeta = SlashCommandPluginKey.getState(oldState) || EMPTY_STATE;
          const { selection } = newState;

          // Só ativa em seleção colapsada (cursor)
          if (!selection.empty) {
            if (oldMeta.active) {
              storage.onChange({ ...EMPTY_STATE, clientRect: null });
              return newState.tr.setMeta(SlashCommandPluginKey, EMPTY_STATE);
            }
            return null;
          }

          const $from = selection.$from;
          const parentTextBefore = $from.parent.textBetween(
            0,
            $from.parentOffset,
            '\n',
            '\0'
          );

          // Match: "/algumacoisa" no fim da linha, sem espaços, no começo
          // do parágrafo OU precedido por espaço em branco. Limite de 24
          // caracteres pra evitar travar em texto longo com "/".
          const match = parentTextBefore.match(/(?:^|\s)(\/[^\s/]{0,24})$/);

          if (match) {
            const slashLen = match[1].length;
            const from = selection.from - slashLen;
            const to = selection.from;
            const query = match[1].slice(1); // sem o "/"

            const newMeta = { active: true, query, range: { from, to } };

            if (
              !oldMeta.active ||
              oldMeta.query !== query ||
              oldMeta.range?.from !== from
            ) {
              storage.onChange({ ...newMeta, clientRect: null });
            }

            return newState.tr.setMeta(SlashCommandPluginKey, newMeta);
          }

          // Saiu do padrão "/foo" (ex: usuário digitou espaço, apagou tudo)
          if (oldMeta.active) {
            storage.onChange({ ...EMPTY_STATE, clientRect: null });
            return newState.tr.setMeta(SlashCommandPluginKey, EMPTY_STATE);
          }

          return null;
        },
      }),
    ];
  },
});

export default SlashCommand;
