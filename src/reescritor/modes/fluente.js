/**
 * MODO FLUENTE — melhora fluidez e legibilidade
 *
 * Aplica (Fase 2):
 *  - Voz passiva -> ativa (quando seguro)
 *  - Quebra de clausulas longas (>25 palavras)
 *  - Anti-gerundismo
 *  - Pleonasmos
 *  - Conectores no padrao (nao formal nem informal)
 *
 * Filosofia: "texto direto e sem trava — fica mais facil de ler em voz alta"
 */

import { fixGerundism } from '../rules/gerundism.js';
import { removeRedundancies } from '../rules/redundancy.js';
import { shiftConnectors } from '../rules/connectors.js';
import { activeVoice } from '../rules/voice.js';
import { splitLongClauses } from '../rules/clauseSplit.js';

export function fluente(text) {
  let working = text;
  const changes = [];

  // 1) Voz passiva -> ativa (mais impacto na fluidez)
  let step = activeVoice(working);
  working = step.result; changes.push(...step.changes);

  // 2) Quebra de clausulas longas
  step = splitLongClauses(working);
  working = step.result; changes.push(...step.changes);

  // 3) Anti-gerundismo
  step = fixGerundism(working);
  working = step.result; changes.push(...step.changes);

  // 4) Remocao de pleonasmos
  step = removeRedundancies(working);
  working = step.result; changes.push(...step.changes);

  // 5) Conectores no padrao
  step = shiftConnectors(working, 'padrao');
  working = step.result; changes.push(...step.changes);

  return { result: working, changes };
}
export default fluente;
