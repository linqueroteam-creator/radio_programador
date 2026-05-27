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
import Toolbar from './Toolbar';
import TagBar from './TagBar';
import PredictiveBar from './PredictiveBar';
import GrammarPanel from './GrammarPanel';
import NoteMetaBar from './NoteMetaBar';
import predictiveEngine from '../engine/PredictiveEngine';
import grammarEngine from '../engine/GrammarEngine';
import rulesEngine from '../engine/RulesEngine';
import {
  Star, Trash2, BookOpen, Clock, Sparkles, SpellCheck,
  Image as ImageIcon, CheckCircle, AlertCircle, Cloud, CloudOff
} from 'lucide-react';

export default function Editor({ store }) {
  const { selectedNote } = store;
  const [title, setTitle] = useState('');
  const [showGrammar, setShowGrammar] = useState(false);
  const [grammarIssues, setGrammarIssues] = useState([]);
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      Link.configure({ openOnClick: false }),
      ResizableImage,
      Placeholder.configure({ placeholder: 'Comece a escrever... (cole imagens com Ctrl+V)' }),
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

      {/* Editor + painel de gramática */}
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
      </div>
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
    case 'renomear':
      // Foca o input de título
      const titleInput = document.querySelector('input[placeholder="Título da nota..."]');
      if (titleInput) titleInput.focus();
      break;
    case 'tags':
      // Abre o input de tag
      const tagBtn = document.querySelector('[data-tag-add-btn]');
      if (tagBtn) tagBtn.click();
      else alert('Adicione tags na barra de tags abaixo do título');
      break;
    case 'arquivar':
      store.archiveNote(note.id);
      break;
    case 'revisar':
      store.markAsReviewed(note.id);
      break;
    case 'definir-tipo':
      alert('Clique no badge "Rascunho" no topo para escolher o tipo da nota');
      break;
    case 'prazo':
      alert('Recurso de prazo será implementado na próxima sessão (Fase 10)');
      break;
    case 'conectar':
      alert('Recurso de conexões será implementado na próxima sessão (Fase 5)');
      break;
    default:
      break;
  }
}
