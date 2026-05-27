import React, { useMemo, useState, useCallback } from 'react';
import {
  Clock, FileText, Pencil, CheckCircle2, Target, Calendar,
  Link2, History, X, Filter
} from 'lucide-react';

/**
 * ===== LINHA DO TEMPO =====
 *
 * Mostra a vida das suas notas como um rio cronológico:
 *  - notas criadas
 *  - notas editadas
 *  - notas revisadas (reviewedAt)
 *  - notas concluídas (status === "concluído")
 *  - prazos (dueDate)
 *  - conexões manuais criadas
 *  - versões salvas
 *
 * Tudo lido dos campos que JÁ EXISTEM nas notas. Nenhum dado novo
 * é gerado, nenhum store é alterado. Só leitura.
 *
 * Defesas anti-tela-branca:
 *  - TODOS os hooks no topo, antes de qualquer return condicional
 *  - try/catch em parseDate, fallbacks pra campos faltantes
 *  - se não tiver evento nenhum, exibe estado vazio amigável
 */

// === Tipos de evento ===
const EVENT_TYPES = {
  created:    { icon: FileText,     color: '#5B2D8E', bg: '#EDE8F2', label: 'Criada' },
  edited:     { icon: Pencil,       color: '#5B4A7A', bg: '#F2F1F4', label: 'Editada' },
  reviewed:   { icon: CheckCircle2, color: '#0F7A3F', bg: '#D4F4DD', label: 'Revisada' },
  completed:  { icon: Target,       color: '#0F7A3F', bg: '#D4F4DD', label: 'Concluída' },
  due:        { icon: Calendar,     color: '#9B6F00', bg: '#FFF4D9', label: 'Prazo' },
  dueOverdue: { icon: Calendar,     color: '#E8637C', bg: '#FCE7EB', label: 'Prazo vencido' },
  connected:  { icon: Link2,        color: '#5B2D8E', bg: '#EDE8F2', label: 'Conexão criada' },
  versioned:  { icon: History,      color: '#5B4A7A', bg: '#F2F1F4', label: 'Versão salva' },
};

const FILTER_GROUPS = [
  { id: 'created',  label: 'Criadas' },
  { id: 'edited',   label: 'Editadas' },
  { id: 'reviewed', label: 'Revisadas' },
  { id: 'completed', label: 'Concluídas' },
  { id: 'due',      label: 'Prazos' },
  { id: 'connected', label: 'Conexões' },
  { id: 'versioned', label: 'Versões' },
];

function safeDate(value) {
  if (!value) return null;
  try {
    const d = new Date(value);
    if (isNaN(d.getTime())) return null;
    return d;
  } catch (_) { return null; }
}

function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function bucketFor(eventDate, now) {
  const today = startOfDay(now);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const eventDay = startOfDay(eventDate);

  if (eventDay.getTime() === today.getTime()) return 'hoje';
  if (eventDay.getTime() === yesterday.getTime()) return 'ontem';
  if (eventDay.getTime() >= weekAgo.getTime()) return 'semana';
  if (eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear()) return 'mes';
  return 'antigo';
}

const BUCKET_ORDER = ['hoje', 'ontem', 'semana', 'mes', 'antigo'];
const BUCKET_LABELS = {
  hoje: 'Hoje',
  ontem: 'Ontem',
  semana: 'Esta semana',
  mes: 'Este mês',
  antigo: 'Mais antigo',
};

function formatTime(d) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function formatDate(d) {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export default function Timeline({ store, onOpenMobileMenu }) {
  // ====== TODOS OS HOOKS NO TOPO ======
  const [activeFilters, setActiveFilters] = useState(() => new Set(FILTER_GROUPS.map(f => f.id)));

  const toggleFilter = useCallback((id) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleOpenNote = useCallback((noteId) => {
    if (!noteId) return;
    store.setSelectedNoteId(noteId);
    store.setCurrentView('all');
  }, [store]);

  // === Constrói lista de eventos a partir das notas (puramente leitura) ===
  const events = useMemo(() => {
    const all = [];
    const now = new Date();
    const notes = (store.notes || []).filter(n => !n.isTrash);

    for (const note of notes) {
      const noteId = note.id;
      const noteTitle = note.title || 'Sem título';

      // criação
      const created = safeDate(note.createdAt);
      if (created) {
        all.push({ type: 'created', date: created, noteId, noteTitle, note });
      }

      // edição (só se passou mais de 1 minuto da criação)
      const updated = safeDate(note.updatedAt);
      if (updated && created && (updated.getTime() - created.getTime()) > 60_000) {
        all.push({ type: 'edited', date: updated, noteId, noteTitle, note });
      }

      // revisão
      const reviewed = safeDate(note.reviewedAt);
      if (reviewed) {
        all.push({ type: 'reviewed', date: reviewed, noteId, noteTitle, note });
      }

      // conclusão (status === 'concluído', usa updatedAt como aproximação)
      if (note.status === 'concluído' && updated) {
        all.push({ type: 'completed', date: updated, noteId, noteTitle, note });
      }

      // prazo
      const due = safeDate(note.dueDate);
      if (due) {
        const overdue = due < now && note.status !== 'concluído';
        all.push({
          type: overdue ? 'dueOverdue' : 'due',
          date: due,
          noteId, noteTitle, note,
          subtype: 'due',
        });
      }

      // conexões manuais
      for (const conn of (note.manualConnections || [])) {
        if (typeof conn === 'string') continue; // formato antigo, sem data
        const cd = safeDate(conn.createdAt);
        if (!cd) continue;
        all.push({
          type: 'connected',
          date: cd,
          noteId, noteTitle, note,
          extra: conn,
        });
      }

      // versões salvas
      for (const v of (note.versions || [])) {
        const vd = safeDate(v.timestamp);
        if (!vd) continue;
        all.push({
          type: 'versioned',
          date: vd,
          noteId, noteTitle, note,
          extra: v,
        });
      }
    }

    // Ordena: mais recente primeiro
    all.sort((a, b) => b.date.getTime() - a.date.getTime());
    return all;
  }, [store.notes]);

  // === Filtra ===
  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      // 'dueOverdue' compartilha o filtro 'due'
      const filterId = e.type === 'dueOverdue' ? 'due' : e.type;
      return activeFilters.has(filterId);
    });
  }, [events, activeFilters]);

  // === Agrupa por bucket ===
  const grouped = useMemo(() => {
    const now = new Date();
    const out = { hoje: [], ontem: [], semana: [], mes: [], antigo: [] };
    for (const e of filteredEvents) {
      out[bucketFor(e.date, now)].push(e);
    }
    return out;
  }, [filteredEvents]);

  const totalEvents = filteredEvents.length;
  const totalRaw = events.length;

  // ====== RENDER ======
  return (
    <div className="flex-1 flex flex-col h-full bg-anotata-bg overflow-hidden">
      {/* === HEADER === */}
      <div className="px-4 sm:px-6 py-4 border-b border-anotata-border bg-white">
        <div className="flex items-center gap-3 mb-3">
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
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-anotata-roxo to-anotata-roxo-escuro flex items-center justify-center text-white shadow-sm">
            <Clock size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-anotata-text">Linha do tempo</h1>
            <p className="text-xs text-anotata-text-suave">
              {totalEvents === totalRaw
                ? `${totalEvents} ${totalEvents === 1 ? 'evento' : 'eventos'} no total`
                : `${totalEvents} de ${totalRaw} eventos exibidos · ${totalRaw - totalEvents} ocultos por filtro`}
            </p>
          </div>
        </div>

        {/* === Chips de filtro === */}
        <div className="flex flex-wrap items-center gap-1.5">
          <Filter size={12} className="text-anotata-muted mr-0.5" />
          {FILTER_GROUPS.map(f => {
            const active = activeFilters.has(f.id);
            const meta = EVENT_TYPES[f.id];
            const Icon = meta.icon;
            return (
              <button
                key={f.id}
                onClick={() => toggleFilter(f.id)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-all ${
                  active
                    ? 'border-transparent text-white'
                    : 'border-anotata-border text-anotata-text-suave hover:border-anotata-roxo'
                }`}
                style={active ? { backgroundColor: meta.color } : {}}
                title={active ? `Ocultar ${f.label.toLowerCase()}` : `Mostrar ${f.label.toLowerCase()}`}
              >
                <Icon size={10} />
                {f.label}
              </button>
            );
          })}
          {activeFilters.size < FILTER_GROUPS.length && (
            <button
              onClick={() => setActiveFilters(new Set(FILTER_GROUPS.map(f => f.id)))}
              className="ml-1 text-2xs text-anotata-muted hover:text-anotata-roxo underline"
            >
              mostrar tudo
            </button>
          )}
        </div>
      </div>

      {/* === RIVER === */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {totalEvents === 0 ? (
          <EmptyState hasFilters={activeFilters.size < FILTER_GROUPS.length} />
        ) : (
          <div className="max-w-3xl mx-auto">
            {BUCKET_ORDER.map(bucket => {
              const items = grouped[bucket];
              if (!items || items.length === 0) return null;
              return (
                <BucketSection
                  key={bucket}
                  label={BUCKET_LABELS[bucket]}
                  items={items}
                  onOpenNote={handleOpenNote}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// =================== Subcomponentes ===================

function BucketSection({ label, items, onOpenNote }) {
  return (
    <section className="mb-7">
      <h2 className="sticky top-0 z-10 -mx-6 px-6 py-2 bg-anotata-bg/95 backdrop-blur-sm text-2xs uppercase font-bold tracking-wider text-anotata-muted">
        {label} <span className="text-anotata-text-suave">· {items.length}</span>
      </h2>
      <ol className="relative ml-3 mt-2 border-l-2 border-anotata-lavanda">
        {items.map((event, idx) => (
          <EventItem key={`${event.type}-${event.noteId}-${event.date.getTime()}-${idx}`} event={event} onOpenNote={onOpenNote} />
        ))}
      </ol>
    </section>
  );
}

function EventItem({ event, onOpenNote }) {
  const meta = EVENT_TYPES[event.type] || EVENT_TYPES.created;
  const Icon = meta.icon;

  const description = describeEvent(event);

  return (
    <li className="relative pl-6 pr-2 py-2.5 group">
      {/* Bolinha colorida */}
      <span
        className="absolute -left-[10px] top-3.5 w-[18px] h-[18px] rounded-full flex items-center justify-center ring-4 ring-anotata-bg group-hover:scale-110 transition-transform"
        style={{ backgroundColor: meta.color }}
      >
        <Icon size={10} color="white" strokeWidth={3} />
      </span>

      <button
        onClick={() => onOpenNote(event.noteId)}
        className="w-full text-left rounded-xl border border-transparent hover:border-anotata-border hover:bg-white px-3 py-2 transition-all"
      >
        <div className="flex items-center gap-2 mb-0.5">
          <span
            className="text-2xs uppercase font-bold tracking-wider px-1.5 py-0.5 rounded"
            style={{ backgroundColor: meta.bg, color: meta.color }}
          >
            {meta.label}
          </span>
          <span className="text-xs text-anotata-muted">
            {formatTime(event.date)} · {formatDate(event.date)}
          </span>
        </div>
        <div className="text-sm text-anotata-text leading-snug">
          {description}
        </div>
      </button>
    </li>
  );
}

function describeEvent(event) {
  const title = (
    <strong className="text-anotata-roxo">{event.noteTitle}</strong>
  );

  switch (event.type) {
    case 'created':
      return <>Você criou {title}</>;
    case 'edited':
      return <>Última edição em {title}</>;
    case 'reviewed':
      return <>Você marcou {title} como revisada</>;
    case 'completed':
      return <>{title} foi concluída</>;
    case 'due':
      return <>{title} tem prazo para {formatDate(event.date)}</>;
    case 'dueOverdue':
      return <>{title} ultrapassou o prazo de {formatDate(event.date)}</>;
    case 'connected': {
      const reason = event.extra && event.extra.reason;
      return <>Conexão criada em {title}{reason ? ` — "${reason}"` : ''}</>;
    }
    case 'versioned':
      return <>Snapshot de versão salvo em {title}</>;
    default:
      return <>Evento em {title}</>;
  }
}

function EmptyState({ hasFilters }) {
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center max-w-sm py-10">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-anotata-lavanda-clara to-anotata-lavanda mx-auto mb-4 flex items-center justify-center">
          <Clock size={26} className="text-anotata-roxo" />
        </div>
        <h3 className="text-base font-semibold text-anotata-text mb-1.5">
          {hasFilters ? 'Nenhum evento com esses filtros' : 'Sua linha do tempo aparecerá aqui'}
        </h3>
        <p className="text-sm text-anotata-text-suave">
          {hasFilters
            ? 'Habilite mais tipos de evento nos chips acima para ver mais coisas.'
            : 'Quando você criar, editar, revisar ou conectar notas, os eventos aparecem aqui agrupados por dia, semana e mês.'}
        </p>
      </div>
    </div>
  );
}
