/**
 * Testes do AgentClient — análise completa (PR J)
 *
 * Foca no fluxo `analyzeAndLink` + `onAnalyzedFull`:
 *  - Vinculação automática quando nota é órfã + alta similaridade
 *  - Sinapses detectadas via cosine
 *  - lifeArea NUNCA muda (só inferredLifeArea)
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  analyzeAndLink,
  onAnalyzedFull,
  shutdown,
} from '../agentClient.js';

async function flushDebounce() {
  await vi.advanceTimersByTimeAsync(900);
  await vi.runAllTimersAsync();
  vi.useRealTimers();
  await new Promise((r) => setTimeout(r, 5));
}

describe('agentClient — analyzeAndLink (fallback)', () => {
  beforeEach(() => { shutdown(); });
  afterEach(() => { shutdown(); vi.useRealTimers(); });

  it('vincula nota órfã ao caderno com alta similaridade textual', async () => {
    const received = [];
    onAnalyzedFull((payload) => received.push(payload));

    const note = {
      id: 'orphan1',
      title: 'Treino de hoje',
      content: 'Fui à academia fazer musculação e corrida cardio',
      lifeArea: 'outros',
      notebookId: null, // órfã
    };
    const notebooks = [
      { id: 'saude-nb', name: 'Saúde', lifeArea: 'saude', keywords: ['treino'] },
    ];
    const allNotes = [
      note,
      { id: 'a1', title: 'Treino A', content: 'academia musculação peito', notebookId: 'saude-nb', lifeArea: 'saude' },
      { id: 'a2', title: 'Treino B', content: 'academia corrida cardio', notebookId: 'saude-nb', lifeArea: 'saude' },
    ];

    vi.useFakeTimers();
    analyzeAndLink(note, notebooks, allNotes);
    await flushDebounce();

    expect(received).toHaveLength(1);
    const result = received[0].result;
    expect(result.inferredLifeArea).toBe('saude');
    expect(result.suggestedNotebookId).toBe('saude-nb');
    expect(result.notebookScore).toBeGreaterThanOrEqual(0.6);
  });

  it('NÃO vincula nota não-órfã (já tem caderno)', async () => {
    const received = [];
    onAnalyzedFull((payload) => received.push(payload));

    const note = {
      id: 'n1',
      title: 'Treino',
      content: 'academia musculação',
      lifeArea: 'saude',
      notebookId: 'existing-nb',
    };
    const notebooks = [
      { id: 'existing-nb', name: 'Existing', lifeArea: 'saude' },
      { id: 'other-nb', name: 'Other', lifeArea: 'saude' },
    ];

    vi.useFakeTimers();
    analyzeAndLink(note, notebooks, [note]);
    await flushDebounce();

    expect(received).toHaveLength(1);
    expect(received[0].result.suggestedNotebookId).toBe(null);
  });

  it('detecta sinapses entre notas com vocabulário parecido', async () => {
    const received = [];
    onAnalyzedFull((payload) => received.push(payload));

    const note = {
      id: 'n1',
      title: 'Curry de grão de bico',
      content: 'Receita curry açafrão grão bico óleo coco',
      lifeArea: 'lar',
      notebookId: 'lar-nb',
    };
    const allNotes = [
      note,
      { id: 'similar', title: 'Lista compras', content: 'comprar açafrão óleo coco grão bico mercado', notebookId: 'lar-nb' },
      { id: 'distant', title: 'Reunião', content: 'cliente projeto deadline', notebookId: 'work-nb' },
    ];

    vi.useFakeTimers();
    analyzeAndLink(note, [{ id: 'lar-nb', name: 'Lar', lifeArea: 'lar' }], allNotes);
    await flushDebounce();

    expect(received).toHaveLength(1);
    const synapses = received[0].result.suggestedConnections;
    expect(synapses.length).toBeGreaterThan(0);
    const ids = synapses.map(s => s.noteId);
    expect(ids).toContain('similar');
    expect(ids).not.toContain('distant');
  });
});
