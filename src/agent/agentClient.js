/**
 * Agente Inteligente Local — Cliente (PR I)
 *
 * Interface entre main thread (React) e o Web Worker que roda o agente.
 *
 * Características:
 *  - Singleton: uma única instância de Worker pra toda a app
 *  - Debounce: ao salvar/editar uma nota muitas vezes seguidas, só
 *    analisa uma vez no fim (evita rodar 50x enquanto o usuário digita)
 *  - Fallback síncrono: em ambientes sem Worker (Node/testes), roda
 *    a análise direto no main thread (com setTimeout 0 pra preservar
 *    a interface assíncrona)
 *  - Defensivo: nunca derruba a app se o worker falhar
 *
 * Uso:
 *   import { analyzeNote, onAnalyzed } from './agent/agentClient';
 *   onAnalyzed(({ noteId, result }) => { ... persiste no store ... });
 *   analyzeNote(note);  // dispara em background
 *
 * Doc: docs/HIERARQUIA-AREAS-PROJETOS-CADERNOS-NOTAS.md (seção 4)
 */

import { suggestLifeArea } from '../engine/LifeAreaSuggester';

// Tempo de debounce: ao receber várias chamadas pra mesma nota, espera
// 800ms de "silêncio" antes de mandar pro worker.
const DEBOUNCE_MS = 800;

// Estado interno do módulo
let worker = null;
let workerInitFailed = false;
const debounceTimers = new Map();    // noteId → timeoutId
const listeners = new Set();         // callbacks pra resultados
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
    // Vite suporta nativamente: `new URL(..., import.meta.url)` resolve
    // o path do worker em dev e build. `type: 'module'` permite imports.
    worker = new Worker(new URL('./agentWorker.js', import.meta.url), { type: 'module' });
    worker.addEventListener('message', handleWorkerMessage);
    worker.addEventListener('error', (e) => {
      // Se o worker quebrar, registra mas não trava a app
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
  if (!data || data.type !== 'analyzed') return;
  notifyListeners({ noteId: data.noteId, result: data.result });
}

function notifyListeners(payload) {
  listeners.forEach((cb) => {
    try { cb(payload); } catch (_) { /* defensivo */ }
  });
}

/**
 * Roda a análise no main thread (fallback pra ambientes sem Worker).
 * Mantém a interface assíncrona via Promise.resolve.
 */
function runFallback(note) {
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
      notifyListeners({ noteId: note?.id || null, result });
    } catch (_) { /* defensivo */ }
  });
}

/**
 * Pede análise de uma nota. Retorna imediatamente (não bloqueia).
 * Se a mesma nota for analisada várias vezes em sequência rápida,
 * só roda no fim (debounce).
 *
 * @param {Object} note — { id, title, content, lifeArea }
 */
export function analyzeNote(note) {
  if (!note || !note.id) return;
  const noteId = note.id;
  // Cancela job anterior pra essa nota (debounce)
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
      runFallback(note);
    }
  }, DEBOUNCE_MS);

  debounceTimers.set(noteId, timer);
}

/**
 * Versão batch: analisa várias notas. Útil pro disparo idle (a cada
 * 2-3 minutos, reanalisa notas que ainda não foram processadas).
 * Sem debounce — assume que quem chama já filtrou.
 *
 * @param {Array} notes
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
      runFallback(note);
    }
  });
}

/**
 * Registra um callback pra receber resultados de análise.
 * Retorna função pra desregistrar (cleanup do useEffect).
 *
 * @param {(payload: { noteId: string, result: { inferredLifeArea, confidenceScore, keywords } }) => void} cb
 * @returns {() => void} função pra desinscrever
 */
export function onAnalyzed(cb) {
  if (typeof cb !== 'function') return () => {};
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/**
 * Desliga o worker (uso raro — testes, hot reload).
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
}

// Exporta também um "default" pra import simples
export default { analyzeNote, analyzeNotesBatch, onAnalyzed, shutdown };
