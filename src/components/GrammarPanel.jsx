import React from 'react';
import { X, Loader2, Check, RefreshCw, SpellCheck } from 'lucide-react';

const CATEGORY_LABELS = {
  spell: { label: 'Ortografia', color: '#C44862', bg: '#FCE7EB' },
  grammar: { label: 'Gramática', color: '#E8637C', bg: '#FCE7EB' },
  style: { label: 'Estilo', color: '#5B2D8E', bg: '#EDE8F2' },
  punct: { label: 'Pontuação', color: '#7C4DC9', bg: '#EDE8F2' },
};

export default function GrammarPanel({ issues, isLoading, onApply, onIgnore, onClose, onRecheck }) {
  return (
    <div className="w-[340px] border-l border-anotata-border bg-anotata-sidebar flex flex-col">
      <div className="p-3 border-b border-anotata-border flex items-center justify-between bg-white">
        <div className="flex items-center gap-2">
          <SpellCheck size={16} className="text-anotata-roxo" />
          <h3 className="text-sm font-semibold text-anotata-text">
            {isLoading
              ? 'Analisando...'
              : issues.length === 0
                ? 'Sem erros'
                : `${issues.length} ${issues.length === 1 ? 'sugestão' : 'sugestões'}`
            }
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onRecheck}
            disabled={isLoading}
            className="p-1 text-anotata-text-suave hover:text-anotata-roxo rounded hover:bg-anotata-hover transition-colors disabled:opacity-30"
            title="Verificar de novo"
          >
            <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onClose}
            className="p-1 text-anotata-text-suave hover:text-anotata-goiaba rounded hover:bg-anotata-hover transition-colors"
            title="Fechar"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 size={28} className="animate-spin text-anotata-roxo" />
            <p className="text-xs text-anotata-muted">Verificando texto...</p>
          </div>
        )}

        {!isLoading && issues.length === 0 && (
          <div className="text-center py-12">
            <Check size={40} className="mx-auto text-green-600 mb-2" />
            <p className="text-sm font-medium text-anotata-text">Tudo certo!</p>
            <p className="text-xs text-anotata-muted mt-1">Nenhum erro encontrado</p>
          </div>
        )}

        {!isLoading && issues.map(issue => {
          const cat = CATEGORY_LABELS[issue.category] || CATEGORY_LABELS.grammar;
          return (
            <div
              key={issue.id}
              className="bg-white rounded-lg border border-anotata-border p-3 hover:border-anotata-roxo/40 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
                  style={{ backgroundColor: cat.bg, color: cat.color }}
                >
                  {cat.label}
                </span>
                <button
                  onClick={() => onIgnore(issue)}
                  className="text-[10px] text-anotata-muted hover:text-anotata-text-suave"
                >
                  ignorar
                </button>
              </div>

              <div className="text-xs mb-2">
                <span className="text-anotata-muted">"</span>
                <span
                  className="font-medium"
                  style={{
                    textDecoration: `underline wavy ${cat.color}`,
                    textDecorationSkipInk: 'none',
                  }}
                >
                  {issue.text}
                </span>
                <span className="text-anotata-muted">"</span>
              </div>

              <p className="text-xs text-anotata-text-suave mb-2 leading-snug">
                {issue.message}
              </p>

              {issue.suggestions && issue.suggestions.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {issue.suggestions.map((sug, idx) => (
                    <button
                      key={idx}
                      onClick={() => onApply(issue, sug)}
                      className="text-xs px-2 py-1 bg-anotata-roxo text-white rounded hover:bg-anotata-roxo-escuro transition-colors font-medium"
                    >
                      {sug}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
