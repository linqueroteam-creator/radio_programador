import React, { useState, useMemo } from 'react';
import {
  FileText, Star, Trash2, BookOpen, Tag, Plus,
  ChevronDown, ChevronRight, Search, Sparkles, X,
  ChevronLeft, Menu, SpellCheck,
  Home as HomeIcon, TrendingUp, Layers, Pin, Archive
} from 'lucide-react';
import { COLLECTION_LIST, countCollections } from '../engine/CollectionsEngine';

export default function Sidebar({ store, isCollapsed, onToggle }) {
  const [notebooksOpen, setNotebooksOpen] = useState(true);
  const [tagsOpen, setTagsOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(true);
  const [showNewNotebook, setShowNewNotebook] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [showNewTag, setShowNewTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');

  // Conta coleções (cacheado por mudança em notes)
  const collectionCounts = useMemo(() => countCollections(store.notes), [store.notes]);

  // Top 6 coleções com mais resultados (para não poluir)
  const visibleCollections = useMemo(() => {
    return COLLECTION_LIST
      .map(c => ({ ...c, count: collectionCounts[c.id] || 0 }))
      .filter(c => c.count > 0)
      .sort((a, b) => b.count - a.count);
  }, [collectionCounts]);

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

  const totalNotes = store.notes.filter(n => !n.isTrash && !n.isArchived).length;
  const favCount = store.notes.filter(n => n.isFavorite && !n.isTrash).length;
  const trashCount = store.notes.filter(n => n.isTrash).length;
  const archivedCount = store.notes.filter(n => n.isArchived && !n.isTrash).length;

  // Versão recolhida
  if (isCollapsed) {
    return (
      <aside className="w-14 bg-anotata-sidebar border-r border-anotata-border flex flex-col h-full transition-all duration-300 ease-in-out">
        <div className="p-3 border-b border-anotata-border flex justify-center">
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-anotata-hover text-anotata-roxo transition-colors"
            title="Expandir menu"
          >
            <Menu size={18} />
          </button>
        </div>

        <nav className="flex-1 py-3 flex flex-col items-center gap-1 overflow-y-auto">
          <SidebarIconBtn
            icon={<HomeIcon size={18} />}
            active={store.currentView === 'home'}
            onClick={() => { store.setCurrentView('home'); store.setSelectedNoteId(null); }}
            title="Início"
          />
          <SidebarIconBtn
            icon={<FileText size={18} />}
            active={store.currentView === 'all'}
            onClick={() => { store.setCurrentView('all'); store.setSelectedNoteId(null); }}
            title={`Todas as notas (${totalNotes})`}
          />
          <SidebarIconBtn
            icon={<Star size={18} />}
            active={store.currentView === 'favorites'}
            onClick={() => { store.setCurrentView('favorites'); store.setSelectedNoteId(null); }}
            title={`Favoritos (${favCount})`}
          />
          <SidebarIconBtn
            icon={<Layers size={18} />}
            active={store.currentView === 'collection'}
            onClick={() => {
              store.setCurrentView('collection');
              store.setCurrentCollectionId('recentes');
              store.setSelectedNoteId(null);
            }}
            title="Coleções automáticas"
          />
          <SidebarIconBtn
            icon={<SpellCheck size={18} />}
            active={store.currentView === 'corretor'}
            onClick={() => { store.setCurrentView('corretor'); store.setSelectedNoteId(null); }}
            title="Corretor Ortográfico"
          />
          <SidebarIconBtn
            icon={<TrendingUp size={18} />}
            active={store.currentView === 'insights'}
            onClick={() => { store.setCurrentView('insights'); store.setSelectedNoteId(null); }}
            title="Insights / Estatísticas"
          />
          <SidebarIconBtn
            icon={<Trash2 size={18} />}
            active={store.currentView === 'trash'}
            onClick={() => { store.setCurrentView('trash'); store.setSelectedNoteId(null); }}
            title={`Lixeira (${trashCount})`}
          />
        </nav>
      </aside>
    );
  }

  // Versão expandida
  return (
    <aside className="w-64 min-w-[240px] bg-anotata-sidebar border-r border-anotata-border flex flex-col h-full transition-all duration-300 ease-in-out">
      <div className="p-4 border-b border-anotata-border flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-anotata-roxo tracking-wide">ANOTATA</h1>
          <p className="text-xs text-anotata-muted mt-0.5">Suas anotações, seu jeito</p>
        </div>
        <button
          onClick={onToggle}
          className="p-1.5 rounded-lg hover:bg-anotata-hover text-anotata-text-suave transition-colors -mr-1"
          title="Recolher menu"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Busca aproximada */}
      <div className="p-3">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-anotata-muted" />
          <input
            type="text"
            placeholder="Buscar (mesmo com erros)..."
            value={store.searchQuery}
            onChange={(e) => {
              store.setSearchQuery(e.target.value);
              if (e.target.value && store.currentView === 'home') {
                store.setCurrentView('all');
              }
            }}
            className="w-full bg-white border border-anotata-border rounded-lg pl-9 pr-3 py-2 text-sm text-anotata-text placeholder:text-anotata-muted focus:outline-none focus:border-anotata-roxo focus:ring-2 focus:ring-anotata-roxo/10"
          />
          {store.searchQuery && (
            <button
              onClick={() => store.setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-anotata-muted hover:text-anotata-goiaba"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
        {/* Início */}
        <NavBtn
          icon={<HomeIcon size={16} />}
          label="Início"
          active={store.currentView === 'home'}
          onClick={() => { store.setCurrentView('home'); store.setSelectedNoteId(null); }}
        />

        <NavBtn
          icon={<FileText size={16} />}
          label="Todas as Notas"
          count={totalNotes}
          active={store.currentView === 'all' && !store.searchQuery}
          onClick={() => { store.setCurrentView('all'); store.setSelectedNoteId(null); }}
        />

        <NavBtn
          icon={<Star size={16} />}
          label="Favoritos"
          count={favCount}
          active={store.currentView === 'favorites'}
          onClick={() => { store.setCurrentView('favorites'); store.setSelectedNoteId(null); }}
        />

        <NavBtn
          icon={<Pin size={16} />}
          label="Fixadas"
          count={store.notes.filter(n => n.isPinned && !n.isTrash).length}
          active={store.currentView === 'pinned'}
          onClick={() => { store.setCurrentView('pinned'); store.setSelectedNoteId(null); }}
        />

        <NavBtn
          icon={<SpellCheck size={16} />}
          label="Corretor"
          active={store.currentView === 'corretor'}
          onClick={() => { store.setCurrentView('corretor'); store.setSelectedNoteId(null); }}
          highlight
        />

        {archivedCount > 0 && (
          <NavBtn
            icon={<Archive size={16} />}
            label="Arquivadas"
            count={archivedCount}
            active={store.currentView === 'archived'}
            onClick={() => { store.setCurrentView('archived'); store.setSelectedNoteId(null); }}
          />
        )}

        <NavBtn
          icon={<Trash2 size={16} />}
          label="Lixeira"
          count={trashCount}
          active={store.currentView === 'trash'}
          onClick={() => { store.setCurrentView('trash'); store.setSelectedNoteId(null); }}
        />

        <button
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-anotata-muted opacity-60 cursor-not-allowed"
          title="IA será conectada futuramente"
        >
          <Sparkles size={16} />
          <span>Assistente IA</span>
          <span className="ml-auto text-[9px] bg-anotata-roxo px-1.5 py-0.5 rounded text-white">Em breve</span>
        </button>

        <div className="border-t border-anotata-border my-3"></div>

        {/* === COLEÇÕES AUTOMÁTICAS === */}
        {visibleCollections.length > 0 && (
          <div className="mb-2">
            <button
              onClick={() => setCollectionsOpen(!collectionsOpen)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase text-anotata-text-suave hover:text-anotata-roxo transition-colors"
            >
              {collectionsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
              <Layers size={12} />
              <span>Coleções automáticas</span>
            </button>

            {collectionsOpen && (
              <div className="ml-4 mt-1 space-y-0.5">
                {visibleCollections.map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      store.setCurrentView('collection');
                      store.setCurrentCollectionId(c.id);
                      store.setSelectedNoteId(null);
                    }}
                    className={`w-full flex items-center gap-2 px-3 py-1.5 rounded text-sm transition-colors ${
                      store.currentView === 'collection' && store.currentCollectionId === c.id
                        ? 'bg-anotata-hover text-anotata-roxo font-medium'
                        : 'text-anotata-text hover:bg-anotata-hover'
                    }`}
                    title={c.description}
                  >
                    <span className="text-xs">{c.icon}</span>
                    <span className="truncate">{c.name}</span>
                    <span className="ml-auto text-xs text-anotata-muted">{c.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="border-t border-anotata-border my-3"></div>

        {/* Cadernos */}
        <div className="mb-2">
          <button
            onClick={() => setNotebooksOpen(!notebooksOpen)}
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase text-anotata-text-suave hover:text-anotata-roxo transition-colors"
          >
            {notebooksOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <BookOpen size={12} />
            <span>Cadernos</span>
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); setShowNewNotebook(true); }}
              className="ml-auto hover:text-anotata-goiaba cursor-pointer"
            >
              <Plus size={12} />
            </span>
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
                      ? 'bg-anotata-hover text-anotata-roxo font-medium'
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
                    className="flex-1 bg-white border border-anotata-border rounded px-2 py-1 text-xs text-anotata-text focus:outline-none focus:border-anotata-roxo"
                  />
                  <button onClick={handleCreateNotebook} className="text-anotata-roxo hover:opacity-80">
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
            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs font-semibold uppercase text-anotata-text-suave hover:text-anotata-roxo transition-colors"
          >
            {tagsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            <Tag size={12} />
            <span>Tags</span>
            <span
              role="button"
              onClick={(e) => { e.stopPropagation(); setShowNewTag(true); }}
              className="ml-auto hover:text-anotata-goiaba cursor-pointer"
            >
              <Plus size={12} />
            </span>
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
                      ? 'bg-anotata-hover text-anotata-roxo font-medium'
                      : 'text-anotata-text hover:bg-anotata-hover'
                  }`}
                >
                  <span className="text-anotata-goiaba">#</span>
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
                    className="flex-1 bg-white border border-anotata-border rounded px-2 py-1 text-xs text-anotata-text focus:outline-none focus:border-anotata-roxo"
                  />
                  <button onClick={handleCreateTag} className="text-anotata-roxo hover:opacity-80">
                    <Plus size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      <div className="p-3 border-t border-anotata-border">
        <p className="text-[10px] text-anotata-muted text-center">ANOTATA v3.0 • Uso pessoal</p>
      </div>
    </aside>
  );
}

function NavBtn({ icon, label, count, active, onClick, highlight }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all ${
        active
          ? 'bg-anotata-roxo text-white shadow-sm'
          : highlight
            ? 'text-anotata-roxo hover:bg-anotata-hover font-medium'
            : 'text-anotata-text hover:bg-anotata-hover'
      }`}
    >
      {icon}
      <span>{label}</span>
      {count !== undefined && (
        <span className={`ml-auto text-xs ${active ? 'text-white/80' : 'text-anotata-muted'}`}>
          {count}
        </span>
      )}
    </button>
  );
}

function SidebarIconBtn({ icon, active, onClick, title }) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`p-2.5 rounded-lg transition-colors ${
        active
          ? 'bg-anotata-roxo text-white'
          : 'text-anotata-text-suave hover:bg-anotata-hover hover:text-anotata-roxo'
      }`}
    >
      {icon}
    </button>
  );
}
