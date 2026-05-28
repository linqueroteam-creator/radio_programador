import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Flag, Activity, Pin, Archive, Eye, Sparkles } from 'lucide-react';
import { NOTE_TYPES, NOTE_STATUS, NOTE_PRIORITY } from '../engine/RulesEngine';
import IconButton from './ui/IconButton';
import LifeAreaPicker from './LifeAreaPicker';

/**
 * Barra de metadados da nota — badges clicáveis para
 * tipo, status, prioridade, fixar, arquivar.
 */

function Dropdown({ trigger, children, align = 'left' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <button onClick={() => setOpen(!open)} className="inline-flex">
        {trigger}
      </button>
      {open && (
        <div
          className={`absolute top-full mt-1 ${align === 'right' ? 'right-0' : 'left-0'} z-50 bg-white border border-anotata-border rounded-lg shadow-xl py-1 min-w-[180px]`}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function Badge({ icon: Icon, label, color, bg, onClick, suggested }) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all hover:scale-105"
      style={{
        backgroundColor: bg || '#EDE8F2',
        color: color || '#5B2D8E',
        border: suggested ? `1px dashed ${color}` : '1px solid transparent',
      }}
      title={suggested ? 'Sugerido pelas regras locais — clique para mudar' : 'Clique para mudar'}
    >
      {Icon && <Icon size={12} />}
      <span>{label}</span>
      <ChevronDown size={12} className="opacity-60" />
      {suggested && <Sparkles size={12} className="opacity-70" />}
    </button>
  );
}

export default function NoteMetaBar({ note, store, suggestions }) {
  if (!note) return null;

  const typeMeta = NOTE_TYPES[note.type] || NOTE_TYPES.rascunho;
  const statusMeta = NOTE_STATUS[note.status] || NOTE_STATUS.ativo;
  const priorityMeta = NOTE_PRIORITY[note.priority] || NOTE_PRIORITY.normal;

  const typeIsSuggested = suggestions?.suggestedType
    && suggestions.suggestedType !== note.type
    && note.type === 'rascunho';

  const priorityIsSuggested = suggestions?.suggestedPriority
    && suggestions.suggestedPriority !== note.priority
    && note.priority === 'normal';

  return (
    <div className="flex items-center gap-2 flex-wrap mt-2">
      {/* ÁREA DA VIDA (chip com cor da área) */}
      <LifeAreaPicker
        currentArea={note.lifeArea || 'outros'}
        onChange={(newArea) => {
          if (typeof store.updateNote === 'function') {
            store.updateNote(note.id, { lifeArea: newArea });
          }
        }}
        size="sm"
      />

      {/* TIPO */}
      <Dropdown
        trigger={
          <Badge
            label={`${typeMeta.icon} ${typeMeta.label}`}
            color={typeMeta.color}
            bg={typeMeta.color + '15'}
            suggested={typeIsSuggested}
          />
        }
      >
        <div className="px-3 py-1.5 text-2xs uppercase font-semibold text-anotata-muted">Tipo</div>
        {Object.entries(NOTE_TYPES).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => store.updateNote(note.id, { type: key })}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-anotata-hover ${
              note.type === key ? 'bg-anotata-lavanda-clara text-anotata-roxo font-medium' : 'text-anotata-text'
            }`}
          >
            <span>{meta.icon}</span>
            <span>{meta.label}</span>
            {suggestions?.suggestedType === key && (
              <Sparkles size={10} className="ml-auto text-anotata-goiaba" />
            )}
          </button>
        ))}
      </Dropdown>

      {/* STATUS */}
      <Dropdown
        trigger={
          <Badge
            icon={Activity}
            label={statusMeta.label}
            color={statusMeta.color}
            bg={statusMeta.color + '15'}
          />
        }
      >
        <div className="px-3 py-1.5 text-2xs uppercase font-semibold text-anotata-muted">Status</div>
        {Object.entries(NOTE_STATUS).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => store.updateNote(note.id, { status: key })}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-anotata-hover ${
              note.status === key ? 'bg-anotata-lavanda-clara text-anotata-roxo font-medium' : 'text-anotata-text'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: meta.color }}></span>
            <span>{meta.label}</span>
          </button>
        ))}
      </Dropdown>

      {/* PRIORIDADE */}
      <Dropdown
        trigger={
          <Badge
            icon={Flag}
            label={priorityMeta.label}
            color={priorityMeta.color}
            bg={priorityMeta.color + '15'}
            suggested={priorityIsSuggested}
          />
        }
      >
        <div className="px-3 py-1.5 text-2xs uppercase font-semibold text-anotata-muted">Prioridade</div>
        {Object.entries(NOTE_PRIORITY).map(([key, meta]) => (
          <button
            key={key}
            onClick={() => store.updateNote(note.id, { priority: key })}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-anotata-hover ${
              note.priority === key ? 'bg-anotata-lavanda-clara text-anotata-roxo font-medium' : 'text-anotata-text'
            }`}
          >
            <Flag size={12} style={{ color: meta.color }} />
            <span>{meta.label}</span>
            {suggestions?.suggestedPriority === key && (
              <Sparkles size={10} className="ml-auto text-anotata-goiaba" />
            )}
          </button>
        ))}
      </Dropdown>

      {/* SEPARADOR */}
      <div className="w-px h-4 bg-anotata-border"></div>

      {/* PIN */}
      <IconButton
        icon={Pin}
        label={note.isPinned ? 'Desafixar nota' : 'Fixar no topo'}
        onClick={() => store.togglePin(note.id)}
        isActive={note.isPinned}
        iconClassName={note.isPinned ? 'fill-white' : ''}
      />

      {/* MARCAR REVISADA */}
      <IconButton
        icon={Eye}
        label="Marcar como revisada agora"
        onClick={() => store.markAsReviewed(note.id)}
      />

      {/* ARQUIVAR */}
      <IconButton
        icon={Archive}
        label={note.isArchived ? 'Desarquivar' : 'Arquivar'}
        onClick={() => note.isArchived ? store.unarchiveNote(note.id) : store.archiveNote(note.id)}
        isActive={note.isArchived}
        className={note.isArchived ? 'bg-anotata-text-suave text-white hover:bg-anotata-text-suave' : ''}
      />
    </div>
  );
}
