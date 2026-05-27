/**
 * MODO FORMAL — sobe o registro (eleva o tom)
 *
 * Aplica:
 *  - Coloquialismos -> formas padrao ("pra" -> "para", "tô" -> "estou")
 *  - Conectores: shift para registro 'formal'
 *  - Sinonimos: prefere o registro 'formal'
 *  - Anti-gerundismo (gerundismo soa especialmente mal em texto formal)
 *  - Remocao de pleonasmos
 *
 * Filosofia: "como se voce estivesse escrevendo um e-mail profissional"
 */

import coloquialismos from '../lexicons/coloquialismos.json';
import { applySubstitutions } from '../tokenizer.js';
import { shiftConnectors } from '../rules/connectors.js';
import { applySynonyms } from '../rules/synonyms.js';
import { fixGerundism } from '../rules/gerundism.js';
import { removeRedundancies } from '../rules/redundancy.js';

export function formal(text) {
  let working = text;
  const changes = [];

  // 1) Coloquialismos -> formas padrao
  let step = applySubstitutions(working, coloquialismos.entries || []);
  working = step.result;
  changes.push(...step.changes.map(c => ({ ...c, rule: 'colloquialism' })));

  // 2) Anti-gerundismo
  step = fixGerundism(working);
  working = step.result; changes.push(...step.changes);

  // 3) Remocao de pleonasmos
  step = removeRedundancies(working);
  working = step.result; changes.push(...step.changes);

  // 4) Conectores em registro formal
  step = shiftConnectors(working, 'formal');
  working = step.result; changes.push(...step.changes);

  // 5) Sinonimos em registro formal
  step = applySynonyms(working, 'formal');
  working = step.result; changes.push(...step.changes);

  return { result: working, changes };
}
export default formal;
