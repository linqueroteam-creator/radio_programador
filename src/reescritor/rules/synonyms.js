/**
 * REESCRITOR — Transformer: Sinonimos
 *
 * Substitui palavras por sinonimos curados, escolhendo a opcao adequada
 * ao registro alvo do modo (informal | neutro | formal | simples).
 *
 * Estrategia conservadora:
 *  - So substitui quando ha pelo menos uma opcao no registro alvo
 *  - Se ha empate de opcoes, escolhe deterministicamente (primeira do array)
 *  - Nao substitui quando a propria palavra e o equivalente do registro alvo
 *  - Limita a quantidade de substituicoes por texto (evita reescrita exagerada)
 *
 * @module rules/synonyms
 */

import sinonimosLex from '../lexicons/sinonimos.json';
import { applySubstitutions } from '../tokenizer.js';

const MAX_SUBSTITUTIONS_PER_TEXT = 5;

/**
 * Substitui sinonimos no texto pra adequar ao registro alvo.
 * @param {string} text
 * @param {'informal'|'neutro'|'formal'} targetRegister
 * @returns {{result:string, changes:Array}}
 */
export function applySynonyms(text, targetRegister = 'neutro') {
  if (!text) return { result: text || '', changes: [] };
  const entries = sinonimosLex.entries || {};
  const subs = [];

  for (const [base, opcoes] of Object.entries(entries)) {
    if (!Array.isArray(opcoes) || opcoes.length === 0) continue;

    // Escolhe a opcao do registro alvo. Se nao tiver, pula.
    const target = opcoes.find(o => o.registro === targetRegister);
    if (!target) continue;
    if (target.to.toLowerCase() === base.toLowerCase()) continue;

    subs.push({ from: base, to: target.to });
  }

  // Aplica em ordem aleatoria-ish mas limitada, pra nao reescrever tudo
  // de uma vez. Usa hash do texto pra ser deterministico.
  const limited = limitSubstitutions(text, subs, MAX_SUBSTITUTIONS_PER_TEXT);

  return applySubstitutions(text, limited);
}

/**
 * Filtra a lista de substituicoes pra incluir, no maximo, 'max' que
 * realmente aparecem no texto. Ordem deterministica (alfabetica do 'from').
 */
function limitSubstitutions(text, subs, max) {
  const lower = text.toLowerCase();
  const present = subs.filter(s => {
    const idx = lower.indexOf(s.from.toLowerCase());
    return idx >= 0;
  });
  present.sort((a, b) => a.from.localeCompare(b.from));
  return present.slice(0, max);
}

export default applySynonyms;
