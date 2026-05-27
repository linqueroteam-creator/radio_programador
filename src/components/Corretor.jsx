import React, { useState, useCallback } from 'react';
import {
  SpellCheck, Check, AlertCircle, Sparkles,
  Loader2, Copy, RotateCcw, FileText
} from 'lucide-react';
import grammarEngine from '../engine/GrammarEngine';
import IconButton from './ui/IconButton';

const CATEGORY_LABELS = {
  spell: { label: 'Ortografia', color: '#C44862', bg: '#FCE7EB' },
  grammar: { label: 'Gramática', color: '#E8637C', bg: '#FCE7EB' },
  style: { label: 'Estilo', color: '#5B2D8E', bg: '#EDE8F2' },
  punct: { label: 'Pontuação', color: '#7C4DC9', bg: '#EDE8F2' },
};

export default function Corretor({ store, onOpenMobileMenu }) {
  const [text, setText] = useState('');
  const [issues, setIssues] = useState([]);
  const [stats, setStats] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [filter, setFilter] = useState('all');

  const checkText = useCallback(async () => {
    if (!text.trim()) return;
    setIsChecking(true);
    setIsOffline(false);
    try {
      const result = await grammarEngine.check(text);
      setIssues(result.issues);
      setStats(result.stats);
      setIsOffline(result.offline || false);
    } catch (e) {
      console.error(e);
    } finally {
      setIsChecking(false);
    }
  }, [text]);

  const applySuggestion = (issue, suggestion) => {
    const before = text.slice(0, issue.offset);
    const after = text.slice(issue.offset + issue.length);
    const newText = before + suggestion + after;
    setText(newText);
    // Remover esse erro da lista
    setIssues(prev => prev.filter(i => i.id !== issue.id));
  };

  const ignoreIssue = (issue) => {
    setIssues(prev => prev.filter(i => i.id !== issue.id));
  };

  const copyText = () => {
    navigator.clipboard.writeText(text);
  };

  const clearAll = () => {
    setText('');
    setIssues([]);
    setStats(null);
  };

  const importFromNote = () => {
    if (store.selectedNote) {
      const cleanContent = store.selectedNote.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      setText(cleanContent);
    } else if (store.notes.length > 0) {
      const lastNote = store.notes.find(n => !n.isTrash);
      if (lastNote) {
        const cleanContent = lastNote.content.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        setText(cleanContent);
      }
    }
  };

  const filteredIssues = filter === 'all'
    ? issues
    : issues.filter(i => i.category === filter);

  // Highlight do texto com erros marcados
  const renderHighlightedText = () => {
    if (issues.length === 0) return text;

    const sorted = [...issues].sort((a, b) => a.offset - b.offset);
    const parts = [];
    let lastIdx = 0;

    sorted.forEach((issue) => {
      if (issue.offset > lastIdx) {
        parts.push(<span key={`t-${lastIdx}`}>{text.slice(lastIdx, issue.offset)}</span>);
      }
      const cat = CATEGORY_LABELS[issue.category] || CATEGORY_LABELS.grammar;
      parts.push(
        <span
          key={issue.id}
          className="relative inline-block cursor-help"
          style={{
            backgroundColor: cat.bg,
            borderBottom: `2px wavy solid ${cat.color}`,
            textDecoration: `underline wavy ${cat.color}`,
            textDecorationSkipInk: 'none',
          }}
          title={issue.message}
        >
          {text.slice(issue.offset, issue.offset + issue.length)}
        </span>
      );
      lastIdx = issue.offset + issue.length;
    });

    if (lastIdx < text.length) {
      parts.push(<span key={`t-end`}>{text.slice(lastIdx)}</span>);
    }

    return parts;
  };

  const issuesByCategory = issues.reduce((acc, i) => {
    acc[i.category] = (acc[i.category] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex-1 flex flex-col h-full bg-anotata-bg overflow-hidden">
      {/* Header */}
      <div className="border-b border-anotata-border bg-white px-4 sm:px-6 py-4">
        <div className="flex items-center gap-3 mb-1">
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              className="md:hidden p-2 rounded-lg text-anotata-text-suave hover:text-anotata-roxo hover:bg-anotata-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anotata-roxo/50"
              aria-label="Abrir menu"
              title="Abrir menu"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            </button>
          )}
          <div className="p-2 bg-anotata-roxo/10 rounded-lg">
            <SpellCheck size={20} className="text-anotata-roxo" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-anotata-text">Corretor Ortográfico</h1>
            <p className="text-xs text-anotata-muted hidden sm:block">
              Correção gramatical, ortográfica e de estilo em Português do Brasil
            </p>
          </div>
        </div>
      </div>

      {/* Conteúdo principal em duas colunas */}
      <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
        {/* Coluna esquerda: editor de texto */}
        <div className="flex-1 flex flex-col border-r-0 md:border-r border-anotata-border min-h-0">
          {/* Toolbar */}
          <div className="bg-white border-b border-anotata-border px-4 py-2 flex items-center gap-2 flex-wrap">
            <button
              onClick={checkText}
              disabled={!text.trim() || isChecking}
              className="flex items-center gap-2 px-4 py-1.5 bg-anotata-roxo text-white rounded-lg hover:bg-anotata-roxo-escuro disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
              {isChecking ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              {isChecking ? 'Analisando...' : 'Verificar texto'}
            </button>

            <button
              onClick={importFromNote}
              className="flex items-center gap-2 px-3 py-1.5 bg-anotata-lavanda text-anotata-roxo rounded-lg hover:bg-anotata-hover text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-anotata-roxo/50"
              title="Trazer texto da nota selecionada"
            >
              <FileText size={14} />
              Importar nota
            </button>

            <div className="w-px h-5 bg-anotata-border mx-1" aria-hidden="true"></div>

            <IconButton
              icon={Copy}
              label="Copiar texto"
              onClick={copyText}
              disabled={!text}
            />

            <IconButton
              icon={RotateCcw}
              label="Limpar"
              onClick={clearAll}
              disabled={!text}
            />

            {/* Indicador */}
            <div className="ml-auto flex items-center gap-2">
              {isOffline && (
                <span className="text-xs text-anotata-goiaba bg-anotata-goiaba/10 px-2 py-0.5 rounded-full">
                  Modo offline (regras básicas)
                </span>
              )}
              {stats && !isChecking && (
                <span className="text-xs text-anotata-muted">
                  {stats.words} palavras • {stats.readingTime} min de leitura
                </span>
              )}
            </div>
          </div>

          {/* Editor de texto */}
          <div className="flex-1 overflow-y-auto p-6 bg-white">
            {issues.length > 0 ? (
              <div className="relative">
                {/* Camada visual com erros destacados */}
                <div className="absolute inset-0 p-0 pointer-events-none whitespace-pre-wrap break-words text-base text-anotata-text leading-relaxed font-normal">
                  {renderHighlightedText()}
                </div>
                {/* Textarea por cima (transparente) */}
                <textarea
                  value={text}
                  onChange={(e) => { setText(e.target.value); setIssues([]); }}
                  placeholder="Cole ou escreva seu texto aqui..."
                  className="relative w-full h-full min-h-[400px] resize-none border-none outline-none bg-transparent text-base text-transparent caret-anotata-roxo whitespace-pre-wrap break-words leading-relaxed"
                  style={{ caretColor: '#5B2D8E' }}
                />
              </div>
            ) : (
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder="Cole ou escreva seu texto aqui... Depois clique em &quot;Verificar texto&quot; para analisar."
                className="w-full h-full min-h-[400px] resize-none border-none outline-none bg-transparent text-base text-anotata-text leading-relaxed placeholder:text-anotata-muted"
              />
            )}
          </div>
        </div>

        {/* Coluna direita: lista de correções */}
        <div className="w-full md:w-[380px] flex flex-col bg-anotata-sidebar border-t md:border-t-0 md:border-l border-anotata-border max-h-[50vh] md:max-h-none">
          {/* Resumo */}
          <div className="p-4 border-b border-anotata-border">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-anotata-text">
                {issues.length === 0
                  ? (text && stats ? 'Nenhum erro encontrado!' : 'Aguardando análise')
                  : `${issues.length} ${issues.length === 1 ? 'sugestão' : 'sugestões'}`
                }
              </h3>
              {issues.length === 0 && stats && (
                <Check size={16} className="text-anotata-success" />
              )}
            </div>

            {/* Filtros por categoria */}
            {issues.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                <FilterPill
                  active={filter === 'all'}
                  count={issues.length}
                  label="Todos"
                  onClick={() => setFilter('all')}
                />
                {Object.entries(issuesByCategory).map(([cat, count]) => {
                  const meta = CATEGORY_LABELS[cat] || CATEGORY_LABELS.grammar;
                  return (
                    <FilterPill
                      key={cat}
                      active={filter === cat}
                      count={count}
                      label={meta.label}
                      color={meta.color}
                      bg={meta.bg}
                      onClick={() => setFilter(cat)}
                    />
                  );
                })}
              </div>
            )}
          </div>

          {/* Lista de issues */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {filteredIssues.length === 0 && issues.length > 0 && (
              <p className="text-center text-sm text-anotata-muted py-8">
                Nenhuma sugestão nessa categoria
              </p>
            )}

            {issues.length === 0 && !text && (
              <div className="text-center py-12 px-4">
                <SpellCheck size={48} className="mx-auto text-anotata-muted opacity-30 mb-3" />
                <p className="text-sm text-anotata-muted">
                  Cole ou escreva um texto e clique em "Verificar" para receber sugestões.
                </p>
              </div>
            )}

            {issues.length === 0 && text && stats && !isChecking && (
              <div className="text-center py-12 px-4">
                <Check size={48} className="mx-auto text-anotata-success mb-3" />
                <p className="text-sm text-anotata-text font-medium mb-1">
                  Texto sem erros!
                </p>
                <p className="text-xs text-anotata-muted">
                  {stats.words} palavras analisadas
                </p>
              </div>
            )}

            {filteredIssues.map(issue => (
              <IssueCard
                key={issue.id}
                issue={issue}
                onApply={(s) => applySuggestion(issue, s)}
                onIgnore={() => ignoreIssue(issue)}
              />
            ))}
          </div>

          {/* Stats footer */}
          {stats && (
            <div className="p-3 border-t border-anotata-border bg-anotata-lavanda-clara">
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <div className="font-semibold text-anotata-roxo">{stats.words}</div>
                  <div className="text-anotata-muted">palavras</div>
                </div>
                <div>
                  <div className="font-semibold text-anotata-roxo">{stats.sentences}</div>
                  <div className="text-anotata-muted">frases</div>
                </div>
                <div>
                  <div className="font-semibold text-anotata-roxo">{stats.readingTime} min</div>
                  <div className="text-anotata-muted">leitura</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterPill({ active, count, label, onClick, color, bg }) {
  return (
    <button
      onClick={onClick}
      className={`text-xs px-2.5 py-1 rounded-full font-medium transition-all ${
        active
          ? 'ring-2 ring-anotata-roxo'
          : 'opacity-70 hover:opacity-100'
      }`}
      style={{
        backgroundColor: active ? (bg || '#EDE8F2') : '#FFFFFF',
        color: color || '#5B2D8E',
        border: `1px solid ${color || '#DCD2E8'}`,
      }}
    >
      {label} <span className="opacity-70">({count})</span>
    </button>
  );
}

function IssueCard({ issue, onApply, onIgnore }) {
  const cat = CATEGORY_LABELS[issue.category] || CATEGORY_LABELS.grammar;

  return (
    <div className="bg-white rounded-lg border border-anotata-border p-3 hover:border-anotata-roxo/40 transition-colors">
      {/* Categoria */}
      <div className="flex items-center justify-between mb-2">
        <span
          className="text-2xs font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded"
          style={{ backgroundColor: cat.bg, color: cat.color }}
        >
          {cat.label}
        </span>
        <button
          onClick={onIgnore}
          className="text-2xs text-anotata-muted hover:text-anotata-text-suave"
          title="Ignorar"
        >
          ignorar
        </button>
      </div>

      {/* Texto com erro */}
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

      {/* Mensagem */}
      <p className="text-xs text-anotata-text-suave mb-2 leading-snug">
        {issue.message}
      </p>

      {/* Sugestões */}
      {issue.suggestions && issue.suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {issue.suggestions.map((sug, idx) => (
            <button
              key={idx}
              onClick={() => onApply(sug)}
              className="text-xs px-2 py-1 bg-anotata-roxo text-white rounded hover:bg-anotata-roxo-escuro transition-colors font-medium"
              title="Aplicar sugestão"
            >
              {sug}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
