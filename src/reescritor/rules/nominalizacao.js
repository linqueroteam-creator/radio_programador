/**
 * REESCRITOR — Transformer: Nominalizacao <-> Verbalizacao
 *
 * Nominalizacao e a transformacao de um verbo num substantivo, geralmente
 * usado com um "verbo leve" (fez, realizou, promoveu, deu, tomou):
 *
 *   verbo direto       <->  forma nominalizada
 *   "analisou"         <->  "fez a analise"
 *   "decidiu"          <->  "tomou a decisao"
 *   "iniciou"          <->  "deu inicio a"
 *
 * A forma verbalizada e mais curta, mais direta e geralmente mais clara.
 * A forma nominalizada e mais longa, mais formal, e as vezes obscurece
 * o agente da acao. Por isso:
 *
 *   - modo conciso/fluente/simples : VERBALIZE  ("fez a analise" -> "analisou")
 *   - modo formal                  : NOMINALIZE ("decidiu" -> "tomou a decisao")
 *
 * Estrategia conservadora: o lexicon contem apenas pares com correspondencia
 * inequivoca. A direcao da transformacao e parametro da funcao.
 *
 * @module rules/nominalizacao
 */

import nominalizacaoLex from '../lexicons/nominalizacao.json';
import { applySubstitutions } from '../tokenizer.js';

/**
 * Verbaliza nominalizacoes do texto: 'fez a analise' -> 'analisou'.
 * Direcao default — encurta o texto e ganha clareza.
 *
 * @param {string} text
 * @returns {{result:string, changes:Array}}
 */
export function verbalize(text) {
  if (!text) return { result: text || '', changes: [] };
  const entries = nominalizacaoLex.verbalize || [];
  if (entries.length === 0) return { result: text, changes: [] };

  const { result, changes } = applySubstitutions(text, entries);
  const annotated = changes.map(c => ({ ...c, rule: 'nominalizacao:verbalize' }));
  return { result, changes: annotated };
}

/**
 * Nominaliza verbos do texto: 'decidiu' -> 'tomou a decisao'.
 * Direcao reversa — usado pelo modo formal para elevar o registro.
 *
 * @param {string} text
 * @returns {{result:string, changes:Array}}
 */
export function nominalize(text) {
  if (!text) return { result: text || '', changes: [] };
  const entries = nominalizacaoLex.nominalize || [];
  if (entries.length === 0) return { result: text, changes: [] };

  const { result, changes } = applySubstitutions(text, entries);
  const annotated = changes.map(c => ({ ...c, rule: 'nominalizacao:nominalize' }));
  return { result, changes: annotated };
}

export default verbalize;
