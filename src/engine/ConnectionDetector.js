/**
 * ConnectionDetector — Sinapses automáticas entre notas (PR J)
 *
 * Detecta conexões entre uma nota e outras usando cosine similarity
 * de bag-of-words. Complementa (não substitui) o RulesEngine.suggestConnections,
 * que é heurístico — esse aqui é vetorial.
 *
 * Doc: docs/HIERARQUIA-AREAS-PROJETOS-CADERNOS-NOTAS.md (4.1, função 3)
 *
 * REGRAS:
 *  - Threshold mínimo: similarity >= 0.25 entra na lista
 *  - Top-K (default 4): só os mais similares retornados
 *  - Ignora notas que já estão conectadas manualmente OU foram ignoradas pelo usuário
 *  - 100% local, sem IA externa
 */

import { tokenize, bagOfWords, cosineSimilarity, stripHtml } from './NotebookLinker';

/**
 * Detecta sinapses (conexões automáticas) entre uma nota e o resto.
 *
 * @param {Object} note — nota foco
 * @param {Array} allNotes — todas as notas
 * @param {number} max — top-K resultados (default 4)
 * @param {number} threshold — similarity mínima (default 0.25)
 * @returns {Array<{ noteId: string, similarity: number, reasons: string[] }>}
 */
export function detectSynapses(note, allNotes, max = 4, threshold = 0.25) {
  if (!note || !Array.isArray(allNotes)) return [];
  const noteText = (note.title || '') + ' ' + stripHtml(note.content || '');
  const noteTokens = tokenize(noteText);
  if (noteTokens.length < 2) return [];
  const noteBagWords = bagOfWords(noteTokens);

  const ignoredIds = new Set(note.ignoredSuggestions || []);
  const manualIds = new Set(
    (note.manualConnections || []).map(c => typeof c === 'string' ? c : c?.noteId).filter(Boolean)
  );

  const candidates = [];

  allNotes.forEach(other => {
    if (!other || !other.id || other.id === note.id) return;
    if (other.isTrash || other.isArchived) return;
    if (ignoredIds.has(other.id)) return;
    if (manualIds.has(other.id)) return;

    const otherText = (other.title || '') + ' ' + stripHtml(other.content || '');
    const otherTokens = tokenize(otherText);
    if (otherTokens.length < 2) return;
    const otherBag = bagOfWords(otherTokens);

    const sim = cosineSimilarity(noteBagWords, otherBag);
    if (sim < threshold) return;

    // Tokens compartilhados — pra explicar a sinapse ao usuário (top 3)
    const shared = Object.keys(noteBagWords)
      .filter(t => otherBag[t])
      .sort((a, b) => (noteBagWords[b] + otherBag[b]) - (noteBagWords[a] + otherBag[a]))
      .slice(0, 3);

    candidates.push({
      noteId: other.id,
      similarity: Math.round(sim * 100) / 100,
      reasons: shared.length > 0 ? [`palavras: ${shared.join(', ')}`] : [],
    });
  });

  candidates.sort((a, b) => b.similarity - a.similarity);
  return candidates.slice(0, max);
}

export default { detectSynapses };
