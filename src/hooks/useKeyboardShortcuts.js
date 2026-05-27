import { useEffect } from 'react';

/**
 * ANOTATA — Hook de atalhos de teclado
 *
 * Registra atalhos globais sem conflitar com o navegador.
 * Ignora atalhos quando o foco está em campos de texto que precisam dele
 * (exceto se for Ctrl+K, Esc, etc).
 */

const ALWAYS_ALLOWED = ['Escape'];
const ALLOWED_WITH_MODIFIER = true; // sempre permite Ctrl/Cmd+algo

function isTypingInForm(target) {
  if (!target) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
}

export default function useKeyboardShortcuts(shortcuts) {
  useEffect(() => {
    if (!shortcuts) return;

    const handler = (e) => {
      const isMac = navigator.platform.toLowerCase().includes('mac');
      const ctrlKey = isMac ? e.metaKey : e.ctrlKey;

      // Construir a "chave" do atalho
      const keys = [];
      if (ctrlKey) keys.push('mod');
      if (e.shiftKey) keys.push('shift');
      if (e.altKey) keys.push('alt');
      if (e.key.length === 1) {
        keys.push(e.key.toLowerCase());
      } else {
        keys.push(e.key);
      }
      const combo = keys.join('+');

      // Encontra o handler
      const handler = shortcuts[combo];
      if (!handler) return;

      // Se está digitando em form, só permite combos com modificador OU teclas sempre permitidas
      if (isTypingInForm(e.target)) {
        if (!ctrlKey && !ALWAYS_ALLOWED.includes(e.key)) return;
      }

      // Executa
      e.preventDefault();
      e.stopPropagation();
      handler(e);
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [shortcuts]);
}
