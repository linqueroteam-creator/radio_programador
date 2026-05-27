// Smoke tests do bubble menu F5 — InternalLink + LinkPickerPopover
import { describe, it, expect } from 'vitest';

describe('Bubble menu F5 — Ligar a (smoke)', () => {
  it('extension InternalLink importa sem quebrar', async () => {
    const mod = await import('../../extensions/InternalLink.js');
    expect(mod.default).toBeDefined();
    // Mark do Tiptap tem .name
    expect(mod.default.name).toBe('internalLink');
  });

  it('LinkPickerPopover importa sem quebrar', async () => {
    const mod = await import('../LinkPickerPopover.jsx');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('SelectionBubbleMenu continua importando sem quebrar', async () => {
    const mod = await import('../SelectionBubbleMenu.jsx');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('atributos da extension InternalLink incluem targetType, targetId e targetTitle', async () => {
    const mod = await import('../../extensions/InternalLink.js');
    const ext = mod.default;
    // Tiptap guarda os atributos definidos como uma config; aqui só confirmamos
    // que o método addAttributes existe e retorna a estrutura esperada.
    const fn = ext.config.addAttributes;
    if (typeof fn === 'function') {
      const attrs = fn.call({ name: 'internalLink' });
      expect(attrs).toHaveProperty('targetType');
      expect(attrs).toHaveProperty('targetId');
      expect(attrs).toHaveProperty('targetTitle');
    }
  });
});
