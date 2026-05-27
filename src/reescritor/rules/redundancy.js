/**
 * REESCRITOR — Transformer: Redundancias / Pleonasmos
 *
 * Substitui pleonasmos (formas redundantes do PT-BR) pela forma enxuta.
 * Exemplo: "subir pra cima" -> "subir".
 *
 * Estrategia: substituicao direta por dicionario, com word boundary,
 * preservando capitalizacao.
 *
 * @module rules/redundancy
 */

import pleonasmos from '../lexicons/pleonasmos.json';
import { applySubstitutions } from '../tokenizer.js';

/**
 * Remove redundancias do texto.
 * @param {string} text
 * @returns {{result:string, changes:Array}}
 */
export function removeRedundancies(text) {
  if (!text) return { result: text || '', changes: [] };
  const entries = pleonasmos.entries || [];
  return applySubstitutions(text, entries);
}

export default removeRedundancies;
