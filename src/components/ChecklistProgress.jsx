import React from 'react';
import { CheckSquare } from 'lucide-react';

/**
 * Barra visual de progresso de checklist
 */
export default function ChecklistProgress({ stats, size = 'sm', showLabel = true }) {
  if (!stats || stats.total === 0) return null;

  const allDone = stats.done === stats.total;
  const colors = allDone
    ? { bar: '#0F7A3F', bg: '#D4F4DD', text: '#0F7A3F' }
    : stats.percent > 50
      ? { bar: '#7C4DC9', bg: '#EDE8F2', text: '#5B2D8E' }
      : { bar: '#E8637C', bg: '#FCE7EB', text: '#C44862' };

  const sizes = {
    sm: { h: 4, text: 'text-2xs', icon: 10, padding: 'px-1.5 py-0.5' },
    md: { h: 6, text: 'text-xs', icon: 11, padding: 'px-2 py-1' },
  };
  const sz = sizes[size];

  return (
    <div className="flex items-center gap-1.5">
      {showLabel && (
        <span
          className={`inline-flex items-center gap-1 rounded-full font-medium ${sz.text} ${sz.padding}`}
          style={{ backgroundColor: colors.bg, color: colors.text }}
        >
          <CheckSquare size={sz.icon} />
          {stats.done}/{stats.total}
        </span>
      )}
      <div
        className="flex-1 rounded-full overflow-hidden"
        style={{ height: sz.h, backgroundColor: colors.bg, minWidth: 30 }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${stats.percent}%`, backgroundColor: colors.bar }}
        />
      </div>
    </div>
  );
}
