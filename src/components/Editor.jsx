import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import ResizableImage from '../extensions/ResizableImage';
import InlinePredictive from '../extensions/InlinePredictive';
import InlineGrammar, { buildPlainTextMap } from '../extensions/InlineGrammar';
import Toolbar from './Toolbar';
import TagBar from './TagBar';
import PredictiveBar from './PredictiveBar';
import GrammarPanel from './GrammarPanel';
import GrammarPopover from './GrammarPopover';
import NoteMetaBar from './NoteMetaBar';
import InsightPanel from './InsightPanel';
import ConnectionModal from './ConnectionModal';
import ConnectionMap from './ConnectionMap';
import RephrasePanel from './RephrasePanel';
import SelectionBubbleMenu from './SelectionBubbleMenu';
import predictiveEngine from '../engine/PredictiveEngine';
import grammarEngine from '../engine/GrammarEngine';
import rulesEngine from '../engine/RulesEngine';
import {
  Star, Trash2, BookOpen, Clock, Sparkles, SpellCheck,
  Image as ImageIcon, CheckCircle, AlertCircle, Cloud, CloudOff,
  PanelRight, Link2, Map as MapIcon, RotateCw
} from 'lucide-react';

export default function Editor({ store }) {
  const { selectedNote } = store;
  const [title, setTitle] = useState('');
  const [showGrammar, setShowGrammar] = useState(false);
  const [grammarIssues, setGrammarIssues] = useState([]);
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);
  const [showInsightPanel, setShowInsightPanel] = useState(true);
  const [showConnectionModal, setShowConnectionModal] = useState(false);
  // === Mapa visual de conexões (P5 — Mapa de Conexões) ===
  // ATENÇÃO: este useState está aqui em cima, junto dos outros, ANTES de qualquer
  // early return. Mover daqui = correr risco de tela branca por Rules of Hooks.
  const [showConnectionMap, setShowConnectionMap] = useState(false);
  // === Spell-check inline (P5 — Gramática Inline) ===
  // Issue atualmente sob o cursor (hover) e a posição da palavra na tela
  const [hoveredIssue, setHoveredIssue] = useState(null);
  const [hoveredRect, setHoveredRect] = useState(null);
  const grammarHoverTimerRef = React.useRef(null);
  const grammarLeaveTimerRef = React.useRef(null);
  const grammarCheckTimerRef = React.useRef(null);
  const lastCheckedTextRef = React.useRef('');

  // === Reescritor (P5 — Engine de reescrita PT-BR) ===
  // Estado do painel de reescrita.
  // ATENÇÃO: estes useStates ficam aqui em cima, ANTES de qualquer return condicional,
  // pra preservar Rules of Hooks (evita tela branca).
  const [rephraseState, setRephraseState] = useState(null);
  // rephraseState quando aberto: { open: true, originalText: string, scope: 'selection'|'full', range: {from,to}|null }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false }),
      ResizableImage,
      // === Texto preditivo inline (ghost text estilo Copilot) ===
      // Mostra a sugestão dentro do próprio texto, em cinza claro, à direita
      // do cursor. Seta direita (→) ou Tab confirmam. Esc cancela.
      InlinePredictive.configure({ engine: predictiveEngine }),
      // === Spell-check inline (sublinhado ondulado goiaba) ===
      // Pinta os erros direto no texto. O hover (renderizado fora) abre
      // um balão com sugestões clicáveis.
      InlineGrammar,
      Placeholder.configure({ placeholder: 'Comece a escrever... (a sugestão cinza aparece à direita — aperte → para aceitar)' }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      TextStyle,
      Color,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      if (selectedNote) {
        store.updateNote(selectedNote.id, { content: editor.getHTML() });
      }
    },
    editorProps: {
      // === COLAR IMAGEM ===
      handlePaste(view, event, slice) {
        const items = Array.from(event.clipboardData?.items || []);
        const imageItem = items.find(item => item.type.startsWith('image/'));
        if (imageItem) {
          event.preventDefault();
          const file = imageItem.getAsFile();
          if (!file) return false;
          const reader = new FileReader();
          reader.onload = (e) => {
            const src = e.target.result;
            const node = view.state.schema.nodes.resizableImage.create({
              src,
              width: 75,
              align: 'center',
            });
            const tr = view.state.tr.replaceSelectionWith(node);
            view.dispatch(tr);
          };
          reader.readAsDataURL(file);
          return true;
        }
        return false;
      },
      // === ARRASTAR IMAGEM PARA DENTRO ===
      handleDrop(view, event, slice, moved) {
        if (moved) return false;
        const files = Array.from(event.dataTransfer?.files || []);
        const imageFile = files.find(f => f.type.startsWith('image/'));
        if (imageFile) {
          event.preventDefault();
          const reader = new FileReader();
          reader.onload = (e) => {
            const src = e.target.result;
            const node = view.state.schema.nodes.resizableImage.create({
              src,
              width: 75,
              align: 'center',
            });
            const pos = view.posAtCoords({ left: event.clientX, top: event.clientY });
            const tr = view.state.tr.insert(pos?.pos || 0, node);
            view.dispatch(tr);
          };
          reader.readAsDataURL(imageFile);
          return true;
        }
        return false;
      },
    },
  });

  // Atualizar editor quando nota selecionada muda
  useEffect(() => {
    if (selectedNote && editor) {
      setTitle(selectedNote.title || '');
      if (editor.getHTML() !== selectedNote.content) {
        editor.commands.setContent(selectedNote.content || '');
      }
      setGrammarIssues([]);
      setShowGrammar(false);
      if (selectedNote.content) predictiveEngine.learn(selectedNote.content);
      if (selectedNote.title) predictiveEngine.learn(selectedNote.title);
    }
  }, [selectedNote?.id]);

  // === BOOTSTRAP DO CÉREBRO PREDITIVO ===
  // Toda vez que a coleção de notas mudar, garante que o motor aprendeu
  // de todas elas (titulos, conteúdo, tags e motivos de conexão). A engine
  // tem cache interno (fingerprint), então só re-processa quando algo
  // realmente mudou. Isso é o que faz a sugestão inline ficar boa.
  useEffect(() => {
    try { predictiveEngine.learnFromAll(store.notes); } catch (_) { /* nunca quebrar a tela por isso */ }
  }, [store.notes]);

  // === SPELL-CHECK INLINE: checagem com debounce ===
  // Roda 1.5s depois que o usuário para de digitar. Usa o MESMO builder de
  // texto plano que a extensão InlineGrammar — assim os offsets do
  // LanguageTool batem com as posições do ProseMirror.
  useEffect(() => {
    if (!editor) return undefined;

    const runCheck = async () => {
      try {
        const { text } = buildPlainTextMap(editor.state.doc);
        if (!text || text.trim().length < 4) {
          editor.commands.setGrammarIssues([]);
          lastCheckedTextRef.current = '';
          return;
        }
        if (text === lastCheckedTextRef.current) return; // nada mudou
        lastCheckedTextRef.current = text;
        const result = await grammarEngine.check(text);
        // Filtra issues triviais (ex: ofensa por "0 length")
        const issues = (result?.issues || []).filter(i => i && i.length > 0 && i.length < text.length);
        editor.commands.setGrammarIssues(issues);
      } catch (_) {
        // ignora — o editor segue funcionando
      }
    };

    const onUpdate = () => {
      if (grammarCheckTimerRef.current) clearTimeout(grammarCheckTimerRef.current);
      grammarCheckTimerRef.current = setTimeout(runCheck, 1500);
    };

    // Roda uma vez no mount/refresh do editor, com pequeno delay
    grammarCheckTimerRef.current = setTimeout(runCheck, 800);
    editor.on('update', onUpdate);
    return () => {
      editor.off('update', onUpdate);
      if (grammarCheckTimerRef.current) clearTimeout(grammarCheckTimerRef.current);
    };
  }, [editor, selectedNote?.id]);

  // === SPELL-CHECK INLINE: detecção de hover ===
  // Escuta mouseover/mouseout no DOM do editor via event delegation.
  // Quando o cursor está sobre uma .anotata-issue, agenda abertura do
  // popover. Quando sai, agenda fechamento (com pequeno atraso pra não
  // piscar quando o mouse atravessa o gap entre palavra e popover).
  useEffect(() => {
    if (!editor) return undefined;
    const dom = editor.view && editor.view.dom;
    if (!dom) return undefined;

    const findIssueEl = (target) => {
      if (!target || target.nodeType !== 1) return null;
      return target.closest && target.closest('.anotata-issue');
    };

    const onOver = (e) => {
      const el = findIssueEl(e.target);
      if (!el) return;
      const id = el.getAttribute('data-issue-id');
      if (!id) return;
      if (grammarLeaveTimerRef.current) {
        clearTimeout(grammarLeaveTimerRef.current);
        grammarLeaveTimerRef.current = null;
      }
      if (grammarHoverTimerRef.current) clearTimeout(grammarHoverTimerRef.current);
      grammarHoverTimerRef.current = setTimeout(() => {
        const issues = (editor.storage && editor.storage.inlineGrammar && editor.storage.inlineGrammar.issues) || [];
        const issue = issues.find(i => String(i.id) === String(id));
        if (!issue) return;
        const rect = el.getBoundingClientRect();
        setHoveredIssue(issue);
        setHoveredRect(rect);
      }, 150);
    };

    const onOut = (e) => {
      const el = findIssueEl(e.target);
      if (!el) return;
      // Só fecha se realmente saiu da palavra (relatedTarget não é descendente da palavra nem do popover)
      const to = e.relatedTarget;
      if (to && (findIssueEl(to) === el || (to.closest && to.closest('[role="dialog"]')))) return;
      if (grammarHoverTimerRef.current) clearTimeout(grammarHoverTimerRef.current);
      if (grammarLeaveTimerRef.current) clearTimeout(grammarLeaveTimerRef.current);
      grammarLeaveTimerRef.current = setTimeout(() => {
        setHoveredIssue(null);
        setHoveredRect(null);
      }, 150);
    };

    dom.addEventListener('mouseover', onOver);
    dom.addEventListener('mouseout', onOut);
    return () => {
      dom.removeEventListener('mouseover', onOver);
      dom.removeEventListener('mouseout', onOut);
      if (grammarHoverTimerRef.current) clearTimeout(grammarHoverTimerRef.current);
      if (grammarLeaveTimerRef.current) clearTimeout(grammarLeaveTimerRef.current);
    };
  }, [editor]);

  // === ANÁLISE LOCAL EM TEMPO REAL ===
  const suggestions = useMemo(() => {
    if (!selectedNote) return null;
    return rulesEngine.analyze(selectedNote, store.notes);
  }, [selectedNote?.content, selectedNote?.title, selectedNote?.tags, selectedNote?.type, selectedNote?.status, selectedNote?.priority, store.notes]);

  const handleTitleChange = useCallback((e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (selectedNote) store.updateNote(selectedNote.id, { title: newTitle });
  }, [selectedNote, store]);

  const handleNotebookChange = (e) => {
    if (selectedNote) store.updateNote(selectedNote.id, { notebookId: e.target.value });
  };

  const checkGrammar = async () => {
    if (!editor || !selectedNote) return;
    setIsCheckingGrammar(true);
    setShowGrammar(true);
    try {
      const text = editor.getText();
      const result = await grammarEngine.check(text);
      setGrammarIssues(result.issues || []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsCheckingGrammar(false);
    }
  };

  const applySuggestion = (issue, suggestion) => {
    if (!editor) return;
    const fullText = editor.getText();
    const before = fullText.slice(0, issue.offset);
    const after = fullText.slice(issue.offset + issue.length);
    const newText = before + suggestion + after;
    const paragraphs = newText.split('\n').filter(p => p);
    const html = paragraphs.map(p => `<p>${p}</p>`).join('');
    editor.commands.setContent(html);
    setGrammarIssues(prev => prev.filter(i => i.id !== issue.id));
  };

  const ignoreIssue = (issue) => {
    setGrammarIssues(prev => prev.filter(i => i.id !== issue.id));
  };

  const insertImageFromFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        editor?.chain().focus().insertContent({
          type: 'resizableImage',
          attrs: { src: ev.target.result, width: 75, align: 'center' },
        }).run();
      };
      reader.readAsDataURL(file);
    };
    input.click();
  };

  const handleAiRequest = async () => {
    alert('🤖 Porta de IA aberta!\n\nQuando sua IA estiver pronta, ela será conectada aqui.');
  };

  // === HANDLERS DO REESCRITOR ===
  // Abre o panel: se houver seleção, reescreve só ela; senão, reescreve a nota toda.
  const openRephrase = useCallback(() => {
    if (!editor) return;
    try {
      const { from, to, empty } = editor.state.selection;
      if (!empty && from < to) {
        // Seleção ativa: pega só esse trecho
        const selectedText = editor.state.doc.textBetween(from, to, ' ');
        if (selectedText && selectedText.trim().length >= 3) {
          setRephraseState({
            open: true,
            originalText: selectedText,
            scope: 'selection',
            range: { from, to },
          });
          return;
        }
      }
      // Sem seleção (ou seleção curta demais): pega a nota inteira
      const fullText = editor.getText();
      if (!fullText || fullText.trim().length < 3) {
        alert('Não há texto suficiente para reescrever. Escreva algo primeiro.');
        return;
      }
      setRephraseState({
        open: true,
        originalText: fullText,
        scope: 'full',
        range: null,
      });
    } catch (_) {
      // qualquer erro, não abre
    }
  }, [editor]);

  const closeRephrase = useCallback(() => {
    setRephraseState(null);
  }, []);

  const applyRephrase = useCallback((newText) => {
    if (!editor || !rephraseState) {
      setRephraseState(null);
      return;
    }
    try {
      if (rephraseState.scope === 'selection' && rephraseState.range) {
        // Substitui apenas o trecho selecionado
        const { from, to } = rephraseState.range;
        editor.chain().focus().insertContentAt({ from, to }, newText).run();
      } else {
        // Substitui o conteúdo todo, preservando estrutura simples (parágrafos)
        const paragraphs = String(newText).split(/\n\n+/).filter(p => p.trim());
        const html = paragraphs.length > 0
          ? paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('')
          : `<p>${escapeHtml(newText)}</p>`;
        editor.chain().focus().setContent(html).run();
      }
    } catch (_) {
      // se algo der errado, deixa o texto original
    }
    setRephraseState(null);
  }, [editor, rephraseState]);

  // === HANDLERS DO POPOVER DE GRAMÁTICA INLINE ===
  const closeGrammarPopover = useCallback(() => {
    setHoveredIssue(null);
    setHoveredRect(null);
  }, []);

  const handleApplyReplacement = useCallback((replacement) => {
    if (!editor || !hoveredIssue) return;
    try {
      editor.commands.applyGrammarReplacement(hoveredIssue.id, replacement);
    } catch (_) {}
    closeGrammarPopover();
    // Re-foca no editor pra continuar escrevendo
    setTimeout(() => { try { editor.commands.focus(); } catch (_) {} }, 0);
  }, [editor, hoveredIssue, closeGrammarPopover]);

  const handleIgnoreIssueInline = useCallback(() => {
    if (!editor || !hoveredIssue) return;
    try {
      editor.commands.ignoreGrammarIssue(hoveredIssue.id);
    } catch (_) {}
    closeGrammarPopover();
  }, [editor, hoveredIssue, closeGrammarPopover]);

  const handlePopoverMouseEnter = useCallback(() => {
    if (grammarLeaveTimerRef.current) {
      clearTimeout(grammarLeaveTimerRef.current);
      grammarLeaveTimerRef.current = null;
    }
  }, []);

  const handlePopoverMouseLeave = useCallback(() => {
    if (grammarLeaveTimerRef.current) clearTimeout(grammarLeaveTimerRef.current);
    grammarLeaveTimerRef.current = setTimeout(() => {
      setHoveredIssue(null);
      setHoveredRect(null);
    }, 150);
  }, []);

  if (!selectedNote) {
    return (
      <div className="flex-1 flex items-center justify-center bg-anotata-bg">
        <div className="text-center">
          <div className="text-6xl mb-4">📝</div>
          <h2 className="text-xl font-semibold text-anotata-text mb-2">Selecione uma nota</h2>
          <p className="text-anotata-muted text-sm">Escolha uma nota na lista ou crie uma nova</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full bg-white overflow-hidden">
      {/* Header do editor */}
      <div className="border-b border-anotata-border px-6 py-4 bg-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3 text-xs text-anotata-text-suave flex-wrap">
            <div className="flex items-center gap-1">
              <BookOpen size={12} />
              <select
                value={selectedNote.notebookId}
                onChange={handleNotebookChange}
                className="bg-transparent text-anotata-text-suave text-xs border-none focus:outline-none cursor-pointer hover:text-anotata-roxo"
              >
                {store.notebooks.map(nb => (
                  <option key={nb.id} value={nb.id}>{nb.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{new Date(selectedNote.updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
            {/* Indicador de salvamento */}
            <SaveIndicator status={store.saveStatus} />
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={insertImageFromFile}
              className="p-1.5 rounded text-anotata-text-suave hover:bg-anotata-hover hover:text-anotata-roxo transition-colors"
              title="Inserir imagem do computador (também pode colar com Ctrl+V)"
            >
              <ImageIcon size={16} />
            </button>
            <button
              onClick={() => setShowConnectionModal(true)}
              className="p-1.5 rounded text-anotata-text-suave hover:bg-anotata-hover hover:text-anotata-roxo transition-colors"
              title="Conectar com outra nota"
            >
              <Link2 size={16} />
            </button>
            <button
              onClick={() => setShowConnectionMap(true)}
              className="p-1.5 rounded text-anotata-text-suave hover:bg-anotata-hover hover:text-anotata-roxo transition-colors"
              title="Mapa visual de conexões"
            >
              <MapIcon size={16} />
            </button>
            <button
              onClick={openRephrase}
              className="p-1.5 rounded text-anotata-text-suave hover:bg-anotata-hover hover:text-anotata-roxo transition-colors"
              title="Reescrever (seleção ou nota inteira)"
            >
              <RotateCw size={16} />
            </button>
            <button
              onClick={checkGrammar}
              disabled={isCheckingGrammar}
              className={`p-1.5 rounded transition-colors ${
                showGrammar ? 'bg-anotata-roxo text-white' : 'text-anotata-text-suave hover:bg-anotata-hover hover:text-anotata-roxo'
              }`}
              title="Verificar gramática"
            >
              <SpellCheck size={16} />
            </button>
            <button
              onClick={() => setShowInsightPanel(!showInsightPanel)}
              className={`p-1.5 rounded transition-colors ${
                showInsightPanel ? 'bg-anotata-roxo text-white' : 'text-anotata-text-suave hover:bg-anotata-hover hover:text-anotata-roxo'
              }`}
              title="Painel de diagnóstico"
            >
              <PanelRight size={16} />
            </button>
            <button
              onClick={handleAiRequest}
              className="p-1.5 rounded hover:bg-anotata-hover text-anotata-text-suave hover:text-anotata-roxo transition-colors"
              title="Assistente IA (em breve)"
            >
              <Sparkles size={16} />
            </button>
            <button
              onClick={() => store.toggleFavorite(selectedNote.id)}
              className={`p-1.5 rounded hover:bg-anotata-hover transition-colors ${
                selectedNote.isFavorite ? 'text-yellow-500' : 'text-anotata-text-suave hover:text-yellow-500'
              }`}
              title={selectedNote.isFavorite ? 'Remover dos favoritos' : 'Favoritar'}
            >
              <Star size={16} className={selectedNote.isFavorite ? 'fill-yellow-500' : ''} />
            </button>
            <button
              onClick={() => store.moveToTrash(selectedNote.id)}
              className="p-1.5 rounded hover:bg-anotata-hover text-anotata-text-suave hover:text-anotata-goiaba transition-colors"
              title="Mover para lixeira"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Título da nota..."
          className="w-full text-2xl font-bold bg-transparent text-anotata-text border-none focus:outline-none placeholder:text-anotata-muted"
        />

        {/* === Barra de metadados (tipo, status, prioridade) === */}
        <NoteMetaBar note={selectedNote} store={store} suggestions={suggestions} />

        {/* === Próxima ação sugerida === */}
        {suggestions?.nextAction && (
          <NextActionCard
            suggestion={suggestions.nextAction}
            onApply={() => handleNextAction(suggestions.nextAction, selectedNote, store)}
          />
        )}

        <TagBar store={store} noteId={selectedNote.id} noteTags={selectedNote.tags} />
      </div>

      <Toolbar editor={editor} />
      <PredictiveBar editor={editor} />

      {/* Editor + painéis laterais */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <EditorContent editor={editor} className="h-full" />
        </div>

        {showGrammar && (
          <GrammarPanel
            issues={grammarIssues}
            isLoading={isCheckingGrammar}
            onApply={applySuggestion}
            onIgnore={ignoreIssue}
            onClose={() => setShowGrammar(false)}
            onRecheck={checkGrammar}
          />
        )}

        {showInsightPanel && !showGrammar && (
          <InsightPanel
            note={selectedNote}
            store={store}
            suggestions={suggestions}
            onClose={() => setShowInsightPanel(false)}
            onAddConnection={() => setShowConnectionModal(true)}
            onFocusTitle={() => {
              const el = document.querySelector('input[placeholder="Título da nota..."]');
              if (el) el.focus();
            }}
            onFocusTags={() => {
              const el = document.querySelector('[data-tag-add-btn]');
              if (el) el.click();
            }}
          />
        )}
      </div>

      {/* Modal de conexão */}
      {showConnectionModal && (
        <ConnectionModal
          currentNote={selectedNote}
          store={store}
          onClose={() => setShowConnectionModal(false)}
        />
      )}

      {/* Mapa visual de conexões (P5) */}
      {showConnectionMap && (
        <ConnectionMap
          note={selectedNote}
          store={store}
          onClose={() => setShowConnectionMap(false)}
        />
      )}

      {/* Painel do Reescritor (P5) */}
      {rephraseState && rephraseState.open && (
        <RephrasePanel
          originalText={rephraseState.originalText}
          scope={rephraseState.scope}
          onApply={applyRephrase}
          onClose={closeRephrase}
        />
      )}

      {/* === BUBBLE MENU DE SELEÇÃO (Reescritor F4) === */}
      {/* Mostra um botão flutuante "Reescrever" sempre que o usuário seleciona
          texto no editor. Ao clicar, abre um popover compacto colado à seleção. */}
      <SelectionBubbleMenu editor={editor} />

      {/* Popover de correção inline (spell-check / gramática) */}
      {hoveredIssue && hoveredRect && (
        <GrammarPopover
          issue={hoveredIssue}
          anchorRect={hoveredRect}
          onApply={handleApplyReplacement}
          onIgnore={handleIgnoreIssueInline}
          onClose={closeGrammarPopover}
          onMouseEnter={handlePopoverMouseEnter}
          onMouseLeave={handlePopoverMouseLeave}
        />
      )}
    </div>
  );
}

function SaveIndicator({ status }) {
  if (status === 'saving') {
    return (
      <span className="flex items-center gap-1 text-anotata-muted">
        <Cloud size={11} className="animate-pulse" />
        Salvando...
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <span className="flex items-center gap-1 text-green-600">
        <CheckCircle size={11} />
        Salvo
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="flex items-center gap-1 text-anotata-goiaba">
        <CloudOff size={11} />
        Erro ao salvar
      </span>
    );
  }
  return null;
}

function NextActionCard({ suggestion, onApply }) {
  return (
    <div className="mt-3 flex items-center justify-between gap-3 p-2.5 bg-gradient-to-r from-anotata-lavanda-clara to-white border border-anotata-lavanda rounded-lg">
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <div className="w-7 h-7 rounded-full bg-anotata-roxo flex items-center justify-center shrink-0">
          <Sparkles size={13} className="text-white" />
        </div>
        <div className="min-w-0">
          <div className="text-[10px] uppercase font-semibold text-anotata-roxo tracking-wide">
            Próxima ação
          </div>
          <div className="text-sm text-anotata-text font-medium truncate">
            {suggestion.label}
          </div>
          <div className="text-[10px] text-anotata-muted">{suggestion.reason}</div>
        </div>
      </div>
      <button
        onClick={onApply}
        className="text-xs px-3 py-1.5 bg-anotata-roxo text-white rounded-md hover:bg-anotata-roxo-escuro transition-colors font-medium shrink-0"
      >
        Fazer
      </button>
    </div>
  );
}

function handleNextAction(suggestion, note, store) {
  switch (suggestion.action) {
    case 'renomear': {
      const titleInput = document.querySelector('input[placeholder="Título da nota..."]');
      if (titleInput) {
        titleInput.focus();
        titleInput.select();
      }
      break;
    }
    case 'tags': {
      const tagBtn = document.querySelector('[data-tag-add-btn]');
      if (tagBtn) tagBtn.click();
      break;
    }
    case 'arquivar':
      store.archiveNote(note.id);
      break;
    case 'revisar':
      store.markAsReviewed(note.id);
      break;
    case 'definir-tipo': {
      // Abre o painel lateral pra deixar o usuário ver as sugestões
      const panelBtn = document.querySelector('[title="Painel de diagnóstico"]');
      if (panelBtn) panelBtn.click();
      break;
    }
    case 'prazo': {
      // Abre o painel lateral mostrando datas detectadas
      const panelBtn = document.querySelector('[title="Painel de diagnóstico"]');
      if (panelBtn) panelBtn.click();
      break;
    }
    case 'conectar': {
      // Abre o modal de conexões
      const connBtn = document.querySelector('[title="Conectar com outra nota"]');
      if (connBtn) connBtn.click();
      break;
    }
    default:
      break;
  }
}

function escapeHtml(s) {
  if (!s) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
