import React from 'react';

/**
 * Estado vazio reutilizável — mostra mensagem amigável quando lista está vazia.
 */
export default function EmptyState({ icon, title, message, action, actionLabel }) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-12">
      {icon && (
        <div className="w-14 h-14 rounded-full bg-anotata-lavanda-clara flex items-center justify-center mb-3 text-2xl">
          {typeof icon === 'string' ? icon : icon}
        </div>
      )}
      <h3 className="text-sm font-semibold text-anotata-text mb-1">{title}</h3>
      {message && (
        <p className="text-xs text-anotata-text-suave max-w-xs leading-relaxed">{message}</p>
      )}
      {action && actionLabel && (
        <button
          onClick={action}
          className="mt-4 px-4 py-2 bg-anotata-roxo text-white text-xs font-medium rounded-lg hover:bg-anotata-roxo-escuro transition-colors"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
