/**
 * Agente Inteligente Local — Web Worker (PR I)
 *
 * Roda em thread separada pra não travar a UI.
 * Receive mensagens do main thread, processa em background, devolve resultado.
 *
 * Responsabilidades nesta fase (esqueleto):
 *  - Inferir área da vida usando o LifeAreaSuggester existente
 *
 * Fases futuras (PR J em diante):
 *  - Vincular nota órfã ao caderno mais provável
 *  - Detectar conexões entre notas (cosine similarity)
 *  - Sugerir tags
 *
 * Protocolo de mensagens:
 *  → main pra worker:
 *    { type: 'analyze', jobId, note: { id, title, content, lifeArea } }
 *  ← worker pra main:
 *    { type: 'analyzed', jobId, noteId, result: { inferredLifeArea, confidenceScore, keywords } }
 *
 * REGRAS INVIOLÁVEIS DO AGENTE (spec 4.3):
 *  1. Nunca pede permissão. Apenas faz.
 *  2. Toda decisão é reversível.
 *  3. Mostra o que fez de forma sutil.
 *  4. Confiança mínima 0.6 pra vinculação automática (no PR J).
 *  5. Aprende com correção implícita (PR futuro).
 */

import { suggestLifeArea } from '../engine/LifeAreaSuggester';

// Listener principal — toda mensagem entra aqui
self.addEventListener('message', (event) => {
  const { type, jobId, note } = event.data || {};

  if (type === 'analyze') {
    try {
      const suggestion = suggestLifeArea(note);
      // suggestLifeArea retorna null quando:
      //  - nota tem lifeArea manual diferente de 'outros' (já classificada)
      //  - texto muito curto
      //  - confiança abaixo de 0.3
      const result = suggestion
        ? {
            inferredLifeArea: suggestion.areaId,
            confidenceScore: suggestion.confidence,
            keywords: suggestion.keywords,
          }
        : {
            inferredLifeArea: null,
            confidenceScore: 0,
            keywords: [],
          };

      self.postMessage({
        type: 'analyzed',
        jobId,
        noteId: note?.id || null,
        result,
      });
    } catch (err) {
      // Defensivo: nunca derruba o worker
      self.postMessage({
        type: 'error',
        jobId,
        noteId: note?.id || null,
        message: err?.message || 'Erro desconhecido no agente',
      });
    }
  }
});
