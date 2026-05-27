import React, { useState, useMemo } from 'react';
import { X, Search, Link2, Check } from 'lucide-react';
import { NOTE_TYPES } from '../engine/RulesEngine';

const REASON_PRESETS = [
  'Relacionada ao mesmo projeto',
  'Continuação desta ideia',
  'Referência complementar',
  'Decisão ligada a esta nota',
  'Mesma pessoa ou contexto',
  'Solução para o mesmo problema',
];

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
}

export default function ConnectionModal({ currentNote, store, onClose }) {
  const [search, setSearch] = useState('');
  const [selectedNoteId, setSelectedNoteId] = useState(null);
  const [reason, setReason] = useState('');
  const [step, setStep] = useState('search'); // 'search' | 'reason'

  // Notas disponíveis para conectar
  const availableNotes = useMemo(() => {
    if (!currentNote) return [];
    const connectedIds = (currentNote.manualConnections || []).map(c =>
      typeof c === 'string' ? c : c.noteId
    );
    return store.notes.filter(n =>
      n.id !== currentNote.id &&
      !n.isTrash &&
      !connectedIds.includes(n.id)
    );
  }, [store.notes, currentNote]);

  // Filtra por busca
  const filteredNotes = useMemo(() => {
    if (!search.trim()) return availableNotes.slice(0, 30);
    const q = search.toLowerCase();
    return availableNotes
      .filter(n =>
        (n.title && n.title.toLowerCase().includes(q)) ||
        (n.content && n.content.toLowerCase().includes(q)) ||
        (n.tags || []).some(t => t.toLowerCase().includes(q))
      )
      .slice(0, 30);
  }, [availableNotes, search]);

  const selectedNote = store.notes.find(n => n.id === selectedNoteId);

  const handleConfirm = () => {
    if (!selectedNoteId) return;
    store.connectNotes(currentNote.id, selectedNoteId, reason);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-anotata-text/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[80vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-anotata-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-anotata-roxo/10 flex items-center justify-center">
              <Link2 size={16} className="text-anotata-roxo" />
            </div>
            <div>
              <h3 className="text-base font-bold text-anotata-text">
                {step === 'search' ? 'Conectar com outra nota' : 'Motivo da conexão'}
              </h3>
              <p className="text-[11px] text-anotata-muted">
                {step === 'search' ? 'Escolha uma nota para conectar' : 'Opcional — explica a relação'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-anotata-muted hover:text-anotata-text rounded hover:bg-anotata-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Conteúdo - Busca */}
        {step === 'search' && (
          <>
            <div className="p-4 border-b border-anotata-border">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-anotata-muted" />
                <input
                  type="text"
                  autoFocus
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar por título, conteúdo ou tag..."
                  className="w-full pl-9 pr-3 py-2 bg-anotata-lavanda-clara border border-anotata-border rounded-lg text-sm text-anotata-text placeholder:text-anotata-muted focus:outline-none focus:border-anotata-roxo focus:ring-2 focus:ring-anotata-roxo/10"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filteredNotes.length === 0 ? (
                <div className="p-8 text-center">
                  <p className="text-sm text-anotata-muted">
                    {availableNotes.length === 0
                      ? 'Não há outras notas disponíveis para conectar.'
                      : 'Nenhuma nota encontrada com esse termo.'
                    }
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-anotata-border">
                  {filteredNotes.map(note => {
                    const typeMeta = NOTE_TYPES[note.type] || NOTE_TYPES.rascunho;
                    const isSelected = selectedNoteId === note.id;
                    return (
                      <button
                        key={note.id}
                        onClick={() => setSelectedNoteId(note.id)}
                        className={`w-full text-left p-3 hover:bg-anotata-hover transition-colors ${
                          isSelected ? 'bg-anotata-lavanda-clara' : ''
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-sm shrink-0"
                            style={{ backgroundColor: typeMeta.color + '20' }}
                          >
                            {typeMeta.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-medium text-anotata-text truncate">
                                {note.title || 'Sem título'}
                              </h4>
                              {isSelected && (
                                <Check size={14} className="text-anotata-roxo shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-anotata-text-suave truncate mt-0.5">
                              {stripHtml(note.content) || 'Vazia...'}
                            </p>
                            {(note.tags || []).length > 0 && (
                              <div className="flex gap-1 mt-1">
                                {note.tags.slice(0, 3).map(t => (
                                  <span key={t} className="text-[9px] bg-anotata-lavanda text-anotata-roxo px-1.5 py-0.5 rounded">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-anotata-border flex items-center justify-end gap-2 bg-anotata-lavanda-clara">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-anotata-text-suave hover:text-anotata-text rounded-lg hover:bg-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => setStep('reason')}
                disabled={!selectedNoteId}
                className="px-4 py-2 bg-anotata-roxo text-white text-sm font-medium rounded-lg hover:bg-anotata-roxo-escuro disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Próximo →
              </button>
            </div>
          </>
        )}

        {/* Conteúdo - Motivo */}
        {step === 'reason' && (
          <>
            <div className="p-5 flex-1 overflow-y-auto">
              {selectedNote && (
                <div className="mb-4 p-3 bg-anotata-lavanda-clara rounded-lg">
                  <div className="text-[10px] uppercase font-semibold text-anotata-roxo mb-1">Conectando com:</div>
                  <div className="text-sm font-medium text-anotata-text">
                    {selectedNote.title || 'Sem título'}
                  </div>
                </div>
              )}

              <label className="text-xs font-medium text-anotata-text-suave mb-2 block">
                Motivo (opcional)
              </label>

              {/* Presets */}
              <div className="space-y-1 mb-3">
                {REASON_PRESETS.map(preset => (
                  <button
                    key={preset}
                    onClick={() => setReason(preset)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      reason === preset
                        ? 'bg-anotata-roxo text-white'
                        : 'bg-white border border-anotata-border text-anotata-text hover:border-anotata-roxo hover:bg-anotata-hover'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Custom reason */}
              <div className="text-[10px] uppercase font-semibold text-anotata-muted mb-1.5">
                Ou escreva o seu
              </div>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Ex: ambas tratam do mesmo cliente"
                rows={2}
                className="w-full px-3 py-2 bg-anotata-lavanda-clara border border-anotata-border rounded-lg text-sm text-anotata-text placeholder:text-anotata-muted focus:outline-none focus:border-anotata-roxo focus:ring-2 focus:ring-anotata-roxo/10 resize-none"
              />
            </div>

            <div className="p-4 border-t border-anotata-border flex items-center justify-between gap-2 bg-anotata-lavanda-clara">
              <button
                onClick={() => setStep('search')}
                className="px-4 py-2 text-sm text-anotata-text-suave hover:text-anotata-text rounded-lg hover:bg-white transition-colors"
              >
                ← Voltar
              </button>
              <button
                onClick={handleConfirm}
                className="px-5 py-2 bg-anotata-roxo text-white text-sm font-medium rounded-lg hover:bg-anotata-roxo-escuro transition-colors"
              >
                Conectar nota
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
