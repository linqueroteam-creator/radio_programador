/**
 * ANOTATA — Spell-check / Gramática Inline
 *
 * Extensão Tiptap que recebe os "issues" do GrammarEngine (LanguageTool)
 * e pinta cada erro com sublinhado ondulado direto no texto. Hover
 * mostra um balão (renderizado fora desta extensão, no Editor.jsx) com
 * sugestões clicáveis.
 *
 * Quem chama essa extensão é responsável por:
 *  1. Rodar o grammarEngine.check(plainText) com debounce
 *  2. Despachar setGrammarIssues(issues) na extensão
 *  3. Renderizar o popover ao receber o evento de hover
 *
 * Esta extensão NÃO faz network — só decora.
 *
 * APIs (commands):
 *   editor.commands.setGrammarIssues(issues)  — atualiza decorações
 *   editor.commands.clearGrammarIssues()      — remove decorações
 *   editor.commands.ignoreGrammarIssue(id)    — descarta uma issue
 *   editor.commands.applyGrammarReplacement(id, replacement)
 *
 * Defesas anti-tela-branca:
 *  - try/catch em todo lugar; se algo der erro, decoração some, editor segue
 *  - posições calculadas via mapeamento explícito plain-text → PM positions
 *  - ignora issues cujas posições saíram do alcance após edição
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from 'prosemirror-state';
import { Decoration, DecorationSet } from 'prosemirror-view';

const KEY = new PluginKey('anotataInlineGrammar');

// Categoria visual baseada no que o GrammarEngine retorna
// (`issue.category` é 'spell' | 'grammar' | 'style' | 'punctuation')
function categorize(issue) {
  const c = (issue && issue.category) || '';
  if (c === 'spell') return 'misspelling';
  if (c === 'style') return 'style';
  return 'grammar';
}

/**
 * Constrói o texto-puro do documento (igual ao que enviamos ao GrammarEngine)
 * e a tabela de mapeamento charIndex → posição do ProseMirror.
 *
 * Importante: o texto gerado precisa BATER com o que foi enviado pra checagem.
 * Por isso, ao chamar grammarEngine.check, o caller deve usar este mesmo
 * builder (export `buildPlainTextMap`) em vez de editor.getText().
 */
export function buildPlainTextMap(doc) {
  const parts = [];
  const charToPm = []; // charToPm[charIndex] = pm position
  let firstBlock = true;

  doc.descendants((node, pos) => {
    if (node.isText) {
      const t = node.text || '';
      for (let i = 0; i < t.length; i++) {
        charToPm.push(pos + i);
      }
      parts.push(t);
      return false;
    }
    if (node.type && node.type.name === 'hardBreak') {
      // hard break vira "\n"
      charToPm.push(pos);
      parts.push('\n');
      return false;
    }
    if (node.isBlock) {
      if (!firstBlock) {
        // separador entre blocos: "\n"
        charToPm.push(pos);
        parts.push('\n');
      }
      firstBlock = false;
      return true; // desce nos filhos
    }
    return true;
  });

  return { text: parts.join(''), charToPm };
}

function buildDecorations(doc, issues, ignoredIds) {
  if (!issues || issues.length === 0) return DecorationSet.empty;
  const { charToPm } = buildPlainTextMap(doc);
  const docMax = doc.content.size;
  const decos = [];

  for (const issue of issues) {
    if (!issue || ignoredIds.has(String(issue.id))) continue;
    const start = issue.offset;
    const end = issue.offset + issue.length;
    if (start < 0 || end <= start || end > charToPm.length) continue;

    const fromPm = charToPm[start];
    const lastChar = end - 1;
    const toPm = (charToPm[lastChar] || 0) + 1;

    if (fromPm == null || toPm == null) continue;
    if (fromPm < 0 || toPm > docMax || fromPm >= toPm) continue;

    const cat = categorize(issue);
    decos.push(
      Decoration.inline(fromPm, toPm, {
        class: `anotata-issue anotata-issue-${cat}`,
        'data-issue-id': String(issue.id),
        nodeName: 'span',
      })
    );
  }
  return DecorationSet.create(doc, decos);
}

export const InlineGrammar = Extension.create({
  name: 'inlineGrammar',

  addOptions() {
    return {
      // callback opcional disparado quando issues mudam (pra UI lateral, etc.)
      onIssuesChange: null,
    };
  },

  addStorage() {
    return {
      issues: [],
      ignoredIds: new Set(),
    };
  },

  addCommands() {
    return {
      setGrammarIssues: (issues = []) => ({ tr, dispatch }) => {
        try {
          this.storage.issues = Array.isArray(issues) ? issues : [];
          if (dispatch) {
            dispatch(tr.setMeta(KEY, { issues: this.storage.issues, ignoredIds: this.storage.ignoredIds }));
          }
          if (typeof this.options.onIssuesChange === 'function') {
            try { this.options.onIssuesChange(this.storage.issues); } catch (_) {}
          }
        } catch (_) { /* engole */ }
        return true;
      },
      clearGrammarIssues: () => ({ tr, dispatch }) => {
        try {
          this.storage.issues = [];
          this.storage.ignoredIds = new Set();
          if (dispatch) {
            dispatch(tr.setMeta(KEY, { issues: [], ignoredIds: this.storage.ignoredIds }));
          }
        } catch (_) {}
        return true;
      },
      ignoreGrammarIssue: (issueId) => ({ tr, dispatch }) => {
        try {
          this.storage.ignoredIds.add(String(issueId));
          if (dispatch) {
            dispatch(tr.setMeta(KEY, { issues: this.storage.issues, ignoredIds: this.storage.ignoredIds }));
          }
        } catch (_) {}
        return true;
      },
      applyGrammarReplacement: (issueId, replacement) => ({ state, dispatch }) => {
        try {
          const target = (this.storage.issues || []).find(i => String(i.id) === String(issueId));
          if (!target) return false;
          const { charToPm } = buildPlainTextMap(state.doc);
          const start = target.offset;
          const end = target.offset + target.length;
          if (start < 0 || end > charToPm.length) return false;
          const fromPm = charToPm[start];
          const toPm = (charToPm[end - 1] || 0) + 1;
          if (fromPm == null || toPm == null || fromPm >= toPm) return false;
          if (dispatch) {
            const replaceTr = state.tr.insertText(replacement || '', fromPm, toPm);
            // Após a substituição, a issue deixa de existir; remova da lista
            this.storage.issues = (this.storage.issues || []).filter(i => String(i.id) !== String(issueId));
            replaceTr.setMeta(KEY, { issues: this.storage.issues, ignoredIds: this.storage.ignoredIds });
            dispatch(replaceTr);
          }
        } catch (_) { return false; }
        return true;
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: KEY,
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, prev, oldState, newState) => {
            try {
              const meta = tr.getMeta(KEY);
              if (meta && Array.isArray(meta.issues)) {
                return buildDecorations(newState.doc, meta.issues, meta.ignoredIds || new Set());
              }
              if (tr.docChanged) {
                // Quando o doc muda, decorações ficam desatualizadas — remap o que dá
                return prev.map(tr.mapping, tr.doc);
              }
              return prev;
            } catch (_) {
              return DecorationSet.empty;
            }
          },
        },
        props: {
          decorations(state) {
            return KEY.getState(state) || null;
          },
        },
      }),
    ];
  },
});

export default InlineGrammar;
