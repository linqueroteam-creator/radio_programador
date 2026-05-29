/**
 * Testes do ConnectionDetector (PR J)
 *
 * Cobre:
 *  - Detecta sinapses entre notas com vocabulário parecido
 *  - Ignora notas trash/archived
 *  - Ignora notas já conectadas manualmente
 *  - Ignora notas que o usuário marcou como "ignoradas"
 *  - Respeita threshold mínimo
 *  - Respeita limite top-K
 *  - Não retorna a própria nota
 */
import { describe, it, expect } from 'vitest';
import { detectSynapses } from '../ConnectionDetector.js';

function nt(id, title, content, opts = {}) {
  return {
    id,
    title,
    content,
    isTrash: !!opts.isTrash,
    isArchived: !!opts.isArchived,
    manualConnections: opts.manualConnections || [],
    ignoredSuggestions: opts.ignoredSuggestions || [],
  };
}

describe('ConnectionDetector — detectSynapses', () => {
  it('detecta sinapse entre notas com vocabulário parecido', () => {
    const focus = nt('n1', 'Receita de curry', 'Curry de grão de bico com açafrão e óleo de coco');
    const all = [
      focus,
      nt('n2', 'Compras semana', 'Comprar açafrão óleo coco grão bico mercado'),
      nt('n3', 'Reunião trabalho', 'Cliente projeto deadline portfolio'),
    ];
    const result = detectSynapses(focus, all);
    expect(result.length).toBeGreaterThan(0);
    const ids = result.map(r => r.noteId);
    expect(ids).toContain('n2'); // tem palavras compartilhadas
    expect(ids).not.toContain('n3'); // sem palavras compartilhadas
  });

  it('não retorna a própria nota', () => {
    const focus = nt('n1', 'Foo', 'palavra palavra palavra');
    const all = [focus, nt('n2', 'Foo', 'palavra palavra palavra')];
    const result = detectSynapses(focus, all);
    const ids = result.map(r => r.noteId);
    expect(ids).not.toContain('n1');
  });

  it('ignora notas na lixeira', () => {
    const focus = nt('n1', 'Curry', 'curry açafrão grão bico');
    const all = [
      focus,
      nt('n2', 'Curry similar', 'curry açafrão grão bico', { isTrash: true }),
    ];
    const result = detectSynapses(focus, all);
    expect(result.find(r => r.noteId === 'n2')).toBeUndefined();
  });

  it('ignora notas já conectadas manualmente', () => {
    const focus = nt('n1', 'Curry', 'curry açafrão grão bico óleo coco', {
      manualConnections: [{ noteId: 'n2', reason: 'manual' }],
    });
    const all = [
      focus,
      nt('n2', 'Curry similar', 'curry açafrão grão bico óleo coco'),
    ];
    const result = detectSynapses(focus, all);
    expect(result.find(r => r.noteId === 'n2')).toBeUndefined();
  });

  it('ignora notas marcadas como ignoradas pelo usuário', () => {
    const focus = nt('n1', 'Curry', 'curry açafrão grão bico óleo coco', {
      ignoredSuggestions: ['n2'],
    });
    const all = [
      focus,
      nt('n2', 'Curry similar', 'curry açafrão grão bico óleo coco'),
    ];
    const result = detectSynapses(focus, all);
    expect(result.find(r => r.noteId === 'n2')).toBeUndefined();
  });

  it('respeita threshold mínimo (0.25 default) — notas distantes não entram', () => {
    const focus = nt('n1', 'Curry receita', 'curry açafrão grão bico óleo coco mercado');
    const all = [
      focus,
      // Compartilha apenas 1 palavra rara entre vocabulários grandes — sim baixa
      nt('n2', 'Texto longo distante', 'mercado palavra completamente diferente totalmente outro contexto sem semelhança absoluta'),
    ];
    const result = detectSynapses(focus, all, 4, 0.5); // threshold alto
    expect(result.length).toBe(0);
  });

  it('respeita top-K — só retorna até max resultados', () => {
    const focus = nt('n1', 'Foo', 'palavra alpha beta gamma');
    const all = [focus];
    for (let i = 2; i <= 10; i++) {
      all.push(nt(`n${i}`, `Note ${i}`, 'palavra alpha beta gamma'));
    }
    const result = detectSynapses(focus, all, 3, 0.1);
    expect(result.length).toBeLessThanOrEqual(3);
  });

  it('inclui razões (palavras compartilhadas) no resultado', () => {
    const focus = nt('n1', 'Foo', 'curry açafrão grão bico óleo coco');
    const all = [focus, nt('n2', 'Bar', 'curry açafrão receita variação sabor')];
    const result = detectSynapses(focus, all);
    expect(result.length).toBeGreaterThan(0);
    expect(result[0].reasons.length).toBeGreaterThan(0);
  });

  it('retorna lista vazia pra nota sem texto suficiente', () => {
    const focus = nt('n1', 'oi', '');
    const all = [focus, nt('n2', 'Algo', 'texto qualquer com palavras')];
    const result = detectSynapses(focus, all);
    expect(result).toEqual([]);
  });

  it('retorna lista vazia quando allNotes não é array', () => {
    const focus = nt('n1', 'Curry', 'curry açafrão');
    expect(detectSynapses(focus, null)).toEqual([]);
    expect(detectSynapses(focus, undefined)).toEqual([]);
  });
});
