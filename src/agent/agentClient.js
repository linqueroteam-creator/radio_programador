/**
 * Agente Inteligente Local — Cliente (PR I + PR J)
 *
 * Interface entre main thread (React) e o Web Worker que roda o agente.
 *
 * Características:
 *  - Singleton: uma única instância de Worker pra toda a app
 *  - Debounce: ao salvar/editar uma nota muitas vezes seguidas, só
 *    analisa uma vez no fim (evita rodar 50x enquanto o usuário digita)
 *  - Fallback síncrono: em ambientes sem Worker (Node/testes), roda
 *    a análise direto no main thread (com Promise.resolve pra preservar
 *    a interface assíncrona)
 *  - Defensivo: nunca derruba a app se o worker falhar
 *
 * Uso:
 *   import { analyzeNote, analyzeAndLink, onAnalyzed, onAnalyzedFull } from './agent/agentClient';
 *   onAnalyzedFull(({ noteId, result }) => { ... persiste no store ... });
 *   analyzeAndLink(note, notebooks, allNotes);  // dispara em background
 *
 * Doc: docs/HIERARQUIA-AREAS-PROJETOS-CADERNOS-NOTAS.md (seção 4)
 */

import { suggestLifeArea } from '../engine/LifeAreaSuggester';
import { linkNoteToNotebook } from '../engine/NotebookLinker';
import { detectSynapses } from '../engine/ConnectionDetector';

// Tempo de debounce: ao receber várias chamadas pra mesma nota, espera
// 800ms de "silêncio" antes de mandar pro worker.
const DEBOUNCE_MS = 800;

// Estado interno do módulo
let worker = null;
let workerInitFailed = false;
const debounceTimers = new Map();    // noteId → timeoutId
const listeners = new Set();         // callbacks pra resultados 'analyzed' (só área — PR I)
const fullListeners = new Set();     // callbacks pra resultados 'analyzedFull' (completo — PR J)
let nextJobId = 1;

/**
 * Tenta criar o worker. Retorna true se conseguiu, false se ambiente
 * não suporta (Node, jsdom, etc.) — nesse caso usamos fallback.
 */
function ensureWorker() {
  if (worker || workerInitFailed) return !!worker;
  if (typeof Worker === 'undefined') {
    workerInitFailed = true;
    return false;
  }
  try {
    worker = new Worker(new URL('./agentWorker.js', import.meta.url), { type: 'module' });
    worker.addEventListener('message', handleWorkerMessage);
    worker.addEventListener('error', (e) => {
      // eslint-disable-next-line no-console
      console.warn('[agentClient] Worker error:', e?.message || e);
    });
    return true;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[agentClient] Falha ao iniciar worker, usando fallback síncrono:', err?.message);
    workerInitFailed = true;
    worker = null;
    return false;
  }
}

function handleWorkerMessage(event) {
  const data = event?.data;
  if (!data) return;
  if (data.type === 'analyzed') {
    notifyListeners(listeners, { noteId: data.noteId, result: data.result });
  } else if (data.type === 'analyzedFull') {
    notifyListeners(fullListeners, { noteId: data.noteId, result: data.result });
  }
}

function notifyListeners(set, payload) {
  set.forEach((cb) => {
    try { cb(payload); } catch (_) { /* defensivo */ }
  });
}

/**
 * Roda só inferência de área no main thread (fallback PR I).
 */
function runFallbackAnalyze(note) {
  Promise.resolve().then(() => {
    try {
      const suggestion = suggestLifeArea(note);
      const result = suggestion
        ? {
            inferredLifeArea: suggestion.areaId,
            confidenceScore: suggestion.confidence,
            keywords: suggestion.keywords,
          }
        : { inferredLifeArea: null, confidenceScore: 0, keywords: [] };
      notifyListeners(listeners, { noteId: note?.id || null, result });
    } catch (_) { /* defensivo */ }
  });
}

/**
 * Roda análise completa no main thread (fallback PR J).
 */
function runFallbackAnalyzeFull(note, notebooks, allNotes) {
  Promise.resolve().then(() => {
    try {
      const suggestion = suggestLifeArea(note);
      const inferredLifeArea = suggestion ? suggestion.areaId : null;
      const confidenceScore = suggestion ? suggestion.confidence : 0;
      const keywords = suggestion ? suggestion.keywords : [];

      const validNbIds = new Set((notebooks || []).map(nb => nb.id));
      const isOrphan = !note?.notebookId || !validNbIds.has(note.notebookId);
      let suggestedNotebookId = null;
      let notebookScore = 0;
      let notebookReasons = [];
      if (isOrphan) {
        const noteWithInfer = { ...note, inferredLifeArea };
        const link = linkNoteToNotebook(noteWithInfer, notebooks || [], allNotes || []);
        if (link) {
          suggestedNotebookId = link.notebookId;
          notebookScore = link.score;
          notebookReasons = link.reasons || [];
        }
      }

      const suggestedConnections = detectSynapses(note, allNotes || [], 4, 0.25);

      const result = {
        inferredLifeArea,
        confidenceScore,
        keywords,
        suggestedNotebookId,
        notebookScore,
        notebookReasons,
        suggestedConnections,
      };
      notifyListeners(fullListeners, { noteId: note?.id || null, result });
    } catch (_) { /* defensivo */ }
  });
}

/**
 * Pede análise simples (só área da vida) — PR I.
 * Mantida pra compatibilidade. Pra a análise completa (com linker e sinapses),
 * use `analyzeAndLink`.
 */
export function analyzeNote(note) {
  if (!note || !note.id) return;
  const noteId = note.id;
  const existing = debounceTimers.get(noteId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    debounceTimers.delete(noteId);
    if (ensureWorker() && worker) {
      worker.postMessage({
        type: 'analyze',
        jobId: nextJobId++,
        note: {
          id: note.id,
          title: note.title || '',
          content: note.content || '',
          lifeArea: note.lifeArea || 'outros',
        },
      });
    } else {
      runFallbackAnalyze(note);
    }
  }, DEBOUNCE_MS);

  debounceTimers.set(noteId, timer);
}

/**
 * Análise completa (PR J): área + linker + sinapses.
 * Recebe contexto (notebooks e allNotes) pra que o agente possa decidir
 * sobre vinculação de caderno e detectar conexões textuais.
 *
 * @param {Object} note
 * @param {Array} notebooks
 * @param {Array} allNotes
 */
export function analyzeAndLink(note, notebooks, allNotes) {
  if (!note || !note.id) return;
  const noteId = note.id;
  const existing = debounceTimers.get(noteId);
  if (existing) clearTimeout(existing);

  const timer = setTimeout(() => {
    debounceTimers.delete(noteId);
    if (ensureWorker() && worker) {
      worker.postMessage({
        type: 'analyzeAndLink',
        jobId: nextJobId++,
        note: {
          id: note.id,
          title: note.title || '',
          content: note.content || '',
          lifeArea: note.lifeArea || 'outros',
          notebookId: note.notebookId || null,
          ignoredSuggestions: note.ignoredSuggestions || [],
          manualConnections: note.manualConnections || [],
        },
        notebooks: (notebooks || []).map(nb => ({
          id: nb.id,
          name: nb.name,
          lifeArea: nb.lifeArea || 'outros',
          keywords: nb.keywords || [],
        })),
        allNotes: (allNotes || []).map(n => ({
          id: n.id,
          title: n.title || '',
          content: n.content || '',
          notebookId: n.notebookId,
          lifeArea: n.lifeArea || 'outros',
          isTrash: !!n.isTrash,
          isArchived: !!n.isArchived,
        })),
      });
    } else {
      runFallbackAnalyzeFull(note, notebooks, allNotes);
    }
  }, DEBOUNCE_MS);

  debounceTimers.set(noteId, timer);
}

/**
 * Versão batch da análise simples (só área).
 */
export function analyzeNotesBatch(notes) {
  if (!Array.isArray(notes)) return;
  notes.forEach((note) => {
    if (!note || !note.id) return;
    if (ensureWorker() && worker) {
      worker.postMessage({
        type: 'analyze',
        jobId: nextJobId++,
        note: {
          id: note.id,
          title: note.title || '',
          content: note.content || '',
          lifeArea: note.lifeArea || 'outros',
        },
      });
    } else {
      runFallbackAnalyze(note);
    }
  });
}

/**
 * Listener pra resultado simples (só área da vida — PR I).
 */
export function onAnalyzed(cb) {
  if (typeof cb !== 'function') return () => {};
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * Listener pra resultado completo (área + linker + sinapses — PR J).
 */
export function onAnalyzedFull(cb) {
  if (typeof cb !== 'function') return () => {};
  fullListeners.add(cb);
  return () => fullListeners.delete(cb);
}

/**
 * Desliga o worker e limpa estado interno (testes, hot reload).
 */
export function shutdown() {
  if (worker) {
    try { worker.terminate(); } catch (_) { /* defensivo */ }
    worker = null;
  }
  workerInitFailed = false;
  debounceTimers.forEach((t) => clearTimeout(t));
  debounceTimers.clear();
  listeners.clear();
  fullListeners.clear();
}

export default { analyzeNote, analyzeAndLink, analyzeNotesBatch, onAnalyzed, onAnalyzedFull, shutdown };
