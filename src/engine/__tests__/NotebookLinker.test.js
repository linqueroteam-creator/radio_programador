/**
 * Testes do NotebookLinker (PR J)
 *
 * Cobre:
 *  - Não vincula nota sem texto suficiente
 *  - Não vincula quando score < 0.6 (regra inviolável)
 *  - Vincula corretamente quando texto + área batem
 *  - Boost de área da vida: nota saúde + caderno saúde → score alto
 *  - Quebra de empate por quantidade (caderno vazio não ganha)
 */
import { describe, it, expect } from 'vitest';
import {
  linkNoteToNotebook,
  tokenize,
  cosineSimilarity,
  bagOfWords,
} from '../NotebookLinker.js';

function nb(id, name, lifeArea = 'outros', keywords = []) {
  return { id, name, lifeArea, keywords };
}

function nt(id, title, content, opts = {}) {
  return {
    id,
    title,
    content,
    notebookId: opts.notebookId !== undefined ? opts.notebookId : null,
    lifeArea: opts.lifeArea || 'outros',
    inferredLifeArea: opts.inferredLifeArea || null,
    isTrash: false,
    isArchived: false,
  };
}

describe('NotebookLinker — funções utilitárias', () => {
  it('tokenize remove stopwords e palavras curtas', () => {
    const tokens = tokenize('Eu fui à academia hoje fazer treino de musculação');
    // 'Eu', 'fui', 'à', 'hoje', 'de' são stopwords ou curtas
    expect(tokens).toContain('academia');
    expect(tokens).toContain('treino');
    expect(tokens).toContain('musculação');
    expect(tokens).not.toContain('eu');
    expect(tokens).not.toContain('fui');
  });

  it('cosineSimilarity de bags iguais retorna 1', () => {
    const b1 = bagOfWords(['palavra', 'comum', 'palavra']);
    const b2 = bagOfWords(['palavra', 'comum', 'palavra']);
    expect(cosineSimilarity(b1, b2)).toBeCloseTo(1, 5);
  });

  it('cosineSimilarity de bags disjuntos retorna 0', () => {
    const b1 = bagOfWords(['gato', 'cachorro']);
    const b2 = bagOfWords(['carro', 'avião']);
    expect(cosineSimilarity(b1, b2)).toBe(0);
  });
});

describe('NotebookLinker — linkNoteToNotebook', () => {
  it('retorna null quando nota não tem texto significativo', () => {
    const note = nt('n1', 'oi', '');
    const notebooks = [nb('a', 'Caderno A', 'saude')];
    expect(linkNoteToNotebook(note, notebooks, [])).toBeNull();
  });

  it('retorna null quando não há cadernos', () => {
    const note = nt('n1', 'Treino academia', 'fui treinar musculação corrida');
    expect(linkNoteToNotebook(note, [], [])).toBeNull();
  });

  it('retorna null quando score fica abaixo de 0.6 (não chuta)', () => {
    // Nota genérica + caderno sem afinidade nenhuma → não atinge 0.6
    const note = nt('n1', 'Algo aleatório', 'palavras totalmente diferentes contexto único');
    const notebooks = [nb('a', 'Caderno A', 'outros')]; // outros, sem área compatível
    const allNotes = []; // caderno vazio → sem similaridade textual
    expect(linkNoteToNotebook(note, notebooks, allNotes)).toBeNull();
  });

  it('vincula corretamente quando texto + área inferida batem', () => {
    const note = nt('n1', 'Treino de hoje', 'Fui à academia fazer musculação corrida cardio',
      { inferredLifeArea: 'saude' });
    const notebooks = [
      nb('saude-nb', 'Saúde e treinos', 'saude', ['treino', 'academia']),
      nb('outros-nb', 'Genérico', 'outros'),
    ];
    const allNotes = [
      nt('a1', 'Treino A', 'academia musculação peito', { notebookId: 'saude-nb', lifeArea: 'saude' }),
      nt('a2', 'Treino B', 'academia corrida cardio', { notebookId: 'saude-nb', lifeArea: 'saude' }),
    ];
    const result = linkNoteToNotebook(note, notebooks, allNotes);
    expect(result).not.toBeNull();
    expect(result.notebookId).toBe('saude-nb');
    expect(result.score).toBeGreaterThanOrEqual(0.6);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('escolhe o caderno com maior afinidade entre múltiplos candidatos', () => {
    const note = nt('n1', 'Reunião com cliente', 'projeto deadline freelance portfolio entrevista',
      { inferredLifeArea: 'carreira' });
    const notebooks = [
      nb('carreira-nb', 'Trabalho', 'carreira', ['cliente', 'projeto']),
      nb('saude-nb', 'Saúde', 'saude'),
    ];
    const allNotes = [
      nt('c1', 'Reunião X', 'projeto cliente entrevista deadline freelance',
        { notebookId: 'carreira-nb', lifeArea: 'carreira' }),
      nt('c2', 'Treino', 'academia musculação',
        { notebookId: 'saude-nb', lifeArea: 'saude' }),
    ];
    const result = linkNoteToNotebook(note, notebooks, allNotes);
    expect(result).not.toBeNull();
    expect(result.notebookId).toBe('carreira-nb');
  });

  it('respeita lifeArea já manual da nota (usa em vez de inferredLifeArea)', () => {
    // Nota com lifeArea manual = 'lar'. Deve dar boost pra caderno 'lar' mesmo
    // que inferredLifeArea aponte pra outra área.
    const note = nt('n1', 'Receitas saudáveis pra cozinha',
      'compras receita cozinha mercado feira ingredientes preparo refeição',
      { lifeArea: 'lar', inferredLifeArea: 'saude' });
    const notebooks = [
      nb('lar-nb', 'Casa', 'lar', ['receita']),
      nb('saude-nb', 'Saúde', 'saude'),
    ];
    // Densidade no caderno lar pra atingir 0.6
    const allNotes = [
      nt('l1', 'Compras semana', 'compras receita cozinha mercado feira',
        { notebookId: 'lar-nb', lifeArea: 'lar' }),
      nt('l2', 'Almoço domingo', 'cozinha receita ingredientes refeição preparo',
        { notebookId: 'lar-nb', lifeArea: 'lar' }),
      nt('l3', 'Lista mercado', 'mercado feira compras ingredientes',
        { notebookId: 'lar-nb', lifeArea: 'lar' }),
    ];
    const result = linkNoteToNotebook(note, notebooks, allNotes);
    expect(result).not.toBeNull();
    expect(result.notebookId).toBe('lar-nb');
  });
});
