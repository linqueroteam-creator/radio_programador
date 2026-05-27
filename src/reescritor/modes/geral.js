/**
 * MODO GERAL — reescrita equilibrada (default)
 *
 * Aplica:
 *  - Anti-gerundismo (sempre indicado, vicio claro)
 *  - Remocao de pleonasmos (sempre indicado, redundancia clara)
 *  - Conectores: nao mexe (mantem registro original)
 *  - Sinonimos: substituicao leve em registro neutro
 *
 * Filosofia: "uma versao alternativa do mesmo texto, sem mudar o tom".
 */

import { fixGerundism } from '../rules/gerundism.js';
import { removeRedundancies } from '../rules/redundancy.js';
import { applySynonyms } from '../rules/synonyms.js';

export function geral(text) {
  let working = text;
  const changes = [];

  let step = fixGerundism(working);
  working = step.result; changes.push(...step.changes);

  step = removeRedundancies(working);
  working = step.result; changes.push(...step.changes);

  step = applySynonyms(working, 'neutro');
  working = step.result; changes.push(...step.changes);

  return { result: working, changes };
}
export default geral;
