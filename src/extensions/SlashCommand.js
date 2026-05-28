import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import SlashMenu from '../components/SlashMenu.jsx';

/**
 * ============================================================================
 *  SlashCommand — extension Tiptap pra abrir menu de blocos com "/"
 * ============================================================================
 *
 *  Como usa o usuário:
 *    1. Em qualquer linha do editor, digita `/`
 *    2. Aparece menu flutuante com lista de blocos: Título 1/2/3, Lista,
 *       Lista numerada, Checklist, Citação, Linha separadora, etc.
 *    3. Continua digitando filtra (ex: "/lis" → só Lista, Lista numerada)
 *    4. Setas ↑↓ navegam, Enter confirma, Esc fecha
 *    5. Ao confirmar: a `/` (e o filtro) somem, o bloco escolhido entra no
 *       lugar
 *
 *  Implementação:
 *    Usa o pacote @tiptap/suggestion (oficial Tiptap) que cuida de detectar
 *    o gatilho, renderizar o menu via callback e gerenciar key events.
 *    Renderização do menu fica em <SlashMenu>; este arquivo só configura.
 *
 *  Posicionamento:
 *    Usa as coords do cursor via `editor.view.coordsAtPos(range.from)`.
 *    O <SlashMenu> recebe `clientRect` e calcula posição com createPortal.
 * ============================================================================
 */

// Lista de itens. `command(editor, range)` substitui o texto da query
// (incluindo a "/") pelo bloco escolhido. Centralizado pra fácil edição.
export const SLASH_ITEMS = [
  {
    id: 'title-1',
    label: 'Título 1',
    description: 'Título grande de seção',
    icon: '🅷',
    keywords: ['titulo', 'heading', 'h1', 'cabeçalho', 'cabecalho'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 1 }).run();
    },
  },
  {
    id: 'title-2',
    label: 'Título 2',
    description: 'Título médio de subseção',
    icon: '🅷',
    keywords: ['titulo', 'heading', 'h2', 'subtitulo'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 2 }).run();
    },
  },
  {
    id: 'title-3',
    label: 'Título 3',
    description: 'Título pequeno',
    icon: '🅷',
    keywords: ['titulo', 'heading', 'h3'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setNode('heading', { level: 3 }).run();
    },
  },
  {
    id: 'list-bullet',
    label: 'Lista',
    description: 'Lista com marcadores',
    icon: '•',
    keywords: ['lista', 'bullet', 'tópico', 'topicos', 'item'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBulletList().run();
    },
  },
  {
    id: 'list-ordered',
    label: 'Lista numerada',
    description: '1. 2. 3. ...',
    icon: '1.',
    keywords: ['numerada', 'ordenada', 'ordered', 'numeros'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleOrderedList().run();
    },
  },
  {
    id: 'task-list',
    label: 'Checklist',
    description: 'Lista de tarefas para marcar',
    icon: '☐',
    keywords: ['checklist', 'tarefa', 'tarefas', 'todo', 'task'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleTaskList().run();
    },
  },
  {
    id: 'quote',
    label: 'Citação',
    description: 'Texto destacado em bloco',
    icon: '❝',
    keywords: ['citacao', 'citação', 'quote', 'blockquote', 'destaque'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleBlockquote().run();
    },
  },
  {
    id: 'code',
    label: 'Bloco de código',
    description: 'Para colar código com fonte mono',
    icon: '</>',
    keywords: ['codigo', 'código', 'code', 'pre'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).toggleCodeBlock().run();
    },
  },
  {
    id: 'divider',
    label: 'Linha separadora',
    description: 'Divide a página em seções',
    icon: '—',
    keywords: ['linha', 'separador', 'divider', 'hr', 'horizontal'],
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).setHorizontalRule().run();
    },
  },
];

// Filtra itens pela query digitada (depois da "/"). Match em label, id ou keywords.
function filterItems(query) {
  const q = (query || '').trim().toLowerCase();
  if (!q) return SLASH_ITEMS;
  const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const nq = norm(q);
  return SLASH_ITEMS.filter((item) => {
    if (norm(item.label).includes(nq)) return true;
    if (item.id.includes(nq)) return true;
    if (item.keywords && item.keywords.some((k) => norm(k).includes(nq))) return true;
    return false;
  });
}

// Cria o "rendererder" do menu — usa ReactRenderer do Tiptap pra montar
// o componente React e atualizar props sem desmontar.
function createRenderer() {
  let component;
  let cleanup = null;

  return {
    onStart: (props) => {
      component = new ReactRenderer(SlashMenu, {
        props,
        editor: props.editor,
      });

      // Anexa ao body via createPortal interno do SlashMenu (não precisa
      // appendChild aqui — o componente faz portal por conta própria).
      // Mas ReactRenderer precisa de um element raiz pra existir;
      // como o SlashMenu retorna createPortal(...), o ReactRenderer
      // monta um fragment vazio que só serve pra ciclo de vida.
    },

    onUpdate: (props) => {
      if (component) component.updateProps(props);
    },

    onKeyDown: (props) => {
      // Esc fecha
      if (props.event.key === 'Escape') {
        if (component && component.ref && component.ref.onKeyDown) {
          component.ref.onKeyDown(props);
        }
        return true;
      }
      // Delegamos seta/enter pro componente. Se ele consumir, evita
      // que o cursor mexa.
      if (component && component.ref && component.ref.onKeyDown) {
        return component.ref.onKeyDown(props) === true;
      }
      return false;
    },

    onExit: () => {
      if (component) {
        component.destroy();
        component = null;
      }
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
    },
  };
}

// === Extension oficial ===
const SlashCommand = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        // Só dispara em começo de linha (linha vazia ou após enter).
        // Isso evita acionar o menu quando "/" aparece no meio de uma URL,
        // expressão matemática ou código.
        startOfLine: false,

        // Bloqueia em nodes onde "/" não faz sentido como menu:
        // - dentro de codeBlock (a / ali é literal)
        // - dentro de heading (a / continua sendo só uma barra)
        allow: ({ state, range }) => {
          const $from = state.doc.resolve(range.from);
          const node = $from.parent;
          if (!node) return true;
          if (node.type.name === 'codeBlock') return false;
          // Permite em paragraph, heading, blockquote, listItem, etc.
          return true;
        },

        items: ({ query }) => filterItems(query),

        // Quando o usuário escolhe um item.
        command: ({ editor, range, props }) => {
          if (props && typeof props.command === 'function') {
            props.command({ editor, range });
          }
        },

        render: createRenderer,
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export default SlashCommand;
