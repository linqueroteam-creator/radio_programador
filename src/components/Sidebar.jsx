import React, { useState } from 'react';
import {
  FileText, Star, Trash2, BookOpen, Tag, Plus,
  ChevronDown, ChevronRight, Search, Sparkles, X
} from 'lucide-react';

export default function Sidebar({ store }) {
  const [notebooksOpen, setNotebooksOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(true);
  const [showNewNotebook, setShowNewNotebook] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  const handleCreateNotebook = () => {
    if (newNotebookName.trim()) {
      store.createNotebook(newNotebookName.trim());
      setNewNotebookName('');
      setShowNewNotebook(false);
    }
  };

  const handleCreateTag = () => {
    if (newTagName.trim()) {
      store.addTag(newTagName.trim());
      setNewTagName('');
      setShowNewTag(false);
    }
  };

  const totalNotes = store.notes.filter(n => !n.isTrash).length;
  const favCount = store.notes.filter(n => n.isFavorite && !n.isTrash).length;
  const trashCount = store.notes.filter(n => n.isTrash).length;

  return (
    <aside className="w-64 min-w-[240px] bg-anotata-sidebar border-r border-anotata-border flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-anotata-border">
        <h1 className="text-xl font-bold text-anotata-accent tracking-wide">ANOTATA</h1>
        <p className="text-xs text-anotata-muted mt-1">Suas anotações, seu jeito</p>
      </div>

      {/* Busca */}
      <div className="p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-anotata-muted" />
          <input
            type="text"
            placeholder="Buscar notas..."
            value={store.searchQuery}
            onChange={(e) => store.setSearchQuery(e.target.value)}
            className="w-full bg-anotata-bg border border-anotata-border rounded-lg pl-9 pr-3 py-2 text-sm text-anotata-text placeholder:text-anotata-muted focus:outline-none focus:border-anotata-accent"
          />
          {store.searchQuery && (
            <button
              onClick={() => store.setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-anotata-muted hover:text-anotata-accent"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Menu principal */}
      <nav className="flex-1 overflow-y-auto px-2">
        {/* Todas as notas */}
        <button
          onClick={() => { store.setCurrentView('all'); store.setSelectedNoteId(null); }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            store.currentView === 'all' ? 'bg-anotata-hover text-anotata-accent' : 'text-anotata-text hover:bg-anotata-hover'
          }`}
        >
          <FileText size={16} />
          <span>Todas as Notas</span>
          <span className="ml-auto text-xs text-anotata-muted">{totalNotes}</span>
        </button>

        {/* Favoritos */}
        <button
          onClick={() => { store.setCurrentView('favorites'); store.setSelectedNoteId(null); }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            store.currentView === 'favorites' ? 'bg-anotata-hover text-anotata-accent' : 'text-anotata-text hover:bg-anotata-hover'
          }`}
        >
          <Star size={16} />
          <span>Favoritos</span>
          <span className="ml-auto text-xs text-anotata-muted">{favCount}</span>
        </button>

        {/* Lixeira */}
        <button
          onClick={() => { store.setCurrentView('trash'); store.setSelectedNoteId(null); }}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
            store.currentView === 'trash' ? 'bg-anotata-hover text-anotata-accent' : 'text-anotata-text hover:bg-anotata-hover'
          }`}
        >
          <Trash2 size={16} />
          <span>Lixeira</span>
          <span className="ml-auto text-xs text-anotata-muted">{trashCount}</span>
        </button>

        {/* IA (porta aberta) */}
        <button
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-anotata-muted hover:bg-anotata-hover transition-colors opacity-60 cursor-not-allowed"
          title="IA será conectada futuramente"
        >
          <Sparkles size={16} />
          <span>Assistente IA</span>
          <span className="ml-auto text-[10px] bg-anotata-accent2 px-1.5 py-0.5 rounded text-white">Em breve</span>
        </button>

        {/* Separador */}
        <div className="border-t border-anotata-border my-3"></div>

        {/* Cadernos */}
        <div className="mb-2">
          <button
            onClick={() => setNotebooksOpen(!notebooksOpen)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase text-anotata-muted hover:text-anotata-text"
          >
            {notebooksOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <BookOpen size={12} />
            <span>Cadernos</span>
            <button
              onClick={(e) => { e.stopPropagation(); setShowNewNotebook(true); }}
              className="ml-auto hover:text-anotata-accent"
            >
              <Plus size={12} />
            </button>
          </button>

          {notebooksOpen && (
            <div className="ml-4 mt-1 space-y-0.5">
              {store.notebooks.map(nb => (
                <button
                  key={nb.id}
                  onClick={() => {
                    store.setCurrentView('notebook');
                    store.setCurrentNotebookId(nb.id);
                    store.setSelectedNoteId(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                    store.currentView === 'notebook' && store.currentNotebookId === nb.id
                      ? 'bg-anotata-hover text-anotata-accent'
                      : 'text-anotata-text hover:bg-anotata-hover'
                  }`}
                >
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: nb.color }}></div>
                  <span className="truncate">{nb.name}</span>
                  <span className="ml-auto text-xs text-anotata-muted">{store.getNoteCount(nb.id)}</span>
                </button>
              ))}
              {showNewNotebook && (
                <div className="flex items-center gap-1 px-2 py-1">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Nome do caderno"
                    value={newNotebookName}
                    onChange={(e) => setNewNotebookName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateNotebook(); if (e.key === 'Escape') setShowNewNotebook(false); }}
                    className="flex-1 bg-anotata-bg border border-anotata-border rounded px-2 py-1 text-xs text-anotata-text focus:outline-none focus:border-anotata-accent"
                  />
                  <button onClick={handleCreateNotebook} className="text-anotata-green hover:opacity-80">
                    <Plus size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="mb-2">
          <button
            onClick={() => setTagsOpen(!tagsOpen)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase text-anotata-muted hover:text-anotata-text"
          >
            {tagsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <Tag size={12} />
            <span>Tags</span>
            <button
              onClick={(e) => { e.stopPropagation(); setShowNewTag(true); }}
              className="ml-auto hover:text-anotata-accent"
            >
              <Plus size={12} />
            </button>
          </button>

          {tagsOpen && (
            <div className="ml-4 mt-1 space-y-0.5">
              {store.tags.map(tag => (
                <button
                  key={tag}
                  onClick={() => {
                    store.setCurrentView('tag');
                    store.setCurrentTagFilter(tag);
                    store.setSelectedNoteId(null);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                    store.currentView === 'tag' && store.currentTagFilter === tag
                      ? 'bg-anotata-hover text-anotata-accent'
                      : 'text-anotata-text hover:bg-anotata-hover'
                  }`}
                >
                  <span className="text-anotata-accent">#</span>
                  <span className="truncate">{tag}</span>
                </button>
              ))}
              {showNewTag && (
                <div className="flex items-center gap-1 px-2 py-1">
                  <input
                    type="text"
                    autoFocus
                    placeholder="Nome da tag"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateTag(); if (e.key === 'Escape') setShowNewTag(false); }}
                    className="flex-1 bg-anotata-bg border border-anotata-border rounded px-2 py-1 text-xs text-anotata-text focus:outline-none focus:border-anotata-accent"
                  />
                  <button onClick={handleCreateTag} className="text-anotata-green hover:opacity-80">
                    <Plus size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-anotata-border">
        <p className="text-[10px] text-anotata-muted text-center">ANOTATA v1.0 • Uso pessoal</p>
      </div>
    </aside>
  );
}
