/**
 * MODO FLUENTE — melhora fluidez e legibilidade
 *
 * Aplica:
 *  - Voz passiva -> ativa (quando seguro)
 *  - Quebra de clausulas longas (>25 palavras)
 *  - Verbalizacao (denominaliza: "fez a analise" -> "analisou")
 *  - Anti-gerundismo
 *  - Cacofonia (corrige sons indesejados)
 *  - Pleonasmos
 *  - Conectores no padrao (nao formal nem informal)
 *
 * Filosofia: "texto direto e sem trava — fica mais facil de ler em voz alta"
 */

import { fixGerundism } from '../rules/gerundism.js';
import { removeRedundancies } from '../rules/redundancy.js';
import { fixCacofonia } from '../rules/cacofonia.js';
import { verbalize } from '../rules/nominalizacao.js';
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

  // 3) Verbalizacao (denominaliza: "fez a analise" -> "analisou")
  step = verbalize(working);
  working = step.result; changes.push(...step.changes);

  // 4) Anti-gerundismo
  step = fixGerundism(working);
  working = step.result; changes.push(...step.changes);

  // 5) Cacofonia (legibilidade em voz alta exige som limpo)
  step = fixCacofonia(working);
  working = step.result; changes.push(...step.changes);

  // 6) Remocao de pleonasmos
  step = removeRedundancies(working);
  working = step.result; changes.push(...step.changes);

  // 7) Conectores no padrao
  step = shiftConnectors(working, 'padrao');
  working = step.result; changes.push(...step.changes);

  return { result: working, changes };
}
export default fluente;
