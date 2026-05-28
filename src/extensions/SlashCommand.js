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
 * NÃO confundir com `@tiptap/suggestion` (que não está instalado).
 * Esta implementação é minimalista mas suficiente para os ~10 comandos
 * que o ANOTATA precisa.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export const SlashCommandPluginKey = new PluginKey('anotataSlashCommand');

const EMPTY_STATE = { active: false, query: '', range: null };

export const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      // Disparado sempre que o estado do menu muda (abrir, atualizar query, fechar)
      onChange: () => {},
      // Permite que o componente popover capture setas/Enter
      onKeyDown: () => false,
    };
  },

  addProseMirrorPlugins() {
    const options = this.options;

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
              options.onChange({ ...EMPTY_STATE, clientRect: null });
              return true;
            }

            // Setas e Enter ficam a cargo do componente React (que conhece o
            // estado de "qual item está ativo"). Se ele consumir, retornamos
            // true. Senão, deixamos o ProseMirror tratar normalmente.
            if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === 'Tab') {
              const consumed = options.onKeyDown(event);
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
              options.onChange({ ...EMPTY_STATE, clientRect: null });
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
              // Coordenadas na tela pro popover se posicionar
              let clientRect = null;
              try {
                const view = oldState && oldState.view;
                // O view real está acessível via this no Tiptap, mas em
                // appendTransaction não temos. Os coords são calculados
                // depois, no Editor.jsx, via editor.view.coordsAtPos(from).
                clientRect = null;
              } catch (_) {}
              options.onChange({ ...newMeta, clientRect });
            }

            return newState.tr.setMeta(SlashCommandPluginKey, newMeta);
          }

          // Saiu do padrão "/foo" (ex: usuário digitou espaço, apagou tudo)
          if (oldMeta.active) {
            options.onChange({ ...EMPTY_STATE, clientRect: null });
            return newState.tr.setMeta(SlashCommandPluginKey, EMPTY_STATE);
          }

          return null;
        },
      }),
    ];
  },
});

export default SlashCommand;
