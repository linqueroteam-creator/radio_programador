import React, { useState, useMemo } from 'react';
import {
  Plus, BookOpen, Star, Clock, TrendingUp, Sparkles,
  Search, ChevronRight, Edit3, X
} from 'lucide-react';
import NotebookCover from './NotebookCover';

const NOTEBOOK_COLORS = [
  '#5B2D8E', // roxo profundo
  '#7C4DC9', // roxo claro
  '#3D1B66', // roxo escuro
  '#E8637C', // goiaba
  '#C44862', // goiaba escuro
  '#F08AA0', // goiaba claro
  '#8B5FBF', // lavanda escura
  '#9B6FD9', // violeta
  '#D45A8A', // rosa profundo
];

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

function formatRelativeDate(iso) {
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function Home({ store, onOpenInsights, onCreateNote }) {
  const [showNewNotebook, setShowNewNotebook] = useState(false);
  const [newNotebookName, setNewNotebookName] = useState('');
  const [newNotebookColor, setNewNotebookColor] = useState(NOTEBOOK_COLORS[0]);

  // Saudação baseada na hora
  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 5) return 'Boa madrugada';
    if (h < 12) return 'Bom dia';
    if (h < 18) return 'Boa tarde';
    return 'Boa noite';
  }, []);

  // Cadernos com contagem de notas
  const notebooksWithCount = useMemo(() => {
    return store.notebooks.map(nb => ({
      ...nb,
      _noteCount: store.notes.filter(n => n.notebookId === nb.id && !n.isTrash).length,
    }));
  }, [store.notebooks, store.notes]);

  // Notas recentes
  const recentNotes = useMemo(() => {
    return [...store.notes]
      .filter(n => !n.isTrash)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 4);
  }, [store.notes]);

  // Stats rápidas
  const quickStats = useMemo(() => {
    const active = store.notes.filter(n => !n.isTrash);
    const favorites = active.filter(n => n.isFavorite).length;
    const totalWords = active.reduce((sum, n) => {
      return sum + stripHtml(n.content).split(/\s+/).filter(w => w).length;
    }, 0);
    return {
      total: active.length,
      favorites,
      notebooks: store.notebooks.length,
      totalWords,
    };
  }, [store.notes, store.notebooks]);

  const handleCreateNotebook = () => {
    if (newNotebookName.trim()) {
      store.createNotebook(newNotebookName.trim(), newNotebookColor);
      setNewNotebookName('');
      setNewNotebookColor(NOTEBOOK_COLORS[0]);
      setShowNewNotebook(false);
    }
  };

  const openNotebook = (nb) => {
    store.setCurrentView('notebook');
    store.setCurrentNotebookId(nb.id);
    store.setSelectedNoteId(null);
  };

  const openNote = (note) => {
    store.setCurrentView('all');
    store.setSelectedNoteId(note.id);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-anotata-bg">
      {/* Header com saudação e busca */}
      <div className="px-8 pt-8 pb-6 max-w-7xl mx-auto">
        <div className="flex items-start justify-between flex-wrap gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold text-anotata-text mb-1">
              {greeting} ✨
            </h1>
            <p className="text-sm text-anotata-text-suave">
              {quickStats.total === 0
                ? 'Que tal começar criando seu primeiro caderno?'
                : `Você tem ${quickStats.total} ${quickStats.total === 1 ? 'nota' : 'notas'} em ${quickStats.notebooks} ${quickStats.notebooks === 1 ? 'caderno' : 'cadernos'}.`
              }
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Botão Nova com modelo */}
            <button
              onClick={() => onCreateNote ? onCreateNote() : store.createNote()}
              className="flex items-center gap-2 px-4 py-2 bg-anotata-roxo text-white rounded-xl text-sm font-medium hover:bg-anotata-roxo-escuro transition-all shadow-sm hover:shadow-md"
              title="Nova anotação (com modelo)"
            >
              <Sparkles size={15} />
              <span>Nova com modelo</span>
            </button>

            {/* Botão Insights */}
            <button
              onClick={onOpenInsights}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-anotata-border rounded-xl text-sm text-anotata-text-suave hover:border-anotata-roxo hover:text-anotata-roxo transition-all shadow-sm"
              title="Ver estatísticas detalhadas"
            >
              <TrendingUp size={15} />
              <span>Insights</span>
            </button>

            {/* Busca rápida */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-anotata-muted" />
              <input
                type="text"
                placeholder="Buscar..."
                value={store.searchQuery}
                onChange={(e) => {
                  store.setSearchQuery(e.target.value);
                  if (e.target.value) {
                    store.setCurrentView('all');
                    store.setSelectedNoteId(null);
                  }
                }}
                className="bg-white border border-anotata-border rounded-xl pl-9 pr-3 py-2 text-sm text-anotata-text placeholder:text-anotata-muted focus:outline-none focus:border-anotata-roxo focus:ring-2 focus:ring-anotata-roxo/10 w-48"
              />
            </div>
          </div>
        </div>

        {/* Stats inline minimalistas */}
        <div className="flex items-center gap-6 text-xs text-anotata-text-suave">
          <span className="flex items-center gap-1.5">
            <BookOpen size={12} className="text-anotata-roxo" />
            <strong className="text-anotata-text">{quickStats.notebooks}</strong> cadernos
          </span>
          <span className="flex items-center gap-1.5">
            <Edit3 size={12} className="text-anotata-roxo" />
            <strong className="text-anotata-text">{quickStats.total}</strong> notas
          </span>
          <span className="flex items-center gap-1.5">
            <Star size={12} className="text-anotata-goiaba" />
            <strong className="text-anotata-text">{quickStats.favorites}</strong> favoritas
          </span>
          <span className="flex items-center gap-1.5">
            <Sparkles size={12} className="text-anotata-roxo" />
            <strong className="text-anotata-text">{quickStats.totalWords.toLocaleString('pt-BR')}</strong> palavras escritas
          </span>
        </div>
      </div>

      {/* Seção de Cadernos */}
      <div className="px-8 pb-12 max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-bold text-anotata-text">Seus cadernos</h2>
            <p className="text-xs text-anotata-text-suave mt-0.5">
              Cada caderno ganha uma capa única gerada automaticamente
            </p>
          </div>
          <button
            onClick={() => setShowNewNotebook(true)}
            className="flex items-center gap-2 px-4 py-2 bg-anotata-roxo text-white rounded-xl text-sm font-medium hover:bg-anotata-roxo-escuro transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5"
          >
            <Plus size={16} />
            Novo caderno
          </button>
        </div>

        {/* Grid de capas */}
        <div className="grid gap-6" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))' }}>
          {notebooksWithCount.map((nb) => (
            <NotebookCard
              key={nb.id}
              notebook={nb}
              onClick={() => openNotebook(nb)}
            />
          ))}

          {/* Card de adicionar novo caderno */}
          <button
            onClick={() => setShowNewNotebook(true)}
            className="group flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-anotata-border hover:border-anotata-roxo hover:bg-anotata-lavanda-clara transition-all"
            style={{ width: 200, height: 260 }}
          >
            <div className="w-14 h-14 rounded-full bg-anotata-lavanda-clara group-hover:bg-anotata-roxo group-hover:scale-110 transition-all flex items-center justify-center mb-3">
              <Plus size={24} className="text-anotata-roxo group-hover:text-white transition-colors" />
            </div>
            <p className="text-sm font-medium text-anotata-text-suave group-hover:text-anotata-roxo transition-colors">
              Criar caderno
            </p>
            <p className="text-[10px] text-anotata-muted mt-0.5">
              Capa gerada automaticamente
            </p>
          </button>
        </div>
      </div>

      {/* Notas recentes */}
      {recentNotes.length > 0 && (
        <div className="px-8 pb-12 max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-anotata-text flex items-center gap-2">
              <Clock size={18} className="text-anotata-roxo" />
              Notas recentes
            </h2>
            <button
              onClick={() => { store.setCurrentView('all'); store.setSelectedNoteId(null); }}
              className="text-xs text-anotata-roxo hover:underline flex items-center gap-1"
            >
              Ver todas
              <ChevronRight size={12} />
            </button>
          </div>

          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {recentNotes.map(note => {
              const nb = store.notebooks.find(n => n.id === note.notebookId);
              return (
                <button
                  key={note.id}
                  onClick={() => openNote(note)}
                  className="group bg-white border border-anotata-border rounded-xl p-4 text-left hover:border-anotata-roxo hover:shadow-md transition-all hover:-translate-y-0.5"
                >
                  <div className="flex items-start gap-2 mb-2">
                    {nb && (
                      <div
                        className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                        style={{
                          backgroundColor: nb.color + '20',
                          color: nb.color,
                        }}
                      >
                        {nb.name}
                      </div>
                    )}
                    {note.isFavorite && (
                      <Star size={11} className="text-yellow-500 fill-yellow-500 ml-auto mt-0.5" />
                    )}
                  </div>
                  <h3 className="font-semibold text-anotata-text text-sm mb-1 truncate group-hover:text-anotata-roxo transition-colors">
                    {note.title || 'Sem título'}
                  </h3>
                  <p className="text-xs text-anotata-text-suave line-clamp-2 leading-relaxed">
                    {stripHtml(note.content) || 'Nota vazia...'}
                  </p>
                  <p className="text-[10px] text-anotata-muted mt-2">
                    {formatRelativeDate(note.updatedAt)}
                  </p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Estado vazio (primeiro acesso) */}
      {recentNotes.length === 0 && quickStats.total === 0 && (
        <div className="px-8 pb-12 max-w-2xl mx-auto text-center">
          <div className="bg-white border border-anotata-border rounded-2xl p-10">
            <div className="w-16 h-16 mx-auto bg-anotata-lavanda-clara rounded-2xl flex items-center justify-center mb-4">
              <Edit3 size={28} className="text-anotata-roxo" />
            </div>
            <h3 className="text-lg font-bold text-anotata-text mb-2">
              Vamos criar sua primeira nota?
            </h3>
            <p className="text-sm text-anotata-text-suave mb-5">
              Escolha um caderno acima e clique em "Nova nota" pra começar a escrever.
            </p>
            <button
              onClick={() => onCreateNote ? onCreateNote() : store.createNote()}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-anotata-roxo text-white rounded-xl font-medium hover:bg-anotata-roxo-escuro transition-colors shadow-sm"
            >
              <Sparkles size={16} />
              Criar primeira nota
            </button>
          </div>
        </div>
      )}

      {/* Modal: criar caderno */}
      {showNewNotebook && (
        <NewNotebookModal
          name={newNotebookName}
          color={newNotebookColor}
          onChangeName={setNewNotebookName}
          onChangeColor={setNewNotebookColor}
          onConfirm={handleCreateNotebook}
          onCancel={() => { setShowNewNotebook(false); setNewNotebookName(''); }}
        />
      )}
    </div>
  );
}

function NotebookCard({ notebook, onClick }) {
  return (
    <button
      onClick={onClick}
      className="group transition-all duration-300 hover:-translate-y-1.5 focus:outline-none"
    >
      <NotebookCover
        notebook={notebook}
        size="md"
        className="transition-shadow duration-300 group-hover:shadow-2xl"
      />
    </button>
  );
}

function NewNotebookModal({ name, color, onChangeName, onChangeColor, onConfirm, onCancel }) {
  // Caderno preview
  const previewNotebook = {
    id: 'preview-' + name + color,
    name: name || 'Novo caderno',
    color: color,
    _noteCount: 0,
  };

  return (
    <div className="fixed inset-0 bg-anotata-text/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-anotata-border flex items-center justify-between">
          <h3 className="text-lg font-bold text-anotata-text">Novo caderno</h3>
          <button
            onClick={onCancel}
            className="p-1 text-anotata-muted hover:text-anotata-text rounded hover:bg-anotata-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Preview da capa */}
        <div className="p-6 bg-anotata-lavanda-clara flex justify-center">
          <NotebookCover notebook={previewNotebook} size="md" />
        </div>

        {/* Form */}
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-anotata-text-suave mb-1.5 block">
              Nome do caderno
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => onChangeName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && name.trim()) onConfirm();
                if (e.key === 'Escape') onCancel();
              }}
              placeholder="Ex: Ideias, Trabalho, Pessoal..."
              className="w-full bg-white border border-anotata-border rounded-lg px-3 py-2.5 text-sm text-anotata-text placeholder:text-anotata-muted focus:outline-none focus:border-anotata-roxo focus:ring-2 focus:ring-anotata-roxo/10"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-anotata-text-suave mb-2 block">
              Cor da capa
            </label>
            <div className="grid grid-cols-9 gap-2">
              {NOTEBOOK_COLORS.map(c => (
                <button
                  key={c}
                  onClick={() => onChangeColor(c)}
                  className={`aspect-square rounded-lg transition-all ${
                    color === c
                      ? 'ring-2 ring-offset-2 ring-anotata-roxo scale-110'
                      : 'hover:scale-105'
                  }`}
                  style={{ backgroundColor: c }}
                  title={c}
                />
              ))}
            </div>
            <p className="text-[10px] text-anotata-muted mt-2">
              💡 A capa ganha um padrão único automaticamente
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-anotata-lavanda-clara border-t border-anotata-border flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-anotata-text-suave hover:text-anotata-text rounded-lg hover:bg-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            disabled={!name.trim()}
            className="px-5 py-2 bg-anotata-roxo text-white text-sm font-medium rounded-lg hover:bg-anotata-roxo-escuro disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Criar caderno
          </button>
        </div>
      </div>
    </div>
  );
}
