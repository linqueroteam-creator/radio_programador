/**
 * MODO CONCISO — corta gordura
 *
 * Aplica:
 *  - Pleonasmos (remocoes mais agressivas)
 *  - Anti-gerundismo (encurta sempre)
 *  - Locucoes longas -> equivalentes curtos ("a fim de que" -> "para")
 *  - Conectores: rebaixa para informal/padrao (curtos)
 *
 * Meta: reduzir 15-30% do tamanho sem perder o sentido.
 *
 * Filosofia: "diga a mesma coisa com menos palavras"
 */

import { fixGerundism } from '../rules/gerundism.js';
import { removeRedundancies } from '../rules/redundancy.js';
import { applySubstitutions } from '../tokenizer.js';

// Locucoes longas -> formas curtas
const SHORT_FORMS = [
  { from: 'a fim de que', to: 'para que' },
  { from: 'a fim de', to: 'para' },
  { from: 'de modo que', to: 'para' },
  { from: 'de maneira que', to: 'para' },
  { from: 'no caso de', to: 'se' },
  { from: 'na hipotese de', to: 'se' },
  { from: 'na hipótese de', to: 'se' },
  { from: 'apesar do fato de que', to: 'embora' },
  { from: 'apesar do fato de', to: 'embora' },
  { from: 'em virtude de', to: 'por' },
  { from: 'em razao de', to: 'por' },
  { from: 'em razão de', to: 'por' },
  { from: 'em funcao de', to: 'por' },
  { from: 'em função de', to: 'por' },
  { from: 'devido ao fato de que', to: 'porque' },
  { from: 'devido ao fato de', to: 'por' },
  { from: 'em decorrencia de', to: 'por' },
  { from: 'em decorrência de', to: 'por' },
  { from: 'no momento em que', to: 'quando' },
  { from: 'antes que', to: 'antes de' },
  { from: 'na ocasiao em que', to: 'quando' },
  { from: 'na ocasião em que', to: 'quando' },
  { from: 'tendo em vista que', to: 'pois' },
  { from: 'pelo motivo de que', to: 'porque' },
  { from: 'em vista de que', to: 'pois' },
  { from: 'cabe ressaltar que', to: '' },
  { from: 'e importante notar que', to: '' },
  { from: 'é importante notar que', to: '' },
  { from: 'cumpre destacar que', to: '' },
  { from: 'vale destacar que', to: '' },
  { from: 'em ultima analise', to: 'enfim' },
  { from: 'em última análise', to: 'enfim' },
];

export function conciso(text) {
  let working = text;
  const changes = [];

  // 1) Locucoes longas -> curtas (alta prioridade)
  let step = applySubstitutions(working, SHORT_FORMS);
  working = step.result;
  changes.push(...step.changes.map(c => ({ ...c, rule: 'concise:shortform' })));

  // 2) Pleonasmos
  step = removeRedundancies(working);
  working = step.result; changes.push(...step.changes);

  // 3) Anti-gerundismo (sempre encurta)
  step = fixGerundism(working);
  working = step.result; changes.push(...step.changes);

  // 4) Espacos duplicados gerados por substituicoes vazias
  working = working.replace(/\s{2,}/g, ' ').replace(/\s+([.,;:!?])/g, '$1');

  return { result: working, changes };
}
export default conciso;
