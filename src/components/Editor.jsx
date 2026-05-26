import React, { useEffect, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Link from '@tiptap/extension-link';
import Image from '@tiptap/extension-image';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Toolbar from './Toolbar';
import TagBar from './TagBar';
import PredictiveBar from './PredictiveBar';
import GrammarPanel from './GrammarPanel';
import predictiveEngine from '../engine/PredictiveEngine';
import grammarEngine from '../engine/GrammarEngine';
import {
  Star, Trash2, BookOpen, Clock, Sparkles, SpellCheck, X
} from 'lucide-react';

export default function Editor({ store }) {
  const { selectedNote } = store;
  const [title, setTitle] = useState('');
  const [showGrammar, setShowGrammar] = useState(false);
  const [grammarIssues, setGrammarIssues] = useState([]);
  const [isCheckingGrammar, setIsCheckingGrammar] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      Link.configure({ openOnClick: false }),
      Image,
      Placeholder.configure({ placeholder: 'Comece a escrever...' }),
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
      // Ensinar o motor preditivo com o conteúdo da nota
      if (selectedNote.content) {
        predictiveEngine.learn(selectedNote.content);
      }
      if (selectedNote.title) {
        predictiveEngine.learn(selectedNote.title);
      }
    }
  }, [selectedNote?.id]);

  const handleTitleChange = useCallback((e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (selectedNote) {
      store.updateNote(selectedNote.id, { title: newTitle });
    }
  }, [selectedNote, store]);

  const handleNotebookChange = (e) => {
    if (selectedNote) {
      store.updateNote(selectedNote.id, { notebookId: e.target.value });
    }
  };

  // Verificar gramática da nota atual
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

  // Aplicar uma sugestão na nota
  const applySuggestion = (issue, suggestion) => {
    if (!editor) return;
    const fullText = editor.getText();
    const before = fullText.slice(0, issue.offset);
    const after = fullText.slice(issue.offset + issue.length);
    const newText = before + suggestion + after;

    // Reconstruir conteúdo (perde formatação rica, mas mantém parágrafos)
    const paragraphs = newText.split('\n').filter(p => p);
    const html = paragraphs.map(p => `<p>${p}</p>`).join('');
    editor.commands.setContent(html);

    // Remove o erro corrigido
    setGrammarIssues(prev => prev.filter(i => i.id !== issue.id));
  };

  const ignoreIssue = (issue) => {
    setGrammarIssues(prev => prev.filter(i => i.id !== issue.id));
  };

  const handleAiRequest = async () => {
    alert('🤖 Porta de IA aberta!\n\nQuando sua IA estiver pronta, ela será conectada aqui.\nAções disponíveis: resumir, expandir, traduzir, sugerir');
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
          <div className="flex items-center gap-3 text-xs text-anotata-text-suave">
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
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={checkGrammar}
              disabled={isCheckingGrammar}
              className={`p-1.5 rounded transition-colors ${
                showGrammar
                  ? 'bg-anotata-roxo text-white'
                  : 'text-anotata-text-suave hover:bg-anotata-hover hover:text-anotata-roxo'
              }`}
              title="Verificar gramática e ortografia"
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
              title={selectedNote.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
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
