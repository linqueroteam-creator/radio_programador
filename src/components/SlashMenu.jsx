import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  Quote, Minus, Code2, Calendar, Image as ImageIcon, Sparkles,
  Type
} from 'lucide-react';

/**
 * ============================================================================
 *  <SlashMenu> — popover de comandos invocado ao digitar "/" no editor
 * ============================================================================
 *
 *  Funciona em conjunto com a extensão `SlashCommand`. Recebe:
 *
 *    state           → { active, query, range }
 *    editor          → instância do Tiptap (pra executar comandos)
 *    onClose         → fecha o menu
 *
 *  Cada item da lista executa um comando que:
 *    1. Apaga o trecho "/algo" digitado pelo usuário (deleteRange)
 *    2. Aplica o comando real do Tiptap (toggleHeading, toggleTaskList…)
 *    3. Foca de volta no editor
 *
 *  Posicionamento:
 *    - Lê `editor.view.coordsAtPos(state.range.from)` toda vez que `state`
 *      muda.
 *    - Renderiza o popover via portal no body, com `position: fixed`.
 *    - Auto-flip: se não couber abaixo da palavra, sobe pra cima.
 *
 *  Teclado:
 *    - ArrowDown/Up navegam, Enter executa, Tab também executa, Esc fecha.
 *    - O `onKeyDown` exposto pelo componente é registrado pela extensão e
 *      retorna `true` quando consome o evento.
 * ============================================================================
 */

const POPOVER_WIDTH = 320;
const POPOVER_MAX_HEIGHT = 360;

export default function SlashMenu({ state, editor, onClose, onRegisterKeyHandler }) {
  const { active, query, range } = state || {};
  const [activeIndex, setActiveIndex] = useState(0);
  const [coords, setCoords] = useState(null);
  const listRef = useRef(null);
  // Ref no container do popover — usado pra detectar clique fora
  const popoverRef = useRef(null);

  // Lista completa de comandos disponíveis. Cada um tem:
  //  - id           identificador único
  //  - label        texto principal exibido
  //  - description  legenda
  //  - keywords     palavras-chave de busca (pt + variações)
  //  - icon         componente lucide
  //  - run(editor, range) → executa
  const ALL_COMMANDS = useMemo(
    () => [
      {
        id: 'h1', label: 'Cabeçalho 1', description: 'Título grande de seção',
        keywords: ['cabecalho', 'cabeçalho', 'titulo', 'título', 'header', 'h1', '1'],
        icon: Heading1,
        run: (ed, r) => ed.chain().focus().deleteRange(r).toggleHeading({ level: 1 }).run(),
      },
      {
        id: 'h2', label: 'Cabeçalho 2', description: 'Subtítulo médio',
        keywords: ['cabecalho', 'cabeçalho', 'subtitulo', 'subtítulo', 'h2', '2'],
        icon: Heading2,
        run: (ed, r) => ed.chain().focus().deleteRange(r).toggleHeading({ level: 2 }).run(),
      },
      {
        id: 'h3', label: 'Cabeçalho 3', description: 'Subtítulo pequeno',
        keywords: ['cabecalho', 'cabeçalho', 'subsubtitulo', 'h3', '3'],
        icon: Heading3,
        run: (ed, r) => ed.chain().focus().deleteRange(r).toggleHeading({ level: 3 }).run(),
      },
      {
        id: 'p', label: 'Texto normal', description: 'Parágrafo comum',
        keywords: ['paragrafo', 'parágrafo', 'texto', 'normal', 'p'],
        icon: Type,
        run: (ed, r) => ed.chain().focus().deleteRange(r).setParagraph().run(),
      },
      {
        id: 'bullet', label: 'Lista', description: 'Lista com marcadores',
        keywords: ['lista', 'bullet', 'topicos', 'tópicos', 'ul'],
        icon: List,
        run: (ed, r) => ed.chain().focus().deleteRange(r).toggleBulletList().run(),
      },
      {
        id: 'ordered', label: 'Lista numerada', description: 'Lista com números',
        keywords: ['lista', 'numerada', 'numeros', 'números', 'ol', 'numero'],
        icon: ListOrdered,
        run: (ed, r) => ed.chain().focus().deleteRange(r).toggleOrderedList().run(),
      },
      {
        id: 'task', label: 'Lista de tarefas', description: 'Checklist com caixinhas',
        keywords: ['tarefa', 'tarefas', 'checklist', 'check', 'task', 'todo', 'caixinha'],
        icon: CheckSquare,
        run: (ed, r) => ed.chain().focus().deleteRange(r).toggleTaskList().run(),
      },
      {
        id: 'quote', label: 'Citação', description: 'Trecho destacado em bloco',
        keywords: ['citacao', 'citação', 'quote', 'frase', 'destaque'],
        icon: Quote,
        run: (ed, r) => ed.chain().focus().deleteRange(r).toggleBlockquote().run(),
      },
      {
        id: 'code', label: 'Bloco de código', description: 'Trecho monoespaçado',
        keywords: ['codigo', 'código', 'code', 'pre'],
        icon: Code2,
        run: (ed, r) => ed.chain().focus().deleteRange(r).toggleCodeBlock().run(),
      },
      {
        id: 'hr', label: 'Divisor', description: 'Linha horizontal entre seções',
        keywords: ['divisor', 'separador', 'hr', 'linha', 'separar'],
        icon: Minus,
        run: (ed, r) => ed.chain().focus().deleteRange(r).setHorizontalRule().run(),
      },
      {
        id: 'date', label: 'Data de hoje', description: 'Insere a data atual em texto',
        keywords: ['data', 'hoje', 'dia', 'date', 'today', 'agora'],
        icon: Calendar,
        run: (ed, r) => {
          const today = new Date().toLocaleDateString('pt-BR', {
            day: '2-digit', month: 'long', year: 'numeric',
          });
          ed.chain().focus().deleteRange(r).insertContent(today + ' ').run();
        },
      },
      {
        id: 'datetime', label: 'Data e hora', description: 'Carimbo "01/01/2026 às 14:32"',
        keywords: ['data', 'hora', 'horario', 'horário', 'now', 'agora', 'carimbo', 'timestamp'],
        icon: Calendar,
        run: (ed, r) => {
          const now = new Date();
          const stamp = `${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
          ed.chain().focus().deleteRange(r).insertContent(stamp + ' ').run();
        },
      },
      {
        id: 'image', label: 'Imagem', description: 'Escolher arquivo do computador',
        keywords: ['imagem', 'foto', 'image', 'picture', 'figura'],
        icon: ImageIcon,
        run: (ed, r) => {
          // Apaga o "/imagem" e abre o seletor de arquivo
          ed.chain().focus().deleteRange(r).run();
          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/*';
          input.onchange = (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
              ed.chain().focus().insertContent({
                type: 'resizableImage',
                attrs: { src: ev.target.result, width: 75, align: 'center' },
              }).run();
            };
            reader.readAsDataURL(file);
          };
          input.click();
        },
      },
    ],
    []
  );

  // Filtra pela query digitada após "/"
  const filtered = useMemo(() => {
    const q = (query || '').toLowerCase().trim();
    if (!q) return ALL_COMMANDS;
    return ALL_COMMANDS.filter((cmd) => {
      if (cmd.label.toLowerCase().includes(q)) return true;
      if (cmd.description.toLowerCase().includes(q)) return true;
      return cmd.keywords.some((k) => k.toLowerCase().includes(q));
    });
  }, [ALL_COMMANDS, query]);

  // Reseta o índice quando muda o filtro
  useEffect(() => {
    setActiveIndex(0);
  }, [query, active]);

  // Calcula posição do popover ancorado no "/" digitado
  useEffect(() => {
    if (!active || !editor || !range) {
      setCoords(null);
      return;
    }
    try {
      const view = editor.view;
      const pos = view.coordsAtPos(range.from);
      // pos: { left, right, top, bottom } da janela visível
      const padding = 8;
      const winW = window.innerWidth;
      const winH = window.innerHeight;

      // Tentar abaixo da linha
      let top = pos.bottom + padding;
      let left = pos.left;

      // Auto-flip vertical: se não couber abaixo, vai pra cima
      if (top + POPOVER_MAX_HEIGHT > winH - padding) {
        top = pos.top - POPOVER_MAX_HEIGHT - padding;
        if (top < padding) top = padding; // clamp no topo
      }

      // Clamp horizontal
      if (left + POPOVER_WIDTH > winW - padding) {
        left = winW - POPOVER_WIDTH - padding;
      }
      if (left < padding) left = padding;

      setCoords({ top, left });
    } catch (_) {
      setCoords(null);
    }
  }, [active, editor, range, range?.from, range?.to]);

  const executeAt = useCallback(
    (idx) => {
      const cmd = filtered[idx];
      if (!cmd || !editor || !range) {
        onClose();
        return;
      }
      try {
        cmd.run(editor, range);
      } catch (err) {
        // não quebrar o app por erro de comando
        // eslint-disable-next-line no-console
        console.error('[SlashMenu] erro ao executar comando', cmd.id, err);
      }
      onClose();
    },
    [filtered, editor, range, onClose]
  );

  // Registra o handler de teclas com a extensão. Quando active muda, troca o handler.
  // Isso evita closure stale: cada handler vê a versão atual de filtered/activeIndex.
  useEffect(() => {
    if (!active) {
      onRegisterKeyHandler && onRegisterKeyHandler(null);
      return undefined;
    }
    const handler = (event) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, Math.max(filtered.length - 1, 0)));
        return true;
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        return true;
      }
      if (event.key === 'Enter' || event.key === 'Tab') {
        event.preventDefault();
        if (filtered.length > 0) {
          executeAt(activeIndex);
        } else {
          // Se não há resultados, fecha sem inserir nada
          onClose();
        }
        return true;
      }
      return false;
    };
    onRegisterKeyHandler && onRegisterKeyHandler(handler);
    return () => {
      onRegisterKeyHandler && onRegisterKeyHandler(null);
    };
  }, [active, filtered, activeIndex, executeAt, onRegisterKeyHandler, onClose]);

  // Scroll automático pro item ativo
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(`[data-slash-idx="${activeIndex}"]`);
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  // === Fechar ao clicar fora (UX) ===
  // Sem isso o usuário ficava obrigado a usar Esc ou achar uma opção pra
  // dispensar o popover. Adiciona um listener global de mousedown que fecha
  // o menu se o clique não for dentro do popover.
  // Usamos `mousedown` (não `click`) pra fechar ANTES do clique propagar pro
  // editor — assim, clicar em outro ponto do texto fecha o menu sem o cursor
  // dar dois pulos.
  // Pequeno delay (timer 0) garante que o gesto que abriu o menu não conta
  // como "clique fora" no mesmo tick.
  useEffect(() => {
    if (!active) return undefined;
    const onPointerDown = (e) => {
      const popover = popoverRef.current;
      if (!popover) return;
      // Se clicou DENTRO do popover, ignora (vai cair no onClick de algum item)
      if (popover.contains(e.target)) return;
      onClose();
    };
    // setTimeout(0) impede que o gesto que disparou a abertura (ex: digitar
    // "/" e o navegador soltar um mousemove residual em alguns browsers)
    // feche o popover logo de cara.
    const id = setTimeout(() => {
      document.addEventListener('mousedown', onPointerDown, true);
      document.addEventListener('touchstart', onPointerDown, true);
    }, 0);
    return () => {
      clearTimeout(id);
      document.removeEventListener('mousedown', onPointerDown, true);
      document.removeEventListener('touchstart', onPointerDown, true);
    };
  }, [active, onClose]);

  if (!active || !coords) return null;

  return createPortal(
    <div
      ref={popoverRef}
      role="listbox"
      aria-label="Comandos rápidos"
      className="fixed z-[200] bg-white border border-anotata-border rounded-xl shadow-popover overflow-hidden flex flex-col animate-fade-in"
      style={{
        top: coords.top,
        left: coords.left,
        width: POPOVER_WIDTH,
        maxHeight: POPOVER_MAX_HEIGHT,
      }}
      onMouseDown={(e) => {
        // Evita que o clique tire o foco do editor antes do onClick rodar.
        // Importante: não conflita com o handler de "click outside" porque
        // este handler só roda em cliques DENTRO do popover.
        e.preventDefault();
      }}
    >
      <div className="px-3 py-2 border-b border-anotata-border bg-anotata-lavanda-clara flex items-center gap-2 text-2xs text-anotata-text-suave">
        <Sparkles size={12} className="text-anotata-roxo" />
        <span className="font-semibold uppercase tracking-wider">Comandos</span>
        {query ? (
          <span className="ml-auto text-anotata-roxo font-medium">/{query}</span>
        ) : (
          <span className="ml-auto text-anotata-muted">digite para filtrar</span>
        )}
      </div>

      <div ref={listRef} className="flex-1 overflow-y-auto py-1">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-anotata-muted">
            Nenhum comando para "/{query}".
            <br />
            <span className="text-2xs">Aperte Esc para fechar.</span>
          </div>
        ) : (
          filtered.map((cmd, idx) => {
            const Icon = cmd.icon;
            const isActive = idx === activeIndex;
            return (
              <button
                key={cmd.id}
                data-slash-idx={idx}
                onMouseEnter={() => setActiveIndex(idx)}
                onClick={() => executeAt(idx)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  isActive
                    ? 'bg-anotata-roxo text-white'
                    : 'text-anotata-text hover:bg-anotata-hover'
                }`}
              >
                <span
                  className={`shrink-0 ${
                    isActive ? 'text-white' : 'text-anotata-roxo'
                  }`}
                >
                  <Icon size={14} aria-hidden="true" />
                </span>
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-sm font-medium truncate ${
                      isActive ? 'text-white' : 'text-anotata-text'
                    }`}
                  >
                    {cmd.label}
                  </div>
                  <div
                    className={`text-2xs truncate ${
                      isActive ? 'text-white/80' : 'text-anotata-text-suave'
                    }`}
                  >
                    {cmd.description}
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <div className="px-3 py-1.5 border-t border-anotata-border bg-anotata-lavanda-clara flex items-center justify-between text-2xs text-anotata-text-suave">
        <span>
          <kbd className="bg-white border border-anotata-border rounded px-1">↑↓</kbd> navegar
        </span>
        <span>
          <kbd className="bg-white border border-anotata-border rounded px-1">Enter</kbd> aplicar
        </span>
        <span>
          <kbd className="bg-white border border-anotata-border rounded px-1">Esc</kbd> fechar
        </span>
      </div>
    </div>,
    document.body
  );
}
