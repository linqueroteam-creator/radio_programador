import React, { useState } from 'react';
import { X, Sparkles, FileText } from 'lucide-react';
import { TEMPLATE_LIST } from '../engine/Templates';

/**
 * Seletor de templates — modal pra criar nota a partir de modelo.
 */
export default function TemplatePicker({ store, onClose, defaultNotebookId }) {
  const [selected, setSelected] = useState(null);
  const [customTitle, setCustomTitle] = useState('');

  const handleCreate = () => {
    const tmpl = selected ? TEMPLATE_LIST.find(t => t.id === selected) : null;

    const overrides = tmpl
      ? {
          title: customTitle.trim() || `${tmpl.titlePrefix}Sem título`,
          content: tmpl.content,
          type: tmpl.type,
          status: tmpl.status,
          priority: tmpl.priority,
          source: `template:${tmpl.id}`,
        }
      : { title: customTitle.trim() };

    const noteId = store.createNote(defaultNotebookId || 'default', overrides);
    store.setCurrentView('all');
    store.setSelectedNoteId(noteId);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-anotata-text/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        <div className="p-5 border-b border-anotata-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-anotata-roxo/10 flex items-center justify-center">
              <Sparkles size={16} className="text-anotata-roxo" />
            </div>
            <div>
              <h3 className="text-base font-bold text-anotata-text">Nova anotação</h3>
              <p className="text-[11px] text-anotata-muted">Escolha um modelo para começar mais rápido</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-anotata-muted hover:text-anotata-text rounded hover:bg-anotata-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {/* Em branco */}
          <div className="mb-4">
            <button
              onClick={() => setSelected(null)}
              className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                selected === null
                  ? 'border-anotata-roxo bg-anotata-lavanda-clara'
                  : 'border-anotata-border hover:border-anotata-lavanda hover:bg-anotata-hover'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">✏️</span>
                <div className="flex-1">
                  <div className="text-sm font-semibold text-anotata-text">Em branco</div>
                  <div className="text-xs text-anotata-text-suave">Comece do zero, sem estrutura prévia</div>
                </div>
              </div>
            </button>
          </div>

          <div className="text-[10px] uppercase font-semibold text-anotata-muted mb-2">Modelos prontos</div>

          <div className="grid grid-cols-2 gap-2">
            {TEMPLATE_LIST.map(tmpl => {
              const isSelected = selected === tmpl.id;
              return (
                <button
                  key={tmpl.id}
                  onClick={() => setSelected(tmpl.id)}
                  className={`p-3 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? 'border-anotata-roxo bg-anotata-lavanda-clara'
                      : 'border-anotata-border hover:border-anotata-lavanda hover:bg-anotata-hover'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-xl shrink-0">{tmpl.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-anotata-text">{tmpl.name}</div>
                      <div className="text-[11px] text-anotata-text-suave line-clamp-2">{tmpl.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 bg-anotata-lavanda-clara border-t border-anotata-border space-y-3">
          <div>
            <label className="text-[10px] uppercase font-semibold text-anotata-text-suave block mb-1">
              Título (opcional)
            </label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') onClose(); }}
              placeholder="Você pode definir agora ou depois"
              className="w-full px-3 py-2 bg-white border border-anotata-border rounded-lg text-sm text-anotata-text placeholder:text-anotata-muted focus:outline-none focus:border-anotata-roxo"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-anotata-text-suave hover:text-anotata-text rounded-lg hover:bg-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              className="px-5 py-2 bg-anotata-roxo text-white text-sm font-medium rounded-lg hover:bg-anotata-roxo-escuro transition-colors flex items-center gap-1.5"
            >
              <FileText size={14} />
              Criar anotação
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
