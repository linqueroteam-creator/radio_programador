import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText, Star, Trash2, BookOpen, Tag, Plus,
  ChevronDown, ChevronRight, Search, Sparkles, X,
  ChevronLeft, Menu, SpellCheck,
  Home as HomeIcon, TrendingUp, Layers, Pin, Archive,
  Clock, Command, LogOut
} from 'lucide-react';
import { COLLECTION_LIST, countCollections } from '../engine/CollectionsEngine';
import NotificationsBell from './NotificationsBell';

/**
 * ============================================================================
 *  Sidebar — menu lateral com 3 modos:
 *  ----------------------------------------------------------------------------
 *  1. Desktop expandido   → barra de 256px à esquerda, fixa
 *  2. Desktop recolhido   → faixa de 56px só com ícones (toggle por seta)
 *  3. Mobile (< 768px)    → gaveta sobreposta com backdrop, vinda da esquerda;
 *                           acessada por um botão hambúrguer no header de cada
 *                           tela. Inclui "Comandos" e "Sair" no rodapé.
 *
 *  Props:
 *    store, isCollapsed, onToggle    — usados em desktop
 *    isMobile (bool)                 — ativa modo gaveta
 *    isOpenMobile (bool)             — gaveta aberta?
 *    onCloseMobile ()                — fecha a gaveta
 *    onLogout ()                     — só usado em mobile (rodapé)
 *    onOpenCommandPalette ()         — só usado em mobile (rodapé)
 * ============================================================================
 */
export default function Sidebar({
  store, isCollapsed, onToggle,
  isMobile = false, isOpenMobile = false, onCloseMobile,
  onLogout, onOpenCommandPalette, onOpenNote,
}) {
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

  // Esc fecha a gaveta no mobile
  useEffect(() => {
    if (!isMobile || !isOpenMobile) return undefined;
    const onKey = (e) => { if (e.key === 'Escape' && onCloseMobile) onCloseMobile(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isMobile, isOpenMobile, onCloseMobile]);

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

  // === MOBILE: gaveta com backdrop ===
  if (isMobile) {
    return (
      <>
        {/* Backdrop preto translúcido */}
        <div
          onClick={onCloseMobile}
          className={`fixed inset-0 bg-black/40 z-40 transition-opacity duration-300 md:hidden ${
            isOpenMobile ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
          aria-hidden="true"
        />
        {/* Gaveta */}
        <aside
          role="dialog"
          aria-modal={isOpenMobile}
          aria-label="Menu de navegação"
          aria-hidden={!isOpenMobile}
          className={`fixed top-0 left-0 h-full w-72 max-w-[85vw] bg-anotata-sidebar border-r border-anotata-border z-50 flex flex-col transition-transform duration-300 ease-in-out md:hidden ${
            isOpenMobile ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <ExpandedSidebar
            store={store}
            visibleCollections={visibleCollections}
            notebooksOpen={notebooksOpen}
            setNotebooksOpen={setNotebooksOpen}
            tagsOpen={tagsOpen}
            setTagsOpen={setTagsOpen}
            collectionsOpen={collectionsOpen}
            setCollectionsOpen={setCollectionsOpen}
            showNewNotebook={showNewNotebook}
            setShowNewNotebook={setShowNewNotebook}
            newNotebookName={newNotebookName}
            setNewNotebookName={setNewNotebookName}
            handleCreateNotebook={handleCreateNotebook}
            showNewTag={showNewTag}
            setShowNewTag={setShowNewTag}
            newTagName={newTagName}
            setNewTagName={setNewTagName}
            handleCreateTag={handleCreateTag}
            totalNotes={totalNotes}
            favCount={favCount}
            trashCount={trashCount}
            archivedCount={archivedCount}
            isMobile={true}
            onCloseMobile={onCloseMobile}
            onLogout={onLogout}
            onOpenCommandPalette={onOpenCommandPalette}
            onOpenNote={onOpenNote}
          />
        </aside>
      </>
    );
  }

  // === DESKTOP RECOLHIDO ===
  if (isCollapsed) {
    return (
      <aside className="w-14 bg-anotata-sidebar border-r border-anotata-border flex flex-col h-full transition-all duration-300 ease-in-out">
        <div className="p-3 border-b border-anotata-border flex justify-center">
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-anotata-hover text-anotata-roxo transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anotata-roxo/50"
            aria-label="Expandir menu lateral"
            title="Expandir menu"
          >
            <Menu size={16} aria-hidden="true" />
          </button>
        </div>

        {/* Sino de lembretes — também visível com a sidebar recolhida (Pacote B) */}
        <div className="px-2 py-2 border-b border-anotata-border flex justify-center">
          <NotificationsBell store={store} onOpenNote={onOpenNote} />
        </div>

        <nav className="flex-1 py-3 flex flex-col items-center gap-1 overflow-y-auto">
          <SidebarIconBtn
            icon={<HomeIcon size={16} />}
            active={store.currentView === 'home'}
            onClick={() => { store.setCurrentView('home'); store.setSelectedNoteId(null); }}
            label="Início"
          />
          <SidebarIconBtn
            icon={<FileText size={16} />}
            active={store.currentView === 'all'}
            onClick={() => { store.setCurrentView('all'); store.setSelectedNoteId(null); }}
            label={`Todas as notas (${totalNotes})`}
          />
          <SidebarIconBtn
            icon={<Star size={16} />}
            active={store.currentView === 'favorites'}
            onClick={() => { store.setCurrentView('favorites'); store.setSelectedNoteId(null); }}
            label={`Favoritos (${favCount})`}
          />
          <SidebarIconBtn
            icon={<Layers size={16} />}
            active={store.currentView === 'collection'}
            onClick={() => {
              store.setCurrentView('collection');
              store.setCurrentCollectionId('recentes');
              store.setSelectedNoteId(null);
            }}
            label="Coleções automáticas"
          />
          <SidebarIconBtn
            icon={<SpellCheck size={16} />}
            active={store.currentView === 'corretor'}
            onClick={() => { store.setCurrentView('corretor'); store.setSelectedNoteId(null); }}
            label="Corretor Ortográfico"
          />
          <SidebarIconBtn
            icon={<Clock size={16} />}
            active={store.currentView === 'timeline'}
            onClick={() => { store.setCurrentView('timeline'); store.setSelectedNoteId(null); }}
            label="Linha do tempo"
          />
          <SidebarIconBtn
            icon={<TrendingUp size={16} />}
            active={store.currentView === 'insights'}
            onClick={() => { store.setCurrentView('insights'); store.setSelectedNoteId(null); }}
            label="Insights / Estatísticas"
          />
          <SidebarIconBtn
            icon={<Trash2 size={16} />}
            active={store.currentView === 'trash'}
            onClick={() => { store.setCurrentView('trash'); store.setSelectedNoteId(null); }}
            label={`Lixeira (${trashCount})`}
          />
        </nav>
      </aside>
    );
  }

  // === DESKTOP EXPANDIDO ===
  return (
    <aside className="w-64 min-w-[240px] bg-anotata-sidebar border-r border-anotata-border flex flex-col h-full transition-all duration-300 ease-in-out">
      <ExpandedSidebar
        store={store}
        visibleCollections={visibleCollections}
        notebooksOpen={notebooksOpen}
        setNotebooksOpen={setNotebooksOpen}
        tagsOpen={tagsOpen}
        setTagsOpen={setTagsOpen}
        collectionsOpen={collectionsOpen}
        setCollectionsOpen={setCollectionsOpen}
        showNewNotebook={showNewNotebook}
        setShowNewNotebook={setShowNewNotebook}
        newNotebookName={newNotebookName}
        setNewNotebookName={setNewNotebookName}
        handleCreateNotebook={handleCreateNotebook}
        showNewTag={showNewTag}
        setShowNewTag={setShowNewTag}
        newTagName={newTagName}
        setNewTagName={setNewTagName}
        handleCreateTag={handleCreateTag}
        totalNotes={totalNotes}
        favCount={favCount}
        trashCount={trashCount}
        archivedCount={archivedCount}
        isMobile={false}
        onToggle={onToggle}
        onOpenNote={onOpenNote}
      />
    </aside>
  );
}

/**
 * Conteúdo expandido reaproveitável entre desktop e mobile.
 * No mobile, mostra um botão X de fechar e adiciona "Comandos" + "Sair"
 * no rodapé. No desktop, mostra a setinha de recolher.
 */
function ExpandedSidebar(props) {
  const {
    store, visibleCollections,
    notebooksOpen, setNotebooksOpen,
    tagsOpen, setTagsOpen,
    collectionsOpen, setCollectionsOpen,
    showNewNotebook, setShowNewNotebook,
    newNotebookName, setNewNotebookName, handleCreateNotebook,
    showNewTag, setShowNewTag,
    newTagName, setNewTagName, handleCreateTag,
    totalNotes, favCount, trashCount, archivedCount,
    isMobile, onCloseMobile, onLogout, onOpenCommandPalette,
    onToggle, onOpenNote,
  } = props;

  return (
    <>
      <div className="p-4 border-b border-anotata-border flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-anotata-roxo tracking-wide">ANOTATA</h1>
          <p className="text-xs text-anotata-muted mt-0.5">Suas anotações, seu jeito</p>
        </div>
        {/* Sino de lembretes — sempre visível no topo da sidebar (Pacote B) */}
        <div className="shrink-0 -mr-1">
          <NotificationsBell store={store} onOpenNote={(noteId) => {
            if (onOpenNote) onOpenNote(noteId);
            if (isMobile && onCloseMobile) onCloseMobile();
          }} />
        </div>
        {isMobile ? (
          <button
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg hover:bg-anotata-hover text-anotata-text-suave transition-colors -mr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anotata-roxo/50 shrink-0"
            aria-label="Fechar menu"
            title="Fechar"
          >
            <X size={16} aria-hidden="true" />
          </button>
        ) : (
          <button
            onClick={onToggle}
            className="p-1.5 rounded-lg hover:bg-anotata-hover text-anotata-text-suave transition-colors -mr-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anotata-roxo/50 shrink-0"
            aria-label="Recolher menu"
            title="Recolher menu"
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
        )}
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
              aria-label="Limpar busca"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2">
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

        <NavBtn
          icon={<Clock size={16} />}
          label="Linha do tempo"
          active={store.currentView === 'timeline'}
          onClick={() => { store.setCurrentView('timeline'); store.setSelectedNoteId(null); }}
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
          disabled
        >
          <Sparkles size={16} />
          <span>Assistente IA</span>
          <span className="ml-auto text-2xs bg-anotata-roxo px-1.5 py-0.5 rounded text-white">Em breve</span>
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
              aria-label="Criar caderno"
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
                  <button onClick={handleCreateNotebook} className="text-anotata-roxo hover:opacity-80" aria-label="Confirmar">
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
              aria-label="Criar tag"
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
                  <button onClick={handleCreateTag} className="text-anotata-roxo hover:opacity-80" aria-label="Confirmar">
                    <Plus size={14} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* === RODAPÉ === */}
      {isMobile ? (
        // Mobile: Comandos + Sair como itens de menu (já que os botões fixos estão escondidos)
        <div className="border-t border-anotata-border p-2 space-y-1">
          {onOpenCommandPalette && (
            <button
              onClick={() => { onOpenCommandPalette(); if (onCloseMobile) onCloseMobile(); }}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-anotata-text hover:bg-anotata-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anotata-roxo/50"
            >
              <Command size={16} aria-hidden="true" />
              <span>Central de comandos</span>
            </button>
          )}
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-anotata-text-suave hover:text-anotata-goiaba hover:bg-anotata-hover transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anotata-goiaba/50"
            >
              <LogOut size={16} aria-hidden="true" />
              <span>Sair do ANOTATA</span>
            </button>
          )}
          <p className="text-2xs text-anotata-muted text-center pt-2">ANOTATA v3.0 • Uso pessoal</p>
        </div>
      ) : (
        <div className="p-3 border-t border-anotata-border">
          <p className="text-2xs text-anotata-muted text-center">ANOTATA v3.0 • Uso pessoal</p>
        </div>
      )}
    </>
  );
}

function NavBtn({ icon, label, count, active, onClick, highlight }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anotata-roxo/50 ${
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

function SidebarIconBtn({ icon, active, onClick, label }) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`p-2.5 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anotata-roxo/50 ${
        active
          ? 'bg-anotata-roxo text-white'
          : 'text-anotata-text-suave hover:bg-anotata-hover hover:text-anotata-roxo'
      }`}
    >
      {icon}
    </button>
  );
}
