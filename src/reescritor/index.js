/**
 * REESCRITOR — API publica
 *
 * Engine de reescrita deterministica em portugues brasileiro.
 * Sem IA, sem rede, 100% local.
 *
 * Uso basico:
 *
 *   import { rephrase, MODES } from './reescritor';
 *
 *   const r = rephrase("Vou estar enviando o relatorio amanha.", "geral");
 *   console.log(r.result);   // "Vou enviar o relatorio amanha."
 *   console.log(r.changes);  // lista de transformacoes aplicadas, com posicoes
 *   console.log(r.stats);    // { wordsBefore, wordsAfter, charsBefore, charsAfter, changesCount }
 *
 * Modos disponiveis:
 *   - 'geral'    versao equilibrada (default)
 *   - 'formal'   eleva o registro
 *   - 'conciso'  corta gordura
 *   - 'fluente'  melhora legibilidade
 *   - 'simples'  vocabulario acessivel
 *
 * Esta engine e versionada como "Reescritor v1.0 (Fase 1 — Fundacao)".
 *
 * @module reescritor
 */

import { wordCount } from './tokenizer.js';
import geral from './modes/geral.js';
import formal from './modes/formal.js';
import conciso from './modes/conciso.js';
import fluente from './modes/fluente.js';
import simples from './modes/simples.js';

export const MODES = ['geral', 'formal', 'conciso', 'fluente', 'simples'];

const HANDLERS = {
  geral,
  formal,
  conciso,
  fluente,
  simples,
};

export const ENGINE_VERSION = '1.2.0-fase3';

/**
 * Reescreve um texto em PT-BR.
 *
 * @param {string} text
 * @param {('geral'|'formal'|'conciso'|'fluente'|'simples')} [mode='geral']
 * @returns {{
 *   result: string,
 *   changes: Array<{from:string, to:string, rule:string, start:number, end:number}>,
 *   stats: {
 *     wordsBefore: number,
 *     wordsAfter: number,
 *     charsBefore: number,
 *     charsAfter: number,
 *     changesCount: number,
 *     mode: string,
 *     engineVersion: string
 *   }
 * }}
 */
export function rephrase(text, mode = 'geral') {
  if (typeof text !== 'string' || text.length === 0) {
    return {
      result: text || '',
      changes: [],
      stats: emptyStats(mode),
    };
  }

  const handler = HANDLERS[mode] || HANDLERS.geral;
  let output;
  try {
    output = handler(text);
  } catch (err) {
    // Em caso de qualquer erro, devolve o original sem quebrar o app
    return {
      result: text,
      changes: [],
      stats: { ...emptyStats(mode), error: String(err && err.message || err) },
    };
  }

  const stats = {
    wordsBefore: wordCount(text),
    wordsAfter: wordCount(output.result),
    charsBefore: text.length,
    charsAfter: output.result.length,
    changesCount: (output.changes || []).length,
    mode,
    engineVersion: ENGINE_VERSION,
  };

  return {
    result: output.result,
    changes: output.changes || [],
    stats,
  };
}

function emptyStats(mode) {
  return {
    wordsBefore: 0,
    wordsAfter: 0,
    charsBefore: 0,
    charsAfter: 0,
    changesCount: 0,
    mode,
    engineVersion: ENGINE_VERSION,
  };
}

/**
 * Compara dois textos lado a lado e retorna metadados de diferenca.
 * Util para a UI mostrar antes/depois de forma simples.
 */
export function diffSummary(before, after) {
  const wb = wordCount(before);
  const wa = wordCount(after);
  return {
    wordsAdded: Math.max(0, wa - wb),
    wordsRemoved: Math.max(0, wb - wa),
    charsAdded: Math.max(0, after.length - before.length),
    charsRemoved: Math.max(0, before.length - after.length),
    sameLength: before.length === after.length,
    identical: before === after,
  };
}

export default { rephrase, MODES, ENGINE_VERSION, diffSummary };
