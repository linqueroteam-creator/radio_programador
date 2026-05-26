import React from 'react';
import { Plus, Star, Trash2, RotateCcw, Copy, MoreVertical } from 'lucide-react';
import { useState } from 'react';

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

function NoteCard({ note, isSelected, store }) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <div
      onClick={() => store.setSelectedNoteId(note.id)}
      className={`relative p-3 rounded-lg cursor-pointer border transition-all ${
        isSelected
          ? 'border-anotata-accent bg-anotata-hover'
          : 'border-transparent hover:border-anotata-border hover:bg-anotata-bg'
      }`}
    >
      {/* Menu de contexto */}
      <button
        onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
        className="absolute top-2 right-2 text-anotata-muted hover:text-anotata-text opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ opacity: showMenu ? 1 : undefined }}
      >
        <MoreVertical size={14} />
      </button>

      {showMenu && (
        <div className="absolute top-6 right-2 bg-anotata-sidebar border border-anotata-border rounded-lg shadow-xl z-50 py-1 min-w-[140px]">
          {!note.isTrash && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); store.toggleFavorite(note.id); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-anotata-text hover:bg-anotata-hover"
              >
                <Star size={12} className={note.isFavorite ? 'text-yellow-400 fill-yellow-400' : ''} />
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
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-anotata-hover"
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
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-anotata-green hover:bg-anotata-hover"
              >
                <RotateCcw size={12} />
                Restaurar
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); store.deleteNotePermanently(note.id); setShowMenu(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-red-400 hover:bg-anotata-hover"
              >
                <Trash2 size={12} />
                Excluir definitivo
              </button>
            </>
          )}
        </div>
      )}

      {/* Título */}
      <h3 className="text-sm font-medium text-anotata-text truncate pr-6">
        {note.title || 'Nota sem título'}
        {note.isFavorite && <Star size={10} className="inline ml-1 text-yellow-400 fill-yellow-400" />}
      </h3>

      {/* Preview */}
      <p className="text-xs text-anotata-muted mt-1 line-clamp-2">
        {stripHtml(note.content) || 'Nota vazia...'}
      </p>

      {/* Meta */}
      <div className="flex items-center gap-2 mt-2">
        <span className="text-[10px] text-anotata-muted">{formatDate(note.updatedAt)}</span>
        {note.tags.length > 0 && (
          <div className="flex gap-1 overflow-hidden">
            {note.tags.slice(0, 2).map(t => (
              <span key={t} className="text-[9px] bg-anotata-accent2 bg-opacity-30 text-anotata-accent px-1.5 py-0.5 rounded">
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

export default function NoteList({ store }) {
  const notes = store.filteredNotes;

  const getViewTitle = () => {
    switch (store.currentView) {
      case 'all': return 'Todas as Notas';
      case 'favorites': return 'Favoritos';
      case 'trash': return 'Lixeira';
      case 'notebook':
        const nb = store.getNotebookById(store.currentNotebookId);
        return nb ? nb.name : 'Caderno';
      case 'tag': return `#${store.currentTagFilter}`;
      default: return 'Notas';
    }
  };

  return (
    <div className="w-80 min-w-[280px] border-r border-anotata-border flex flex-col h-full bg-anotata-bg">
      {/* Header */}
      <div className="p-4 border-b border-anotata-border flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-anotata-text">{getViewTitle()}</h2>
          <p className="text-xs text-anotata-muted">{notes.length} nota{notes.length !== 1 ? 's' : ''}</p>
        </div>
        {store.currentView !== 'trash' && (
          <button
            onClick={() => store.createNote(store.currentView === 'notebook' ? store.currentNotebookId : 'default')}
            className="p-2 bg-anotata-accent rounded-lg hover:opacity-90 transition-opacity"
            title="Nova nota"
          >
            <Plus size={16} className="text-white" />
          </button>
        )}
        {store.currentView === 'trash' && notes.length > 0 && (
          <button
            onClick={() => { if (confirm('Esvaziar toda a lixeira?')) store.emptyTrash(); }}
            className="text-xs text-red-400 hover:text-red-300 px-2 py-1 border border-red-400 rounded"
          >
            Esvaziar
          </button>
        )}
      </div>

      {/* Lista de notas */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {notes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-4">
            <p className="text-anotata-muted text-sm">
              {store.currentView === 'trash' ? 'Lixeira vazia' : 'Nenhuma nota aqui'}
            </p>
            {store.currentView !== 'trash' && (
              <button
                onClick={() => store.createNote(store.currentView === 'notebook' ? store.currentNotebookId : 'default')}
                className="mt-3 text-sm text-anotata-accent hover:underline"
              >
                + Criar primeira nota
              </button>
            )}
          </div>
        ) : (
          notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              isSelected={store.selectedNoteId === note.id}
              store={store}
            />
          ))
        )}
      </div>
    </div>
  );
}
