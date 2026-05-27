/**
 * ANOTATA — Extensão Tiptap: Link Interno
 *
 * Marca um trecho de texto como "link interno" pra outra nota ou caderno.
 * Diferente do `Link` padrão (que é pra URLs externas), este Mark guarda:
 *
 *   - targetType: 'note' | 'notebook' (pra que tipo de coisa aponta)
 *   - targetId: id da nota ou do caderno
 *   - targetTitle: snapshot do título no momento do link (fallback se for excluído)
 *
 * Visualmente: renderiza como `<a data-internal-link="true" class="anotata-internal-link">`,
 * com estilo definido em `index.css` (roxo, fundo lavanda suave).
 *
 * O click handler (em Editor.jsx via event delegation) lê os data-attributes
 * e navega pra nota/caderno usando o store.
 *
 * `inclusive: false` => quando o cursor estiver no fim do link e o usuário
 * digitar, o texto novo NÃO continua sendo link.
 */

import { Mark, mergeAttributes } from '@tiptap/core';

export const InternalLink = Mark.create({
  name: 'internalLink',

  inclusive: false,

  addAttributes() {
    return {
      targetType: {
        default: 'note',
        parseHTML: (el) => el.getAttribute('data-target-type') || 'note',
        renderHTML: (attrs) => ({ 'data-target-type': attrs.targetType }),
      },
      targetId: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-target-id'),
        renderHTML: (attrs) => (attrs.targetId ? { 'data-target-id': attrs.targetId } : {}),
      },
      targetTitle: {
        default: null,
        parseHTML: (el) => el.getAttribute('data-target-title') || el.textContent,
        renderHTML: (attrs) =>
          attrs.targetTitle ? { 'data-target-title': attrs.targetTitle } : {},
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'a[data-internal-link]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const title = HTMLAttributes['data-target-title'];
    const type = HTMLAttributes['data-target-type'] || 'note';
    const tooltip = title
      ? `Ir para ${type === 'notebook' ? 'caderno' : 'nota'}: ${title}`
      : 'Link interno';

    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-internal-link': 'true',
        class: 'anotata-internal-link',
        title: tooltip,
        // Sem href real (não queremos que abra como url), mas deixa
        // os screen readers tratarem como link clicável
        role: 'link',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setInternalLink:
        (attrs) =>
        ({ commands }) => {
          if (!attrs || !attrs.targetId || !attrs.targetType) return false;
          return commands.setMark(this.name, attrs);
        },

      unsetInternalLink:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name);
        },
    };
  },
});

export default InternalLink;
