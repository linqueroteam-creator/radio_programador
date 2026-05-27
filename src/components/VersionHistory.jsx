import React, { useState } from 'react';
import { X, History, RotateCcw, Eye, Clock, FileText } from 'lucide-react';

function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/\s+/g, ' ').trim();
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/**
 * Histórico de versões da nota com restauração visual.
 * As versões são salvas automaticamente a cada 10 edições (até 10 versões).
 */
export default function VersionHistory({ note, store, onClose }) {
  const versions = note?.versions || [];
  const [previewIndex, setPreviewIndex] = useState(versions.length > 0 ? versions.length - 1 : null);
  const [confirmRestore, setConfirmRestore] = useState(false);

  const previewVersion = previewIndex !== null ? versions[previewIndex] : null;

  const handleRestore = () => {
    if (previewIndex === null) return;
    store.restoreVersion(note.id, previewIndex);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 bg-anotata-text/40 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-anotata-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-anotata-roxo/10 flex items-center justify-center">
              <History size={16} className="text-anotata-roxo" />
            </div>
            <div>
              <h3 className="text-base font-bold text-anotata-text">Histórico de versões</h3>
              <p className="text-xs text-anotata-muted">
                Versões salvas automaticamente desta nota
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 text-anotata-muted hover:text-anotata-text rounded hover:bg-anotata-hover">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {/* Lista de versões */}
          <div className="w-[260px] border-r border-anotata-border bg-anotata-sidebar overflow-y-auto">
            {/* Versão atual */}
            <button
              onClick={() => setPreviewIndex(null)}
              className={`w-full p-3 text-left border-b border-anotata-border transition-colors ${
                previewIndex === null
                  ? 'bg-anotata-roxo text-white'
                  : 'hover:bg-anotata-hover'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-2xs uppercase font-semibold tracking-wide ${
                  previewIndex === null ? 'text-white/80' : 'text-anotata-roxo'
                }`}>
                  Versão atual
                </span>
                <span className={`text-2xs px-1.5 py-0.5 rounded font-medium ${
                  previewIndex === null ? 'bg-white/20 text-white' : 'bg-anotata-lavanda text-anotata-roxo'
                }`}>
                  agora
                </span>
              </div>
              <div className={`text-xs font-medium truncate ${
                previewIndex === null ? 'text-white' : 'text-anotata-text'
              }`}>
                {note.title || 'Sem título'}
              </div>
              <div className={`text-2xs mt-0.5 ${
                previewIndex === null ? 'text-white/70' : 'text-anotata-muted'
              }`}>
                {formatDateTime(note.updatedAt)}
              </div>
            </button>

            {/* Versões salvas */}
            {versions.length === 0 ? (
              <div className="p-4 text-center">
                <p className="text-xs text-anotata-muted">
                  Nenhuma versão salva ainda. As versões são salvas automaticamente a cada 10 edições.
                </p>
              </div>
            ) : (
              [...versions].reverse().map((v, idx) => {
                const realIdx = versions.length - 1 - idx;
                const isActive = previewIndex === realIdx;
                return (
                  <button
                    key={`v-${realIdx}`}
                    onClick={() => setPreviewIndex(realIdx)}
                    className={`w-full p-3 text-left border-b border-anotata-border transition-colors ${
                      isActive ? 'bg-anotata-lavanda-clara' : 'hover:bg-anotata-hover'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <Clock size={10} className="text-anotata-muted" />
                      <span className="text-2xs uppercase font-semibold text-anotata-text-suave tracking-wide">
                        Versão {realIdx + 1}
                      </span>
                    </div>
                    <div className="text-xs font-medium text-anotata-text truncate">
                      {v.title || 'Sem título'}
                    </div>
                    <div className="text-2xs text-anotata-muted mt-0.5">
                      {formatDateTime(v.timestamp)}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Preview da versão selecionada */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="p-4 border-b border-anotata-border bg-anotata-lavanda-clara flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Eye size={14} className="text-anotata-roxo" />
                <span className="text-sm font-medium text-anotata-text">
                  {previewIndex === null ? 'Pré-visualização: versão atual' : `Pré-visualização: Versão ${previewIndex + 1}`}
                </span>
              </div>
              {previewIndex !== null && (
                <button
                  onClick={() => setConfirmRestore(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-anotata-roxo text-white text-xs font-medium rounded-lg hover:bg-anotata-roxo-escuro transition-colors"
                >
                  <RotateCcw size={12} />
                  Restaurar esta versão
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {previewVersion ? (
                <div>
                  <h2 className="text-2xl font-bold text-anotata-text mb-3">
                    {previewVersion.title || 'Sem título'}
                  </h2>
                  <div className="flex items-center gap-2 mb-4 text-xs text-anotata-text-suave">
                    <span>Tipo: {previewVersion.type}</span>
                    <span>•</span>
                    <span>Status: {previewVersion.status}</span>
                    <span>•</span>
                    <span>Prioridade: {previewVersion.priority}</span>
                  </div>
                  <div
                    className="text-sm text-anotata-text leading-relaxed prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: previewVersion.content }}
                  />
                </div>
              ) : (
                <div>
                  <h2 className="text-2xl font-bold text-anotata-text mb-3">
                    {note.title || 'Sem título'}
                  </h2>
                  <div className="flex items-center gap-2 mb-4 text-xs text-anotata-text-suave">
                    <span>Versão atual</span>
                    <span>•</span>
                    <span>{formatDateTime(note.updatedAt)}</span>
                  </div>
                  <div
                    className="text-sm text-anotata-text leading-relaxed prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ __html: note.content }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Confirmação de restauração */}
      {confirmRestore && (
        <div
          className="fixed inset-0 bg-anotata-text/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4"
          onClick={() => setConfirmRestore(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <RotateCcw size={16} className="text-anotata-roxo" />
                <h3 className="text-base font-bold text-anotata-text">Restaurar versão?</h3>
              </div>
              <p className="text-sm text-anotata-text-suave mb-4">
                A versão atual da nota será substituída pela versão {previewIndex + 1}. A versão atual ficará salva como backup.
              </p>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setConfirmRestore(false)}
                  className="px-3 py-1.5 text-sm text-anotata-text-suave hover:bg-anotata-hover rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleRestore}
                  className="px-4 py-1.5 bg-anotata-roxo text-white text-sm font-medium rounded-lg hover:bg-anotata-roxo-escuro"
                >
                  Restaurar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
