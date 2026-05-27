import React from 'react';
import { Clock, AlertCircle, Calendar, X } from 'lucide-react';
import { getDueDateStatus, formatDueDate, getDueDateMeta } from '../engine/DateEngine';

/**
 * Badge visual de prazo. Cor automática conforme status.
 */
export default function DueDateBadge({ dueDate, size = 'sm', onRemove }) {
  if (!dueDate) return null;

  const status = getDueDateStatus(dueDate);
  const meta = getDueDateMeta(status);
  const formatted = formatDueDate(dueDate);

  const Icon = status === 'vencido' ? AlertCircle : status === 'hoje' || status === 'amanha' ? Clock : Calendar;

  const sizes = {
    sm: 'text-[10px] px-1.5 py-0.5 gap-1',
    md: 'text-xs px-2 py-1 gap-1.5',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full ${sizes[size]} ${status === 'vencido' ? 'animate-pulse' : ''}`}
      style={{ backgroundColor: meta.bg, color: meta.color, border: `1px solid ${meta.color}30` }}
      title={`Prazo: ${formatted}`}
    >
      <Icon size={size === 'sm' ? 9 : 11} />
      <span>{formatted}</span>
      {onRemove && (
        <button
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
          className="hover:opacity-70 ml-0.5"
          title="Remover prazo"
        >
          <X size={size === 'sm' ? 9 : 11} />
        </button>
      )}
    </span>
  );
}

export function DueDatePicker({ value, onChange, onClear }) {
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today); nextWeek.setDate(today.getDate() + 7);

  const formatIso = (d) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleQuick = (d) => {
    onChange(d.toISOString());
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <button
          onClick={() => handleQuick(today)}
          className="text-[10px] px-2 py-1 bg-anotata-lavanda-clara text-anotata-roxo rounded hover:bg-anotata-lavanda font-medium"
        >
          Hoje
        </button>
        <button
          onClick={() => handleQuick(tomorrow)}
          className="text-[10px] px-2 py-1 bg-anotata-lavanda-clara text-anotata-roxo rounded hover:bg-anotata-lavanda font-medium"
        >
          Amanhã
        </button>
        <button
          onClick={() => handleQuick(nextWeek)}
          className="text-[10px] px-2 py-1 bg-anotata-lavanda-clara text-anotata-roxo rounded hover:bg-anotata-lavanda font-medium"
        >
          + 1 semana
        </button>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={value ? formatIso(new Date(value)) : ''}
          onChange={(e) => {
            if (e.target.value) {
              const d = new Date(e.target.value + 'T00:00:00');
              onChange(d.toISOString());
            }
          }}
          className="flex-1 text-xs px-2 py-1 bg-anotata-lavanda-clara border border-anotata-border rounded focus:outline-none focus:border-anotata-roxo"
        />
        {value && onClear && (
          <button
            onClick={onClear}
            className="text-[10px] text-anotata-goiaba hover:underline"
          >
            Remover
          </button>
        )}
      </div>
    </div>
  );
}
