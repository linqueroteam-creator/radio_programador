/**
 * MODO FORMAL — sobe o registro (eleva o tom)
 *
 * Aplica:
 *  - Coloquialismos -> formas padrao ("pra" -> "para", "tô" -> "estou")
 *  - Anti-gerundismo (gerundismo soa especialmente mal em texto formal)
 *  - Remocao de pleonasmos
 *  - Cacofonia (corrige "vi ela" -> "vi-a", som-feio etc.)
 *  - Nominalizacao (verbo direto -> forma nominalizada — eleva o registro)
 *  - Conectores: shift para registro 'formal'
 *  - Sinonimos: prefere o registro 'formal'
 *
 * Filosofia: "como se voce estivesse escrevendo um e-mail profissional"
 */

import coloquialismos from '../lexicons/coloquialismos.json';
import { applySubstitutions } from '../tokenizer.js';
import { shiftConnectors } from '../rules/connectors.js';
import { applySynonyms } from '../rules/synonyms.js';
import { fixGerundism } from '../rules/gerundism.js';
import { removeRedundancies } from '../rules/redundancy.js';
import { fixCacofonia } from '../rules/cacofonia.js';
import { nominalize } from '../rules/nominalizacao.js';

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

  // 4) Cacofonia (formal nao tolera "vi ela")
  step = fixCacofonia(working);
  working = step.result; changes.push(...step.changes);

  // 5) Nominalizacao (verbos diretos -> forma mais elevada)
  step = nominalize(working);
  working = step.result; changes.push(...step.changes);

  // 6) Conectores em registro formal
  step = shiftConnectors(working, 'formal');
  working = step.result; changes.push(...step.changes);

  // 7) Sinonimos em registro formal
  step = applySynonyms(working, 'formal');
  working = step.result; changes.push(...step.changes);

  return { result: working, changes };
}
export default formal;
