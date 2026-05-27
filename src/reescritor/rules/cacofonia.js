/**
 * REESCRITOR — Transformer: Cacofonia
 *
 * Cacofonia e o som indesejado que surge quando palavras adjacentes
 * formam um encontro fonico desagradavel, ambiguo ou comico:
 *
 *   "vi ela"        -> deveria ser "vi-a" (uso errado de pronome)
 *   "boca dela"     -> "a boca dela" (a sequencia "boca-dela" soa como "bocadela")
 *   "alma minha"    -> "minha alma" ("alma-minha" soa como "almamina")
 *   "uma mão"       -> "a mão" ("uma-mão" soa como "umamão")
 *   "ja ja"         -> "logo" (repeticao desnecessaria)
 *
 * Estrategia: substituicao direta a partir do lexicon cacofonia.json,
 * com word boundary e preservacao de capitalizacao.
 *
 * Categorias (campo `kind` no lexicon):
 *  - 'pronome-objeto'      : "vi ela" -> "vi-a"
 *  - 'som-feio'            : "boca dela" -> "a boca dela"
 *  - 'redundancia-sonora'  : "ja ja" -> "logo"
 *
 * Estrategia conservadora: o lexicon contem apenas casos com correcao
 * inequivoca. Em caso de duvida, prefere NAO transformar.
 *
 * @module rules/cacofonia
 */

import cacofoniaLex from '../lexicons/cacofonia.json';
import { applySubstitutions } from '../tokenizer.js';

/**
 * Remove cacofonias do texto.
 * @param {string} text
 * @returns {{result:string, changes:Array}}
 */
export function fixCacofonia(text) {
  if (!text) return { result: text || '', changes: [] };
  const entries = cacofoniaLex.entries || [];
  if (entries.length === 0) return { result: text, changes: [] };

  const { result, changes } = applySubstitutions(text, entries);
  // Reanota a regra com o `kind` do lexicon, para a UI poder colorir
  const kindByFrom = {};
  for (const e of entries) kindByFrom[e.from.toLowerCase()] = e.kind || 'cacofonia';

  const annotated = changes.map(c => ({
    ...c,
    rule: 'cacofonia:' + (kindByFrom[c.from.toLowerCase()] || 'cacofonia'),
  }));

  return { result, changes: annotated };
}

export default fixCacofonia;
