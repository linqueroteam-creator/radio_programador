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
import {
  Star, Trash2, BookOpen, Clock, Sparkles
} from 'lucide-react';

export default function Editor({ store }) {
  const { selectedNote } = store;
  const [title, setTitle] = useState('');

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
    }
  }, [selectedNote?.id]);

  // Salvar título com debounce
  const handleTitleChange = useCallback((e) => {
    const newTitle = e.target.value;
    setTitle(newTitle);
    if (selectedNote) {
      store.updateNote(selectedNote.id, { title: newTitle });
    }
  }, [selectedNote, store]);

  // Mudar caderno da nota
  const handleNotebookChange = (e) => {
    if (selectedNote) {
      store.updateNote(selectedNote.id, { notebookId: e.target.value });
    }
  };

  // Solicitar IA (porta aberta para futuro)
  const handleAiRequest = async (action) => {
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

  const notebook = store.getNotebookById(selectedNote.notebookId);

  return (
    <div className="flex-1 flex flex-col h-full bg-anotata-bg overflow-hidden">
      {/* Header do editor */}
      <div className="border-b border-anotata-border p-4">
        <div className="flex items-center justify-between mb-3">
          {/* Info da nota */}
          <div className="flex items-center gap-3 text-xs text-anotata-muted">
            <div className="flex items-center gap-1">
              <BookOpen size={12} />
              <select
                value={selectedNote.notebookId}
                onChange={handleNotebookChange}
                className="bg-transparent text-anotata-muted text-xs border-none focus:outline-none cursor-pointer"
              >
                {store.notebooks.map(nb => (
                  <option key={nb.id} value={nb.id} className="bg-anotata-sidebar">{nb.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <Clock size={12} />
              <span>{new Date(selectedNote.updatedAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</span>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleAiRequest('suggest')}
              className="p-1.5 rounded hover:bg-anotata-hover text-anotata-accent2 hover:text-anotata-accent transition-colors"
              title="Assistente IA (em breve)"
            >
              <Sparkles size={16} />
            </button>
            <button
              onClick={() => store.toggleFavorite(selectedNote.id)}
              className={`p-1.5 rounded hover:bg-anotata-hover transition-colors ${
                selectedNote.isFavorite ? 'text-yellow-400' : 'text-anotata-muted hover:text-yellow-400'
              }`}
              title={selectedNote.isFavorite ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
            >
              <Star size={16} className={selectedNote.isFavorite ? 'fill-yellow-400' : ''} />
            </button>
            <button
              onClick={() => store.moveToTrash(selectedNote.id)}
              className="p-1.5 rounded hover:bg-anotata-hover text-anotata-muted hover:text-red-400 transition-colors"
              title="Mover para lixeira"
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {/* Título */}
        <input
          type="text"
          value={title}
          onChange={handleTitleChange}
          placeholder="Título da nota..."
          className="w-full text-2xl font-bold bg-transparent text-anotata-text border-none focus:outline-none placeholder:text-anotata-muted"
        />

        {/* Tags */}
        <TagBar store={store} noteId={selectedNote.id} noteTags={selectedNote.tags} />
      </div>

      {/* Toolbar de formatação */}
      <Toolbar editor={editor} onAiRequest={handleAiRequest} />

      {/* Editor de conteúdo */}
      <div className="flex-1 overflow-y-auto">
        <EditorContent editor={editor} className="h-full" />
      </div>
    </div>
  );
}
