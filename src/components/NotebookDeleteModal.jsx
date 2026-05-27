import React, { useState } from 'react';
import { X, AlertTriangle, Archive, BookOpen } from 'lucide-react';
import NotebookCover from './NotebookCover';

/**
 * Modal de confirmação para excluir caderno.
 * Segurança: as notas não somem — elas vão para "Arquivadas".
 * Caderno default não pode ser excluído.
 */
export default function NotebookDeleteModal({ notebook, noteCount, onConfirm, onCancel }) {
  const [confirmText, setConfirmText] = useState('');
  const isDefault = notebook.id === 'default';
  const expectedConfirm = 'EXCLUIR';
  const canDelete = !isDefault && confirmText.trim().toUpperCase() === expectedConfirm;

  const handleConfirm = () => {
    if (!canDelete) return;
    onConfirm();
  };

  if (isDefault) {
    return (
      <div className="fixed inset-0 bg-anotata-text/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
          <div className="p-5 border-b border-anotata-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle size={18} className="text-anotata-goiaba" />
              <h3 className="text-base font-bold text-anotata-text">Não é possível excluir</h3>
            </div>
            <button onClick={onCancel} className="p-1 text-anotata-muted hover:text-anotata-text rounded">
              <X size={18} />
            </button>
          </div>
          <div className="p-5">
            <p className="text-sm text-anotata-text-suave">
              O caderno <strong>{notebook.name}</strong> é o caderno principal e não pode ser excluído.
              Ele é usado como destino padrão pra notas que perdem o caderno original.
            </p>
            <button
              onClick={onCancel}
              className="mt-4 w-full px-4 py-2 bg-anotata-roxo text-white text-sm font-medium rounded-lg hover:bg-anotata-roxo-escuro"
            >
              Entendi
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-anotata-text/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
        <div className="p-5 border-b border-anotata-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-anotata-goiaba/10 flex items-center justify-center">
              <AlertTriangle size={16} className="text-anotata-goiaba" />
            </div>
            <div>
              <h3 className="text-base font-bold text-anotata-text">Excluir caderno</h3>
              <p className="text-[11px] text-anotata-muted">Esta ação remove o caderno, mas guarda as notas</p>
            </div>
          </div>
          <button onClick={onCancel} className="p-1 text-anotata-muted hover:text-anotata-text rounded hover:bg-anotata-hover">
            <X size={18} />
          </button>
        </div>

        {/* Preview do caderno */}
        <div className="p-6 bg-anotata-lavanda-clara flex justify-center">
          <NotebookCover notebook={{ ...notebook, _noteCount: noteCount }} size="sm" />
        </div>

        <div className="p-5 space-y-3">
          <div className="p-3 bg-anotata-lavanda-clara rounded-lg flex items-start gap-2">
            <Archive size={14} className="text-anotata-roxo mt-0.5 shrink-0" />
            <div className="text-xs text-anotata-text-suave">
              <strong className="text-anotata-text">Suas notas estão seguras.</strong>{' '}
              {noteCount > 0 ? (
                <>As <strong>{noteCount} {noteCount === 1 ? 'nota' : 'notas'}</strong> deste caderno serão movidas para <strong>"Arquivadas"</strong> — você pode restaurá-las a qualquer momento.</>
              ) : (
                <>Este caderno está vazio.</>
              )}
            </div>
          </div>

          <div className="p-3 bg-red-50 border-l-2 border-red-400 rounded text-xs text-red-700">
            <strong>O caderno será removido permanentemente.</strong> Para confirmar, digite{' '}
            <code className="bg-white px-1 rounded font-mono text-red-800">EXCLUIR</code> abaixo.
          </div>

          <input
            type="text"
            autoFocus
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canDelete) handleConfirm();
              if (e.key === 'Escape') onCancel();
            }}
            placeholder="Digite EXCLUIR para confirmar"
            className="w-full px-3 py-2 bg-white border border-anotata-border rounded-lg text-sm text-anotata-text placeholder:text-anotata-muted focus:outline-none focus:border-anotata-goiaba focus:ring-2 focus:ring-anotata-goiaba/10 font-mono"
          />
        </div>

        <div className="p-4 bg-anotata-lavanda-clara border-t border-anotata-border flex items-center justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm text-anotata-text-suave hover:text-anotata-text rounded-lg hover:bg-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canDelete}
            className="px-5 py-2 bg-anotata-goiaba text-white text-sm font-medium rounded-lg hover:bg-anotata-goiaba-escuro disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Excluir caderno
          </button>
        </div>
      </div>
    </div>
  );
}
