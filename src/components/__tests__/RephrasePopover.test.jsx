// Smoke tests dos componentes do bubble menu — confirma que importam
// e que a integração com a engine retorna o esperado.
// Nota: vitest aqui roda em Node sem jsdom, então não testamos render real.
import { describe, it, expect } from 'vitest';

describe('Bubble menu — componentes (smoke)', () => {
  it('RephrasePopover importa sem quebrar', async () => {
    const mod = await import('../RephrasePopover.jsx');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('SelectionBubbleMenu importa sem quebrar', async () => {
    const mod = await import('../SelectionBubbleMenu.jsx');
    expect(mod.default).toBeDefined();
    expect(typeof mod.default).toBe('function');
  });

  it('a engine retorna o modo correto que o popover consome', async () => {
    const { rephrase, MODES } = await import('../../reescritor/index.js');
    expect(MODES).toContain('geral');
    expect(MODES).toContain('formal');
    expect(MODES).toContain('conciso');
    expect(MODES).toContain('fluente');
    expect(MODES).toContain('simples');

    const r = rephrase('vou estar enviando o relatório', 'geral');
    expect(r.result).toMatch(/vou enviar|vou mandar|vou remeter/i);
    expect(r.changes.length).toBeGreaterThan(0);
  });
});
