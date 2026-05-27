/**
 * REESCRITOR — Transformer: Voz passiva -> Voz ativa
 *
 * Detecta o padrao classico de voz passiva analitica em PT-BR:
 *   "<sujeito> foi/era/serah <particípio> por/pelo/pela/pelos/pelas <agente>"
 * E converte para voz ativa:
 *   "<agente> <verbo conjugado> <sujeito>"
 *
 * Exemplos:
 *   "O bolo foi comido pela crianca"  -> "A crianca comeu o bolo"
 *   "O relatorio foi enviado pelo Joao" -> "Joao enviou o relatorio"
 *
 * LIMITACOES (assumidas, principio conservador):
 *   - So converte particípios presentes em lexicons/participios.json
 *   - Aceita variacoes de genero/numero do particípio (-ado/-ada/-ados/-adas)
 *   - Suporta tempos passados ('foi', 'era'); presente e futuro ficam pra Fase 3
 *   - Em casos ambiguos, prefere NAO converter
 *
 * @module rules/voice
 */

import participiosLex from '../lexicons/participios.json';

const PARTICIPIOS = participiosLex.entries || {};

/**
 * Normaliza um particípio para sua forma masculina singular.
 *  "enviada"  -> "enviado"
 *  "enviados" -> "enviado"
 *  "enviadas" -> "enviado"
 */
function normalizeParticiple(word) {
  if (!word) return word;
  let w = word.toLowerCase();
  // Remove plural primeiro
  if (w.endsWith('s')) w = w.slice(0, -1);
  // Tenta -ada -> -ado, -ida -> -ido
  if (/ada$/.test(w)) return w.replace(/ada$/, 'ado');
  if (/ida$/.test(w)) return w.replace(/ida$/, 'ido');
  return w;
}

// Regex que captura o padrao da voz passiva.
// Grupos:
//   1: sujeito (até "foi/era/seria")
//   2: o auxiliar ("foi", "era")
//   3: o particípio
//   4: a preposicao + agente ("por joao", "pelo joao", "pela maria", ...)
//   5: o nome do agente (sem a preposicao)
const PASSIVE_PATTERN = new RegExp(
  '(\\b[A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç][^.!?\\n]{2,80}?)' +
  '\\s+(foi|fora|era)' +
  '\\s+([a-záéíóúâêôãõç]+(?:o|os|a|as))' +
  '\\s+(por|pelo|pela|pelos|pelas)' +
  '\\s+([A-ZÁÉÍÓÚÂÊÔÃÕÇa-záéíóúâêôãõç][a-záéíóúâêôãõç\\s]{1,40}?)' +
  '(?=[\\.,;!?\\n]|$)',
  'g'
);

/**
 * Converte voz passiva -> voz ativa quando seguro.
 * @param {string} text
 * @returns {{result:string, changes:Array}}
 */
export function activeVoice(text) {
  if (!text) return { result: text || '', changes: [] };

  const changes = [];
  let working = text;
  PASSIVE_PATTERN.lastIndex = 0;

  working = working.replace(PASSIVE_PATTERN, (full, sujeito, aux, participle, prep, agente, offset) => {
    try {
      const normalized = normalizeParticiple(participle);
      const conjugated = PARTICIPIOS[normalized];
      if (!conjugated) return full;

      const agenteTrim = agente.trim();
      if (agenteTrim.length < 2) return full;

      const sujeitoTrim = sujeito.trim();
      if (sujeitoTrim.length < 3) return full;

      const agenteCap = agenteTrim[0].toUpperCase() + agenteTrim.slice(1);
      const sujeitoLower = sujeitoTrim.charAt(0).toLowerCase() + sujeitoTrim.slice(1);
      const replacement = `${agenteCap} ${conjugated} ${sujeitoLower}`;

      changes.push({
        from: full,
        to: replacement,
        rule: 'voice:passive-to-active',
        start: offset,
        end: offset + full.length,
      });
      return replacement;
    } catch (_) {
      return full;
    }
  });

  return { result: working, changes };
}

export default activeVoice;
