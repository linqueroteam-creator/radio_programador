/**
 * Agente Inteligente Local — Web Worker (PR I + PR J)
 *
 * Roda em thread separada pra não travar a UI.
 *
 * Responsabilidades atuais:
 *  - Inferir área da vida (LifeAreaSuggester)            [PR I]
 *  - Vincular nota órfã ao caderno mais provável          [PR J — NotebookLinker]
 *  - Detectar sinapses entre notas (cosine similarity)    [PR J — ConnectionDetector]
 *
 * Protocolo de mensagens:
 *
 *  → main pra worker (tipo 'analyze' — só área):
 *    { type: 'analyze', jobId, note: { id, title, content, lifeArea } }
 *
 *  → main pra worker (tipo 'analyzeAndLink' — completo):
 *    { type: 'analyzeAndLink', jobId, note, notebooks, allNotes }
 *
 *  ← worker pra main (tipo 'analyzed' — só área):
 *    { type: 'analyzed', jobId, noteId, result: { inferredLifeArea, confidenceScore, keywords } }
 *
 *  ← worker pra main (tipo 'analyzedFull' — completo):
 *    { type: 'analyzedFull', jobId, noteId, result: {
 *        inferredLifeArea, confidenceScore, keywords,
 *        suggestedNotebookId, notebookScore, notebookReasons,
 *        suggestedConnections: [{ noteId, similarity, reasons }]
 *    }}
 *
 * REGRAS INVIOLÁVEIS (spec 4.3):
 *  1. Nunca pede permissão. Apenas faz.
 *  2. Toda decisão é reversível.
 *  3. Mostra de forma sutil.
 *  4. Confiança mínima 0.6 pra vinculação automática (já cuidado dentro do NotebookLinker).
 *  5. Aprende com correção implícita (PR futuro).
 */

import { suggestLifeArea } from '../engine/LifeAreaSuggester';
import { linkNoteToNotebook } from '../engine/NotebookLinker';
import { detectSynapses } from '../engine/ConnectionDetector';

self.addEventListener('message', (event) => {
  const data = event.data || {};
  const { type, jobId, note } = data;

  if (type === 'analyze') {
    try {
      const suggestion = suggestLifeArea(note);
      const result = suggestion
        ? {
            inferredLifeArea: suggestion.areaId,
            confidenceScore: suggestion.confidence,
            keywords: suggestion.keywords,
          }
        : { inferredLifeArea: null, confidenceScore: 0, keywords: [] };

      self.postMessage({
        type: 'analyzed',
        jobId,
        noteId: note?.id || null,
        result,
      });
    } catch (err) {
      self.postMessage({
        type: 'error',
        jobId,
        noteId: note?.id || null,
        message: err?.message || 'Erro desconhecido no agente',
      });
    }
    return;
  }

  if (type === 'analyzeAndLink') {
    try {
      const { notebooks = [], allNotes = [] } = data;

      // Componente 1: área da vida
      const suggestion = suggestLifeArea(note);
      const inferredLifeArea = suggestion ? suggestion.areaId : null;
      const confidenceScore = suggestion ? suggestion.confidence : 0;
      const keywords = suggestion ? suggestion.keywords : [];

      // Componente 2: caderno-alvo (só se nota é órfã)
      const validNbIds = new Set(notebooks.map(nb => nb.id));
      const isOrphan = !note?.notebookId || !validNbIds.has(note.notebookId);
      let suggestedNotebookId = null;
      let notebookScore = 0;
      let notebookReasons = [];
      if (isOrphan) {
        // Repassa também a inferência de área pra ajudar o linker
        const noteWithInfer = { ...note, inferredLifeArea };
        const link = linkNoteToNotebook(noteWithInfer, notebooks, allNotes);
        if (link) {
          suggestedNotebookId = link.notebookId;
          notebookScore = link.score;
          notebookReasons = link.reasons || [];
        }
      }

      // Componente 3: sinapses
      const suggestedConnections = detectSynapses(note, allNotes, 4, 0.25);

      self.postMessage({
        type: 'analyzedFull',
        jobId,
        noteId: note?.id || null,
        result: {
          inferredLifeArea,
          confidenceScore,
          keywords,
          suggestedNotebookId,
          notebookScore,
          notebookReasons,
          suggestedConnections,
        },
      });
    } catch (err) {
      self.postMessage({
        type: 'error',
        jobId,
        noteId: note?.id || null,
        message: err?.message || 'Erro desconhecido no agente (analyzeAndLink)',
      });
    }
    return;
  }
});
