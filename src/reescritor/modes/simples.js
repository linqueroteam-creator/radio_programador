/**
 * MODO SIMPLES — vocabulario acessivel
 *
 * Aplica:
 *  - Simplificacoes lexicais (palavra erudita -> palavra comum)
 *  - Conectores em registro 'informal' (curtos e familiares)
 *  - Anti-gerundismo + pleonasmos
 *
 * Filosofia: "que qualquer pessoa entenda na primeira leitura"
 */

import simplificacoes from '../lexicons/simplificacoes.json';
import { applySubstitutions } from '../tokenizer.js';
import { fixGerundism } from '../rules/gerundism.js';
import { removeRedundancies } from '../rules/redundancy.js';
import { shiftConnectors } from '../rules/connectors.js';

export function simples(text) {
  let working = text;
  const changes = [];

  // 1) Simplificacoes lexicais
  let step = applySubstitutions(working, simplificacoes.entries || []);
  working = step.result;
  changes.push(...step.changes.map(c => ({ ...c, rule: 'simplification' })));

  // 2) Anti-gerundismo + pleonasmos (sempre)
  step = fixGerundism(working);
  working = step.result; changes.push(...step.changes);

  step = removeRedundancies(working);
  working = step.result; changes.push(...step.changes);

  // 3) Conectores informais
  step = shiftConnectors(working, 'informal');
  working = step.result; changes.push(...step.changes);

  return { result: working, changes };
}
export default simples;
