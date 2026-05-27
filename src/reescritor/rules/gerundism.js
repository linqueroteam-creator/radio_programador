/**
 * REESCRITOR — Transformer: Anti-gerundismo
 *
 * O gerundismo e um vicio de linguagem do portugues brasileiro:
 *   "vou estar enviando" (em vez de "vou enviar")
 *   "estarei verificando" (em vez de "verificarei")
 *
 * Esse transformer detecta os padroes definidos em lexicons/gerundismos.json
 * e converte o gerundio para o infinitivo/conjugado correspondente.
 *
 * Combina:
 *  - regex dos padroes (do lexico)
 *  - regra de conversao gerundio -> infinitivo (do posLite)
 *
 * @module rules/gerundism
 */

import gerundismosLex from '../lexicons/gerundismos.json';
import { gerundToInfinitive } from '../posLite.js';
import { preserveCapitalization } from '../tokenizer.js';

/**
 * Remove gerundismo do texto.
 * @param {string} text
 * @returns {{result:string, changes:Array}}
 */
export function fixGerundism(text) {
  if (!text) return { result: text || '', changes: [] };
  let working = text;
  const changes = [];
  const patterns = gerundismosLex.patterns || [];

  for (const p of patterns) {
    const regex = new RegExp(p.match, 'gi');
    working = working.replace(regex, (full, aux, gerund, offset) => {
      const infinitive = gerundToInfinitive(gerund);
      if (!infinitive) return full; // nao soube converter, mantem o original
      const replacement = `${aux} ${infinitive}`;
      const finalReplacement = preserveCapitalization(full, replacement);
      changes.push({
        from: full,
        to: finalReplacement,
        rule: 'gerundism:' + p.id,
        start: offset,
        end: offset + full.length,
      });
      return finalReplacement;
    });
  }

  return { result: working, changes };
}

export default fixGerundism;
