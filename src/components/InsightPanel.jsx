import React, { useState, useMemo } from 'react';
import {
  X, ChevronDown, ChevronRight, AlertCircle, Info, CheckCircle,
  Tag, Calendar, Link as LinkIcon, CheckSquare, Link2, Plus,
  Sparkles, Clock, Edit3, FileText, History, Eye, Star, Pin,
  Archive, Copy, Download, Zap, RefreshCw, ListChecks
} from 'lucide-react';
import { NOTE_TYPES, NOTE_PRIORITY, NOTE_STATUS } from '../engine/RulesEngine';
import { countChecklistItems, appendChecklistItem, markAllDone, extractChecklistText } from '../engine/ChecklistEngine';
import DueDateBadge, { DueDatePicker } from './DueDateBadge';
import ChecklistProgress from './ChecklistProgress';

/**
 * Painel lateral inteligente — Pacote 4 Pro.
 * Agora não é só informativo: é painel de AÇÃO.
 */

function Section({ title, count, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-anotata-border last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-3 py-2.5 hover:bg-anotata-hover transition-colors"
      >
        {open ? <ChevronDown size={12} className="text-anotata-muted" /> : <ChevronRight size={12} className="text-anotata-muted" />}
        {Icon && <Icon size={13} className="text-anotata-roxo" />}
        <span className="text-[11px] font-semibold uppercase tracking-wide text-anotata-text">
          {title}
        </span>
        {count !== undefined && count > 0 && (
          <span className="ml-auto text-[10px] bg-anotata-roxo text-white rounded-full px-1.5 py-0.5 font-medium">
            {count}
          </span>
        )}
      </button>
      {open && <div className="px-3 pb-3">{children}</div>}
    </div>
  );
}

function AlertItem({ level, icon: Icon, message, action, onActionClick }) {
  const colors = {
    warn: { bg: '#FCE7EB', text: '#C44862', border: '#F08AA0' },
    info: { bg: '#EDE8F2', text: '#5B2D8E', border: '#C9B8E8' },
    good: { bg: '#D4F4DD', text: '#0F7A3F', border: '#10B981' },
  };
  const c = colors[level] || colors.info;

  return (
    <div
      className="flex items-start gap-2 p-2 rounded-lg text-xs mb-1.5 last:mb-0"
      style={{ backgroundColor: c.bg, color: c.text, borderLeft: `2px solid ${c.border}` }}
    >
      {Icon && <Icon size={12} className="mt-0.5 shrink-0" />}
      <div className="flex-1">
        <div>{message}</div>
        {action && (
          <button
            onClick={onActionClick}
            className="text-[10px] underline mt-0.5 hover:opacity-80 font-medium"
          >
            {action}
          </button>
        )}
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, onClick, variant = 'default' }) {
  const styles = {
    default: 'bg-white border-anotata-border text-anotata-text hover:border-anotata-roxo hover:bg-anotata-lavanda-clara',
    primary: 'bg-anotata-roxo border-anotata-roxo text-white hover:bg-anotata-roxo-escuro',
    danger: 'bg-white border-anotata-goiaba text-anotata-goiaba hover:bg-anotata-goiaba hover:text-white',
  };
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2.5 py-1.5 text-xs font-medium rounded-md border transition-all ${styles[variant]}`}
    >
      <Icon size={12} />
      {label}
    </button>
  );
}

function formatRelativeDate(iso) {
  if (!iso) return 'nunca';
  const d = new Date(iso);
  const now = new Date();
  const diff = now - d;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'agora';
  if (mins < 60) return `${mins}min atrás`;
  if (hours < 24) return `${hours}h atrás`;
  if (days < 7) return `${days}d atrás`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function InsightPanel({
  note, store, suggestions,
  onClose, onAddConnection, onFocusTitle, onFocusTags
}) {
  if (!note || !suggestions) return null;

  const typeMeta = NOTE_TYPES[note.type] || NOTE_TYPES.rascunho;
  const priorityMeta = NOTE_PRIORITY[note.priority] || NOTE_PRIORITY.normal;
  const statusMeta = NOTE_STATUS[note.status] || NOTE_STATUS.ativo;

  const { links, dates, tasks, diagnostics, connections, duplicates } = suggestions;
  const checklistStats = useMemo(() => countChecklistItems(note.content), [note.content]);
  const manualConnections = note.manualConnections || [];

  const connectedNotes = useMemo(() => {
    return manualConnections
      .map(c => {
        const noteId = typeof c === 'string' ? c : c.noteId;
        const reason = typeof c === 'string' ? '' : (c.reason || '');
        const createdAt = typeof c === 'string' ? null : c.createdAt;
        const target = store.getNoteById(noteId);
        if (!target || target.isTrash) return null;
        return { noteId, reason, createdAt, target };
      })
      .filter(Boolean);
  }, [manualConnections, store.notes]);

  // Diagnóstico extra
  const extraDiagnostics = [];
  if ((note.priority === 'alta' || note.priority === 'urgente') && manualConnections.length === 0) {
    extraDiagnostics.push({
      level: 'warn', icon: AlertCircle,
      message: 'Importante mas sem conexão',
      action: 'Adicionar conexão',
      onActionClick: onAddConnection,
    });
  }
  if (duplicates.length > 0) {
    extraDiagnostics.push({
      level: 'warn', icon: AlertCircle,
      message: `Possível duplicidade (${duplicates.length} nota${duplicates.length > 1 ? 's' : ''} com título igual)`,
    });
  }

  const [editingNextAction, setEditingNextAction] = useState(false);
  const [customAction, setCustomAction] = useState(note.customNextAction || '');
  const [editingDueDate, setEditingDueDate] = useState(false);
  const [newTaskText, setNewTaskText] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);

  const saveCustomNextAction = () => {
    store.setCustomNextAction(note.id, customAction.trim());
    setEditingNextAction(false);
  };

  const handleAddTask = () => {
    if (!newTaskText.trim()) return;
    const newContent = appendChecklistItem(note.content, newTaskText.trim());
    store.updateNote(note.id, { content: newContent });
    setNewTaskText('');
    setShowAddTask(false);
  };

  const handleMarkAllDone = () => {
    const newContent = markAllDone(note.content);
    store.updateNote(note.id, { content: newContent });
  };

  const handleCopyContent = () => {
    const text = store.exportNoteAsText(note.id);
    if (text && navigator.clipboard) {
      navigator.clipboard.writeText(text);
    }
  };

  const handleCopyChecklist = () => {
    const items = extractChecklistText(note.content);
    if (items.length === 0) return;
    const text = items.map(i => `${i.done ? '[x]' : '[ ]'} ${i.text}`).join('\n');
    if (navigator.clipboard) navigator.clipboard.writeText(text);
  };

  const handleExport = (format) => {
    let content;
    let filename;
    let mime;

    if (format === 'md') {
      content = store.exportNoteAsMarkdown(note.id);
      filename = `${(note.title || 'nota').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.md`;
      mime = 'text/markdown';
    } else {
      content = store.exportNoteAsText(note.id);
      filename = `${(note.title || 'nota').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.txt`;
      mime = 'text/plain';
    }

    if (!content) return;
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <aside className="w-[340px] border-l border-anotata-border bg-anotata-sidebar flex flex-col h-full overflow-hidden">
      <div className="px-3 py-3 border-b border-anotata-border bg-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-anotata-roxo" />
          <h3 className="text-sm font-semibold text-anotata-text">Painel de ação</h3>
        </div>
        <button
          onClick={onClose}
          className="p-1 text-anotata-muted hover:text-anotata-goiaba rounded hover:bg-anotata-hover transition-colors"
          title="Fechar painel"
        >
          <X size={14} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        {/* === AÇÕES RÁPIDAS (NOVO) === */}
        <Section title="Ações rápidas" icon={Zap} defaultOpen={true}>
          <div className="grid grid-cols-2 gap-1.5">
            <QuickAction
              icon={Star}
              label={note.isFavorite ? 'Desfavoritar' : 'Favoritar'}
              onClick={() => store.toggleFavorite(note.id)}
            />
            <QuickAction
              icon={Pin}
              label={note.isPinned ? 'Desafixar' : 'Fixar'}
              onClick={() => store.togglePin(note.id)}
            />
            <QuickAction
              icon={Eye}
              label="Revisada"
              onClick={() => store.markAsReviewed(note.id)}
            />
            <QuickAction
              icon={Archive}
              label={note.isArchived ? 'Desarquivar' : 'Arquivar'}
              onClick={() => note.isArchived ? store.unarchiveNote(note.id) : store.archiveNote(note.id)}
            />
            <QuickAction
              icon={Link2}
              label="Conectar"
              onClick={onAddConnection}
            />
            <QuickAction
              icon={Copy}
              label="Copiar"
              onClick={handleCopyContent}
            />
          </div>
          <div className="grid grid-cols-2 gap-1.5 mt-1.5">
            <QuickAction
              icon={Download}
              label=".md"
              onClick={() => handleExport('md')}
            />
            <QuickAction
              icon={Download}
              label=".txt"
              onClick={() => handleExport('txt')}
            />
          </div>
        </Section>

        {/* === RESUMO === */}
        <Section title="Resumo" icon={FileText} defaultOpen={true}>
          <div className="space-y-2 text-xs">
            <Row
              label="Tipo"
              value={
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium"
                  style={{ backgroundColor: typeMeta.color + '20', color: typeMeta.color }}>
                  {typeMeta.icon} {typeMeta.label}
                </span>
              }
            />
            <Row
              label="Status"
              value={
                <span className="inline-flex items-center gap-1 text-[11px] font-medium" style={{ color: statusMeta.color }}>
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: statusMeta.color }}></span>
                  {statusMeta.label}
                </span>
              }
            />
            <Row
              label="Prioridade"
              value={<span className="font-medium" style={{ color: priorityMeta.color }}>{priorityMeta.label}</span>}
            />
            <Row label="Caderno" value={store.getNotebookById(note.notebookId)?.name || '—'} />
            {note.tags && note.tags.length > 0 && (
              <Row
                label="Tags"
                value={
                  <div className="flex flex-wrap gap-1 justify-end">
                    {note.tags.map(t => (
                      <span key={t} className="text-[10px] bg-anotata-lavanda text-anotata-roxo px-1.5 py-0.5 rounded">
                        #{t}
                      </span>
                    ))}
                  </div>
                }
              />
            )}
          </div>
        </Section>

        {/* === PRAZO (NOVO no Pacote 4) === */}
        <Section title="Prazo" icon={Calendar} defaultOpen={!!note.dueDate || editingDueDate}>
          {note.dueDate && !editingDueDate ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <DueDateBadge dueDate={note.dueDate} size="md" />
                <button
                  onClick={() => setEditingDueDate(true)}
                  className="text-[10px] text-anotata-roxo hover:underline"
                >
                  Editar
                </button>
              </div>
              <button
                onClick={() => store.setDueDate(note.id, null)}
                className="text-[10px] text-anotata-goiaba hover:underline"
              >
                Remover prazo
              </button>
            </div>
          ) : editingDueDate ? (
            <DueDatePicker
              value={note.dueDate}
              onChange={(iso) => { store.setDueDate(note.id, iso); setEditingDueDate(false); }}
              onClear={() => { store.setDueDate(note.id, null); setEditingDueDate(false); }}
            />
          ) : (
            <button
              onClick={() => setEditingDueDate(true)}
              className="w-full p-2 text-xs text-anotata-muted hover:text-anotata-roxo border border-dashed border-anotata-border rounded-lg hover:border-anotata-roxo transition-colors flex items-center justify-center gap-1.5"
            >
              <Calendar size={12} />
              Definir prazo
            </button>
          )}
        </Section>

        {/* === DIAGNÓSTICO === */}
        <Section
          title="Saúde da anotação"
          icon={AlertCircle}
          count={diagnostics.length + extraDiagnostics.length}
          defaultOpen={diagnostics.some(d => d.level === 'warn') || extraDiagnostics.length > 0}
        >
          {(diagnostics.length === 0 && extraDiagnostics.length === 0) ? (
            <p className="text-xs text-anotata-muted italic">Tudo certo com esta nota ✓</p>
          ) : (
            <div>
              {extraDiagnostics.map((d, i) => (
                <AlertItem key={`extra-${i}`} {...d} />
              ))}
              {diagnostics.map((d, i) => {
                let Icon = Info;
                if (d.level === 'warn') Icon = AlertCircle;
                if (d.level === 'good') Icon = CheckCircle;
                return <AlertItem key={i} level={d.level} icon={Icon} message={d.message} />;
              })}
            </div>
          )}
        </Section>

        {/* === PRÓXIMA AÇÃO === */}
        <Section title="Próxima ação" icon={Sparkles} defaultOpen={true}>
          {editingNextAction ? (
            <div className="space-y-2">
              <textarea
                autoFocus
                value={customAction}
                onChange={(e) => setCustomAction(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) saveCustomNextAction();
                  if (e.key === 'Escape') setEditingNextAction(false);
                }}
                placeholder="Ex: revisar com o cliente até quinta..."
                rows={3}
                className="w-full p-2 text-xs bg-anotata-lavanda-clara border border-anotata-border rounded-lg focus:outline-none focus:border-anotata-roxo resize-none"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setEditingNextAction(false)}
                  className="px-2 py-1 text-[11px] text-anotata-muted hover:text-anotata-text"
                >Cancelar</button>
                <button
                  onClick={saveCustomNextAction}
                  className="px-2 py-1 text-[11px] bg-anotata-roxo text-white rounded hover:bg-anotata-roxo-escuro"
                >Salvar</button>
              </div>
            </div>
          ) : note.customNextAction ? (
            <div className="p-2.5 bg-gradient-to-br from-anotata-lavanda-clara to-white border border-anotata-lavanda rounded-lg">
              <div className="text-xs text-anotata-text">{note.customNextAction}</div>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => { setCustomAction(note.customNextAction); setEditingNextAction(true); }}
                  className="text-[10px] text-anotata-roxo hover:underline"
                >Editar</button>
                <button
                  onClick={() => store.setCustomNextAction(note.id, '')}
                  className="text-[10px] text-anotata-muted hover:text-anotata-goiaba"
                >Remover</button>
              </div>
            </div>
          ) : suggestions.nextAction ? (
            <div className="p-2.5 bg-gradient-to-br from-anotata-lavanda-clara to-white border border-anotata-lavanda rounded-lg">
              <div className="text-[10px] uppercase font-semibold text-anotata-roxo mb-1">Sugestão das regras</div>
              <div className="text-xs font-medium text-anotata-text">{suggestions.nextAction.label}</div>
              <div className="text-[10px] text-anotata-muted mb-2">{suggestions.nextAction.reason}</div>
              <button
                onClick={() => setEditingNextAction(true)}
                className="text-[10px] text-anotata-roxo hover:underline"
              >+ Definir minha própria</button>
            </div>
          ) : (
            <button
              onClick={() => setEditingNextAction(true)}
              className="w-full p-2 text-xs text-anotata-muted hover:text-anotata-roxo border border-dashed border-anotata-border rounded-lg hover:border-anotata-roxo transition-colors"
            >+ Definir próxima ação</button>
          )}
        </Section>

        {/* === CHECKLIST INTERATIVO (MELHORADO Pacote 4) === */}
        {(checklistStats.total > 0 || tasks.length > 0) && (
          <Section
            title="Checklist"
            icon={ListChecks}
            count={checklistStats.open || tasks.filter(t => !t.done).length}
            defaultOpen={true}
          >
            {checklistStats.total > 0 && (
              <div className="mb-3">
                <ChecklistProgress stats={checklistStats} size="md" />
              </div>
            )}

            {/* Tarefas detectadas */}
            {tasks.length > 0 && (
              <div className="space-y-1 mb-2 max-h-40 overflow-y-auto">
                {tasks.slice(0, 8).map((t, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs">
                    <span className={`mt-0.5 w-3 h-3 rounded border shrink-0 flex items-center justify-center ${
                      t.done ? 'bg-anotata-roxo border-anotata-roxo' : 'border-anotata-border'
                    }`}>
                      {t.done && <span className="text-white text-[8px] leading-none">✓</span>}
                    </span>
                    <span className={`flex-1 ${t.done ? 'line-through text-anotata-muted' : 'text-anotata-text'}`}>
                      {t.text}
                    </span>
                  </div>
                ))}
                {tasks.length > 8 && (
                  <div className="text-[10px] text-anotata-muted italic">+ {tasks.length - 8} mais</div>
                )}
              </div>
            )}

            {/* Adicionar nova tarefa */}
            {showAddTask ? (
              <div className="flex items-center gap-1.5 mt-2">
                <input
                  type="text"
                  autoFocus
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddTask();
                    if (e.key === 'Escape') { setShowAddTask(false); setNewTaskText(''); }
                  }}
                  placeholder="Nova tarefa..."
                  className="flex-1 text-xs bg-anotata-lavanda-clara border border-anotata-border rounded px-2 py-1 focus:outline-none focus:border-anotata-roxo"
                />
                <button
                  onClick={handleAddTask}
                  className="text-[10px] bg-anotata-roxo text-white rounded px-2 py-1 hover:bg-anotata-roxo-escuro"
                >Add</button>
              </div>
            ) : (
              <div className="flex gap-1.5 mt-1">
                <button
                  onClick={() => setShowAddTask(true)}
                  className="text-[10px] text-anotata-roxo border border-dashed border-anotata-border rounded px-2 py-1 hover:border-anotata-roxo flex items-center gap-1"
                >
                  <Plus size={10} /> Tarefa
                </button>
                {checklistStats.open > 0 && (
                  <button
                    onClick={handleMarkAllDone}
                    className="text-[10px] text-anotata-text-suave border border-anotata-border rounded px-2 py-1 hover:border-anotata-roxo hover:text-anotata-roxo flex items-center gap-1"
                  >
                    <CheckCircle size={10} /> Marcar todas
                  </button>
                )}
                <button
                  onClick={handleCopyChecklist}
                  className="text-[10px] text-anotata-text-suave border border-anotata-border rounded px-2 py-1 hover:border-anotata-roxo hover:text-anotata-roxo flex items-center gap-1"
                  title="Copiar checklist como texto"
                >
                  <Copy size={10} /> Copiar
                </button>
              </div>
            )}
          </Section>
        )}

        {/* === DATAS DETECTADAS === */}
        {dates.length > 0 && (
          <Section title="Datas detectadas" icon={Calendar} count={dates.length} defaultOpen={false}>
            <div className="flex flex-wrap gap-1.5">
              {dates.map((d, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-0.5 bg-anotata-lavanda-clara text-anotata-roxo rounded text-[11px] font-medium">
                  <Calendar size={9} />
                  {d}
                </span>
              ))}
            </div>
          </Section>
        )}

        {/* === LINKS DETECTADOS === */}
        {links.length > 0 && (
          <Section title="Links detectados" icon={LinkIcon} count={links.length} defaultOpen={false}>
            <div className="space-y-1">
              {links.slice(0, 5).map((l, i) => (
                <a
                  key={i}
                  href={l}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-anotata-roxo hover:text-anotata-roxo-escuro hover:underline truncate"
                >
                  {l}
                </a>
              ))}
              {links.length > 5 && (
                <div className="text-[10px] text-anotata-muted italic">+ {links.length - 5} mais</div>
              )}
            </div>
          </Section>
        )}

        {/* === CONEXÕES MANUAIS === */}
        <Section title="Conexões manuais" icon={Link2} count={connectedNotes.length} defaultOpen={connectedNotes.length > 0}>
          {connectedNotes.length === 0 ? (
            <p className="text-xs text-anotata-muted italic mb-2">Nenhuma conexão ainda</p>
          ) : (
            <div className="space-y-2 mb-2">
              {connectedNotes.map(({ noteId, reason, createdAt, target }) => {
                const tType = NOTE_TYPES[target.type] || NOTE_TYPES.rascunho;
                return (
                  <div key={noteId} className="bg-anotata-lavanda-clara border border-anotata-lavanda rounded-lg p-2">
                    <button
                      onClick={() => { store.setSelectedNoteId(noteId); store.setCurrentView('all'); }}
                      className="w-full text-left"
                    >
                      <div className="flex items-start gap-1.5">
                        <span className="text-sm">{tType.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-anotata-text truncate hover:text-anotata-roxo">
                            {target.title || 'Sem título'}
                          </div>
                          {reason && (
                            <div className="text-[10px] text-anotata-text-suave italic mt-0.5">"{reason}"</div>
                          )}
                          {createdAt && (
                            <div className="text-[9px] text-anotata-muted mt-0.5">conectado {formatRelativeDate(createdAt)}</div>
                          )}
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => store.disconnectNotes(note.id, noteId)}
                      className="text-[10px] text-anotata-goiaba hover:underline mt-1"
                    >Remover conexão</button>
                  </div>
                );
              })}
            </div>
          )}
          <button
            onClick={onAddConnection}
            className="w-full flex items-center justify-center gap-1.5 p-2 text-xs text-anotata-roxo border border-dashed border-anotata-border hover:border-anotata-roxo rounded-lg hover:bg-anotata-hover transition-colors font-medium"
          >
            <Plus size={12} />
            Adicionar conexão
          </button>
        </Section>

        {/* === CONEXÕES SUGERIDAS === */}
        {connections.length > 0 && (
          <Section title="Conexões sugeridas" icon={Sparkles} count={connections.length} defaultOpen={false}>
            <div className="space-y-2">
              {connections.map(c => {
                const target = store.getNoteById(c.noteId);
                if (!target) return null;
                const tType = NOTE_TYPES[target.type] || NOTE_TYPES.rascunho;
                const strengthColors = {
                  forte: { bg: '#D4F4DD', text: '#0F7A3F' },
                  média: { bg: '#FFF4D9', text: '#9B6F00' },
                  fraca: { bg: '#EDE8F2', text: '#5B2D8E' },
                };
                const sCol = strengthColors[c.strength] || strengthColors.fraca;

                return (
                  <div key={c.noteId} className="bg-white border border-anotata-border rounded-lg p-2 hover:border-anotata-roxo transition-colors">
                    <div className="flex items-start gap-1.5 mb-1">
                      <span className="text-sm">{tType.icon}</span>
                      <div className="flex-1 min-w-0">
                        <button
                          onClick={() => { store.setSelectedNoteId(c.noteId); store.setCurrentView('all'); }}
                          className="text-xs font-medium text-anotata-text truncate hover:text-anotata-roxo block w-full text-left"
                        >
                          {c.title}
                        </button>
                      </div>
                      <span
                        className="text-[9px] px-1.5 py-0.5 rounded font-semibold uppercase"
                        style={{ backgroundColor: sCol.bg, color: sCol.text }}
                      >
                        {c.strength}
                      </span>
                    </div>

                    <div className="text-[10px] text-anotata-text-suave mb-2">
                      {c.reasons.map((r, i) => (
                        <div key={i} className="flex items-start gap-1">
                          <span className="text-anotata-roxo">•</span>
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => store.connectNotes(note.id, c.noteId, c.reasons[0] || 'Sugerida pelo sistema')}
                        className="text-[10px] px-2 py-1 bg-anotata-roxo text-white rounded hover:bg-anotata-roxo-escuro font-medium"
                      >Aceitar</button>
                      <button
                        onClick={() => store.ignoreSuggestion(note.id, c.noteId)}
                        className="text-[10px] px-2 py-1 text-anotata-muted hover:text-anotata-goiaba"
                      >Ignorar</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>
        )}

        {/* === HISTÓRICO === */}
        <Section title="Histórico" icon={History} defaultOpen={false}>
          <div className="space-y-1.5 text-xs">
            <Row label="Criada" value={<span className="text-anotata-text-suave">{formatRelativeDate(note.createdAt)}</span>} />
            <Row label="Última edição" value={<span className="text-anotata-text-suave">{formatRelativeDate(note.updatedAt)}</span>} />
            <Row label="Última revisão" value={<span className="text-anotata-text-suave">{formatRelativeDate(note.reviewedAt)}</span>} />
            <Row label="Edições" value={<span className="text-anotata-text-suave">{note.editCount || 0}</span>} />
            <Row label="Versões salvas" value={<span className="text-anotata-text-suave">{(note.versions || []).length}</span>} />
            <button
              onClick={() => store.markAsReviewed(note.id)}
              className="w-full mt-2 p-1.5 text-[11px] text-anotata-roxo border border-anotata-border hover:border-anotata-roxo rounded-lg hover:bg-anotata-hover transition-colors flex items-center justify-center gap-1"
            >
              <Eye size={11} />
              Marcar como revisada agora
            </button>
          </div>
        </Section>
      </div>
    </aside>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start justify-between gap-2">
      <span className="text-[11px] text-anotata-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
