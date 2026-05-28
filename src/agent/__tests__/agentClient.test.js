/**
 * Testes do AgentClient (PR I)
 *
 * Em ambiente de teste (vitest + Node), `Worker` não existe. O cliente
 * automaticamente usa o fallback síncrono — que executa o algoritmo
 * direto no main thread mas mantém a interface assíncrona.
 *
 * Esses testes cobrem:
 *  - Fallback funciona quando Worker está indisponível
 *  - Debounce: várias chamadas seguidas viram 1 análise
 *  - Listener recebe resultado correto pra notas com palavras-chave
 *  - Listener recebe resultado vazio pra notas sem sinal
 *  - Cleanup (off) realmente desinscreve
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  analyzeNote,
  analyzeNotesBatch,
  onAnalyzed,
  shutdown,
} from '../agentClient.js';

describe('agentClient — fallback síncrono (sem Worker)', () => {
  beforeEach(() => {
    shutdown();
  });
  afterEach(() => {
    shutdown();
    vi.useRealTimers();
  });

  it('analyzeNote chama listener com inferredLifeArea pra nota com palavras-chave de saúde', async () => {
    const received = [];
    onAnalyzed((payload) => received.push(payload));

    vi.useFakeTimers();
    analyzeNote({
      id: 'n1',
      title: 'Treino de hoje',
      content: 'Fui à academia, fiz musculação e corrida',
      lifeArea: 'outros',
    });

    // Avança o debounce de 800ms
    await vi.advanceTimersByTimeAsync(900);
    // Drena a microtask do Promise.resolve do fallback
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    // Aguarda a microtask resolver
    await new Promise((r) => setTimeout(r, 0));

    expect(received).toHaveLength(1);
    expect(received[0].noteId).toBe('n1');
    expect(received[0].result.inferredLifeArea).toBe('saude');
    expect(received[0].result.confidenceScore).toBeGreaterThan(0.3);
    expect(received[0].result.keywords.length).toBeGreaterThan(0);
  });

  it('analyzeNote retorna inferredLifeArea null quando nota é genérica', async () => {
    const received = [];
    onAnalyzed((payload) => received.push(payload));

    vi.useFakeTimers();
    analyzeNote({
      id: 'n2',
      title: 'Bla',
      content: 'Texto qualquer sem palavras significativas',
      lifeArea: 'outros',
    });

    await vi.advanceTimersByTimeAsync(900);
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    await new Promise((r) => setTimeout(r, 0));

    expect(received).toHaveLength(1);
    expect(received[0].noteId).toBe('n2');
    expect(received[0].result.inferredLifeArea).toBe(null);
    expect(received[0].result.confidenceScore).toBe(0);
  });

  it('debounce: 5 chamadas seguidas pra mesma nota geram 1 análise', async () => {
    const received = [];
    onAnalyzed((payload) => received.push(payload));

    vi.useFakeTimers();
    for (let i = 0; i < 5; i++) {
      analyzeNote({
        id: 'n3',
        title: 'Reunião com cliente',
        content: 'Agendar entrevista e conversar sobre projeto',
        lifeArea: 'outros',
      });
      await vi.advanceTimersByTimeAsync(100); // intervalo curto
    }

    await vi.advanceTimersByTimeAsync(1000);
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    await new Promise((r) => setTimeout(r, 0));

    // Apesar das 5 chamadas, só deve ter 1 resultado
    expect(received).toHaveLength(1);
    expect(received[0].result.inferredLifeArea).toBe('carreira');
  });

  it('analyzeNotesBatch processa todas em paralelo', async () => {
    const received = [];
    onAnalyzed((payload) => received.push(payload));

    analyzeNotesBatch([
      { id: 'b1', title: 'Comprar açafrão', content: 'Cozinha receitas', lifeArea: 'outros' },
      { id: 'b2', title: 'Treino HIIT', content: 'academia exercício', lifeArea: 'outros' },
    ]);

    // Batch usa fallback síncrono via Promise — espera microtasks
    await new Promise((r) => setTimeout(r, 10));

    expect(received.length).toBeGreaterThanOrEqual(2);
    const ids = received.map(r => r.noteId);
    expect(ids).toContain('b1');
    expect(ids).toContain('b2');
  });

  it('off() desinscreve o listener', async () => {
    const received = [];
    const off = onAnalyzed((payload) => received.push(payload));
    off();

    analyzeNotesBatch([
      { id: 'off1', title: 'Treino', content: 'academia', lifeArea: 'outros' },
    ]);

    await new Promise((r) => setTimeout(r, 10));
    expect(received).toHaveLength(0);
  });

  it('analyzeNote ignora chamadas com nota inválida', () => {
    const received = [];
    onAnalyzed((payload) => received.push(payload));

    analyzeNote(null);
    analyzeNote(undefined);
    analyzeNote({});  // sem id

    expect(received).toHaveLength(0);
  });

  it('nota com lifeArea já manual NÃO recebe inferência', async () => {
    const received = [];
    onAnalyzed((payload) => received.push(payload));

    vi.useFakeTimers();
    analyzeNote({
      id: 'manual',
      title: 'Reunião com cliente',
      content: 'projeto carreira',
      lifeArea: 'saude',  // já classificada manualmente
    });

    await vi.advanceTimersByTimeAsync(900);
    await vi.runAllTimersAsync();
    vi.useRealTimers();
    await new Promise((r) => setTimeout(r, 0));

    expect(received).toHaveLength(1);
    // suggestLifeArea retorna null pra notas já classificadas manualmente
    expect(received[0].result.inferredLifeArea).toBe(null);
  });
});
