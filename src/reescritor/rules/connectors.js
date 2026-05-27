/**
 * REESCRITOR — Transformer: Conectores
 *
 * Promove ou rebaixa conectores conforme o registro alvo:
 *  - "informal"  -> "padrão"  (eleva)  ex: "mas" -> "porem"
 *  - "padrão"    -> "formal"  (eleva)  ex: "porem" -> "contudo"
 *  - "formal"    -> "padrão"  (rebaixa)  ex: "todavia" -> "porem"
 *  - "padrão"    -> "informal" (rebaixa) ex: "porem" -> "mas"
 *
 * Cada grupo de conectores (adversativo, conclusivo, etc.) tem um
 * representante por registro, e a transformacao mantem a funcao logica.
 *
 * @module rules/connectors
 */

import conectoresLex from '../lexicons/conectores.json';
import { applySubstitutions } from '../tokenizer.js';

const REGISTROS = ['informal', 'padrao', 'formal', 'academico'];

/**
 * Constroi as substituicoes para promover do registro 'from' para 'to'.
 * Para cada grupo, mapeia "primeira opcao do registro 'from'" -> "primeira do 'to'".
 */
function buildSubstitutions(fromRegister, toRegister) {
  const substitutions = [];
  const groups = conectoresLex.groups || {};
  for (const groupName of Object.keys(groups)) {
    const group = groups[groupName];
    const fromList = group[fromRegister] || [];
    const toList = group[toRegister] || [];
    if (fromList.length === 0 || toList.length === 0) continue;
    const target = toList[0]; // primeira opcao do registro alvo
    for (const conn of fromList) {
      // Evita substituir por si mesmo
      if (conn.toLowerCase() === target.toLowerCase()) continue;
      substitutions.push({ from: conn, to: target });
    }
  }
  return substitutions;
}

/**
 * Eleva o registro dos conectores em direcao a 'targetRegister'.
 * @param {string} text
 * @param {'informal'|'padrao'|'formal'|'academico'} targetRegister
 * @returns {{result:string, changes:Array}}
 */
export function shiftConnectors(text, targetRegister = 'padrao') {
  if (!text) return { result: text || '', changes: [] };
  if (!REGISTROS.includes(targetRegister)) targetRegister = 'padrao';

  // Aplica em sequencia: ex: pra ir de informal -> formal,
  // passa por padrao tambem (preserva qualidade)
  const passes = [];
  if (targetRegister === 'padrao' || targetRegister === 'formal' || targetRegister === 'academico') {
    passes.push(buildSubstitutions('informal', 'padrao'));
  }
  if (targetRegister === 'formal' || targetRegister === 'academico') {
    passes.push(buildSubstitutions('padrao', 'formal'));
  }
  if (targetRegister === 'academico') {
    passes.push(buildSubstitutions('formal', 'academico'));
  }
  // Direcao contraria
  if (targetRegister === 'informal') {
    passes.push(buildSubstitutions('formal', 'padrao'));
    passes.push(buildSubstitutions('padrao', 'informal'));
  }

  let working = text;
  const changes = [];
  for (const subs of passes) {
    if (subs.length === 0) continue;
    const { result, changes: stepChanges } = applySubstitutions(working, subs);
    working = result;
    for (const c of stepChanges) changes.push({ ...c, rule: `connectors:${targetRegister}` });
  }

  return { result: working, changes };
}

export default shiftConnectors;
