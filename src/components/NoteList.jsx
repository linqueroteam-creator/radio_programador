import React, { useState, useMemo } from 'react';
import { Plus, Star, Trash2, RotateCcw, Copy, MoreVertical, Sparkles } from 'lucide-react';
import searchEngine from '../engine/SearchEngine';
import { runCollection, COLLECTIONS } from '../engine/CollectionsEngine';
import { NOTE_TYPES } from '../engine/RulesEngine';
import EmptyState from './EmptyState';

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').slice(0, 120);
}

function formatDate(isoStr) {
  const d = new Date(isoStr);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'Agora';
  if (mins < 60) return `${mins}min atrás`;
  if (hours < 24) return `${hours}h atrás`;
  if (days < 7) return `${days}d atrás`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function NoteCard({ note, isSelected, store, reason }) {
  const [showMenu, setShowMenu] = useState(false);
  const typeMeta = NOTE_TYPES[note.type] || NOTE_TYPES.rascunho;

  return (
    <div
      onClick={() => store.setSelectedNoteId(note.id)}
      className={`relative p-3 rounded-lg cursor-pointer border transition-all group ${
        isSelected
          ? 'border-anotata-roxo bg-anotata-lavanda-clara shadow-sm'
          : 'border-transparent hover:border-anotata-border hover:bg-white'
      }`}
    >
      <button
        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
        className={`absolute top-2 right-2 text-anotata-muted hover:text-anotata-roxo transition-opacity ${
          showMenu ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        }`}
      >
        <MoreVertical size={14} />
      </button>

      {showMenu && (
        <div className="absolute top-6 right-2 bg-white border border-anotata-border rounded-lg shadow-xl z-50 py-1 min-w-[160px]">
          {!note.isTrash && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); store.toggleFavorite(note.id); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-anotata-text hover:bg-anotata-hover"
              >
                <Star size={12} className={note.isFavorite ? 'text-yellow-500 fill-yellow-500' : ''} />
                {note.isFavorite ? 'Desfavoritar' : 'Favoritar'}
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); store.duplicateNote(note.id); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-anotata-text hover:bg-anotata-hover"
              >
                <Copy size={12} />
                Duplicar
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); store.moveToTrash(note.id); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-anotata-goiaba hover:bg-anotata-hover"
              >
                <Trash2 size={12} />
                Mover p/ Lixeira
              </button>
            </>
          )}
          {note.isTrash && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); store.restoreNote(note.id); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-anotata-roxo hover:bg-anotata-hover"
              >
                <RotateCcw size={12} />
                Restaurar
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); store.deleteNotePermanently(note.id); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-anotata-goiaba hover:bg-anotata-hover"
              >
                <Trash2 size={12} />
                Excluir definitivo
              </button>
            </>
          )}
        </div>
      )}

      <div className="flex items-start gap-1.5 pr-6">
        <span className="text-xs mt-0.5">{typeMeta.icon}</span>
        <h3 className="text-sm font-medium text-anotata-text truncate flex-1">
          {note.title || 'Nota sem título'}
          {note.isFavorite && <Star size={10} className="inline ml-1 text-yellow-500 fill-yellow-500" />}
          {note.isPinned && <span className="ml-1 text-anotata-roxo">📌</span>}
        </h3>
      </div>

      <p className="text-xs text-anotata-text-suave mt-1 line-clamp-2">
        {stripHtml(note.content) || 'Nota vazia...'}
      </p>

      {/* Motivo da coleção, quando aplicável */}
      {reason && (
        <div className="mt-1.5 inline-flex items-center gap-1 text-[10px] text-anotata-roxo bg-anotata-lavanda-clara px-1.5 py-0.5 rounded">
          <Sparkles size={9} />
          <span>{reason}</span>
        </div>
      )}

      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] text-anotata-muted">{formatDate(note.updatedAt)}</span>
        {note.tags.length > 0 && (
          <div className="flex gap-1 overflow-hidden">
            {note.tags.slice(0, 2).map(t => (
              <span key={t} className="text-[9px] bg-anotata-lavanda text-anotata-roxo px-1.5 py-0.5 rounded">
                #{t}
              </span>
            ))}
            {note.tags.length > 2 && (
              <span className="text-[9px] text-anotata-muted">+{note.tags.length - 2}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function NoteList({ store, onCreateNote }) {
  const { searchQuery } = store;

  // === LISTA DE NOTAS (com busca aproximada quando há query) ===
  const notes = useMemo(() => {
    // Se está numa coleção, mostrar essa coleção
    if (store.currentView === 'collection' && store.currentCollectionId) {
      const allActive = store.notes;
      return runCollection(store.currentCollectionId, allActive);
    }

    // Se tem busca, usar busca aproximada
    if (searchQuery && searchQuery.trim().length >= 2) {
      const allNotes = store.notes;
      const includeArchived = store.currentView === 'archived';
      const includeTrash = store.currentView === 'trash';
      const results = searchEngine.search(allNotes, searchQuery, {
        limit: 100,
        includeArchived,
        includeTrash,
      });
      return results.map(r => r.note);
    }

    // Caso contrário, usa o filtro padrão
    return store.filteredNotes;
  }, [
    store.currentView,
    store.currentCollectionId,
    store.notes,
    store.filteredNotes,
    searchQuery,
  ]);

  const isCollection = store.currentView === 'collection';
  const isSearch = searchQuery && searchQuery.trim().length >= 2;

  const getViewTitle = () => {
    if (isSearch) return `Busca: "${searchQuery}"`;
    if (isCollection) {
      const c = COLLECTIONS[store.currentCollectionId];
      return c ? `${c.icon} ${c.name}` : 'Coleção';
    }
    switch (store.currentView) {
      case 'all': return 'Todas as Notas';
      case 'favorites': return 'Favoritos';
      case 'pinned': return 'Fixadas';
      case 'archived': return 'Arquivadas';
      case 'trash': return 'Lixeira';
      case 'notebook':
        const nb = store.getNotebookById(store.currentNotebookId);
        return nb ? nb.name : 'Caderno';
      case 'tag': return `#${store.currentTagFilter}`;
      default: return 'Notas';
    }
  };

  const getViewSubtitle = () => {
    if (isSearch) {
      return notes.length === 0
        ? 'Nenhum resultado'
        : `${notes.length} resultado${notes.length !== 1 ? 's' : ''}`;
    }
    if (isCollection) {
      const c = COLLECTIONS[store.currentCollectionId];
      return c?.description || '';
    }
    return `${notes.length} nota${notes.length !== 1 ? 's' : ''}`;
  };

  const showActionButton = !isCollection && store.currentView !== 'trash' && store.currentView !== 'archived';

  return (
    <div className="w-80 min-w-[280px] border-r border-anotata-border flex flex-col h-full bg-anotata-bg">
      <div className="p-4 border-b border-anotata-border flex items-center justify-between bg-white">
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-semibold text-anotata-text truncate">{getViewTitle()}</h2>
          <p className="text-xs text-anotata-muted truncate">{getViewSubtitle()}</p>
        </div>
        {showActionButton && (
          <button
            onClick={() => onCreateNote ? onCreateNote() : store.createNote(store.currentView === 'notebook' ? store.currentNotebookId : 'default')}
            className="p-2 bg-anotata-roxo rounded-lg hover:bg-anotata-roxo-escuro transition-colors shadow-sm shrink-0 ml-2"
            title="Nova nota (escolha modelo)"
          >
            <Plus size={16} className="text-white" />
          </button>
        )}
        {store.currentView === 'trash' && notes.length > 0 && (
          <button
            onClick={() => { if (confirm('Esvaziar toda a lixeira?')) store.emptyTrash(); }}
            className="text-xs text-anotata-goiaba hover:text-anotata-goiaba-escuro px-2 py-1 border border-anotata-goiaba rounded shrink-0 ml-2"
          >
            Esvaziar
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {notes.length === 0 ? (
          <EmptyState
            icon={isSearch ? '🔍' : isCollection ? '✨' : '📝'}
            title={
              isSearch ? 'Nenhum resultado'
                : isCollection ? 'Nenhuma nota nesta coleção'
                : store.currentView === 'trash' ? 'Lixeira vazia'
                : store.currentView === 'archived' ? 'Nenhuma nota arquivada'
                : 'Nenhuma nota aqui'
            }
            message={
              isSearch ? 'Tente outras palavras ou verifique a ortografia. A busca é aproximada — encontra mesmo com erros.'
                : isCollection ? 'Quando alguma nota se encaixar nas regras desta coleção, ela aparece aqui sozinha.'
                : store.currentView === 'trash' ? 'Suas notas excluídas aparecem aqui.'
                : 'Crie sua primeira anotação para começar.'
            }
            action={showActionButton ? (() => onCreateNote ? onCreateNote() : store.createNote()) : undefined}
            actionLabel={showActionButton ? 'Criar anotação' : undefined}
          />
        ) : (
          notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              isSelected={store.selectedNoteId === note.id}
              store={store}
              reason={note._collectionReason}
            />
          ))
        )}
      </div>
    </div>
  );
}
