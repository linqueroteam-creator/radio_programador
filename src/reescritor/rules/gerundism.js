/**
 * REESCRITOR — Transformer: Anti-gerundismo
 *
 * O gerundismo e um vicio de linguagem do portugues brasileiro:
 *   "vou estar enviando"       (em vez de "vou enviar")
 *   "estarei verificando"      (em vez de "verificarei")
 *   "tenho estado revisando"   (em vez de "tenho revisado")
 *
 * Esse transformer detecta os padroes definidos em lexicons/gerundismos.json
 * e converte o gerundio para o tempo correspondente (infinitivo, futuro do
 * presente ou particípio), conforme o tipo de auxiliar.
 *
 * Tres estrategias de substituicao, escolhidas pelo `id` do padrao:
 *
 *   - infinitivo : "vou estar X-ndo" -> "vou X-r"  (auxiliar modal preserva-se)
 *                  Padroes: vou-estar, ir-estar-base, preciso-estar, deveria-estar
 *
 *   - futuro     : "estarei X-ndo"   -> "X-rei"    (auxiliar e descartado, verbo
 *                  vai pro futuro do presente conjugado na pessoa do auxiliar)
 *                  Padroes: estarei (estarei/estará/estaremos/estarão)
 *
 *   - particípio : "tenho estado X-ndo" -> "tenho X-do" (mantem o aux 'tenho/tem'
 *                  que ja exprime tempo composto, troca gerundio por particípio)
 *                  Padroes: tenho-estado
 *
 * @module rules/gerundism
 */

import gerundismosLex from '../lexicons/gerundismos.json';
import { gerundToInfinitive, gerundToFuture, gerundToParticiple } from '../posLite.js';
import { preserveCapitalization } from '../tokenizer.js';

// Mapeamento de auxiliar -> pessoa/numero, usado no padrao 'estarei'.
// "estarei" e 1a sg, "estará/estara" e 3a sg, etc.
const FUTURE_AUX_TO_PERSON = {
  'estarei':   '1s',
  'estara':    '3s',
  'está':      '3s',
  'estará':    '3s',
  'estaremos': '1p',
  'estarao':   '3p',
  'estarão':   '3p',
};

/**
 * Remove gerundismo do texto.
 * @param {string} text
 * @returns {{result:string, changes:Array}}
 */
export function fixGerundism(text) {
  if (!text) return { result: text || '', changes: [] };
  let working = text;
  const changes = [];
  const patterns = gerundismosLex.patterns || [];

  for (const p of patterns) {
    const regex = new RegExp(p.match, 'gi');
    working = working.replace(regex, (full, aux, gerund, offset) => {
      const replacement = pickReplacement(p.id, aux, gerund);
      if (!replacement) return full; // nao soube converter, mantem o original

      const finalReplacement = preserveCapitalization(full, replacement);
      changes.push({
        from: full,
        to: finalReplacement,
        rule: 'gerundism:' + p.id,
        start: offset,
        end: offset + full.length,
      });
      return finalReplacement;
    });
  }

  return { result: working, changes };
}

/**
 * Decide qual estrategia de conversao aplicar conforme o `id` do padrao.
 *
 * @param {string} patternId
 * @param {string} aux  o auxiliar capturado no texto
 * @param {string} gerund o gerundio capturado no texto
 * @returns {string|null} a substituicao em minusculas (capitalizacao e
 *   ajustada depois), ou null se nao conseguiu converter
 */
function pickReplacement(patternId, aux, gerund) {
  // 1) Padrao FUTURO: "estarei verificando" -> "verificarei"
  // O auxiliar (estar conjugado no futuro) some, e o verbo principal
  // vai para o futuro do presente conjugado na mesma pessoa do auxiliar.
  if (patternId === 'estarei') {
    const person = FUTURE_AUX_TO_PERSON[aux.toLowerCase()] || '3s';
    const future = gerundToFuture(gerund, person);
    if (future) return future;
    // Fallback conservador: vira infinitivo
    const infinitive = gerundToInfinitive(gerund);
    return infinitive ? `${aux} ${infinitive}` : null;
  }

  // 2) Padrao PARTICÍPIO: "tenho estado revisando" -> "tenho revisado"
  // O verbo "estado" desaparece, e o gerundio vira particípio.
  if (patternId === 'tenho-estado') {
    const participle = gerundToParticiple(gerund);
    if (participle) return `${aux} ${participle}`;
    return null;
  }

  // 3) Padrao INFINITIVO (default): "vou estar enviando" -> "vou enviar"
  // O auxiliar modal e preservado, "estar" desaparece, gerundio vira infinitivo.
  const infinitive = gerundToInfinitive(gerund);
  if (!infinitive) return null;
  return `${aux} ${infinitive}`;
}

export default fixGerundism;
