/**
 * MODO FLUENTE — melhora fluidez e legibilidade (placeholder Fase 1)
 *
 * Na Fase 1 aplica anti-gerundismo + pleonasmos + conectores no padrao.
 * Na Fase 2 vai ganhar voz passiva -> ativa e quebra de frases longas.
 */

import { fixGerundism } from '../rules/gerundism.js';
import { removeRedundancies } from '../rules/redundancy.js';
import { shiftConnectors } from '../rules/connectors.js';

export function fluente(text) {
  let working = text;
  const changes = [];

  let step = fixGerundism(working);
  working = step.result; changes.push(...step.changes);

  step = removeRedundancies(working);
  working = step.result; changes.push(...step.changes);

  step = shiftConnectors(working, 'padrao');
  working = step.result; changes.push(...step.changes);

  return { result: working, changes };
}
export default fluente;
