/**
 * REESCRITOR — Transformer: Voz passiva -> Voz ativa
 *
 * Detecta o padrao classico de voz passiva analitica em PT-BR:
 *   "<sujeito> foi/era/serah <particípio> por/pelo/pela/pelos/pelas <agente>"
 * E converte para voz ativa:
 *   "<agente com artigo se for substantivo comum> <verbo conjugado> <sujeito>"
 *
 * Exemplos:
 *   "O bolo foi comido pela crianca"  -> "A crianca comeu o bolo"
 *   "O relatorio foi enviado pelo Joao" -> "Joao enviou o relatorio"
 *   "A casa foi pintada pelo professor" -> "O professor pintou a casa"
 *
 * Estrategia para o agente (preservar artigo corretamente):
 *
 *   - Se prep e "por" -> agente sem artigo (ex: "por estudantes" -> "estudantes")
 *   - Se prep e "pelo/pela/pelos/pelas" e o agente parece NOME PROPRIO
 *     (comeca com maiuscula) -> drop article (ex: "pelo Joao" -> "Joao")
 *   - Se prep e "pelo/pela/pelos/pelas" e o agente parece SUBSTANTIVO COMUM
 *     (lowercase) -> reconstroi o artigo (ex: "pela crianca" -> "A crianca")
 *
 * LIMITACOES (assumidas, principio conservador):
 *   - So converte particípios presentes em lexicons/participios.json
 *   - Aceita variacoes de genero/numero do particípio (-ado/-ada/-ados/-adas)
 *   - Suporta tempos passados ('foi', 'era', 'fora'); presente e futuro fora
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
  if (w.endsWith('s')) w = w.slice(0, -1);
  if (/ada$/.test(w)) return w.replace(/ada$/, 'ado');
  if (/ida$/.test(w)) return w.replace(/ida$/, 'ido');
  return w;
}

/**
 * Reconstroi o agente da voz ativa, preservando ou descartando o artigo
 * embutido nas preposicoes "pelo/pela/pelos/pelas".
 *
 * @param {string} prep "por" | "pelo" | "pela" | "pelos" | "pelas"
 * @param {string} agente texto do agente capturado pelo regex
 * @returns {string} agente formatado para inicio de frase ativa
 */
function buildAgent(prep, agente) {
  const trim = (agente || '').trim();
  if (!trim) return '';

  const prepLower = prep.toLowerCase();
  const firstChar = trim.charAt(0);
  const startsUpper = firstChar === firstChar.toUpperCase() && firstChar !== firstChar.toLowerCase();

  // "por" puro: nunca houve artigo embutido
  if (prepLower === 'por') {
    if (startsUpper) return trim;
    return trim.charAt(0).toUpperCase() + trim.slice(1);
  }

  // "pelo/pela/pelos/pelas": preposicao + artigo fundidos
  // Se o agente e nome proprio (capitalizado), drop article
  if (startsUpper) return trim;

  // Substantivo comum: reconstroi o artigo no inicio (capitalizado)
  const ARTIGOS = { 'pelo': 'O', 'pela': 'A', 'pelos': 'Os', 'pelas': 'As' };
  const artigo = ARTIGOS[prepLower];
  if (!artigo) return trim.charAt(0).toUpperCase() + trim.slice(1);
  return `${artigo} ${trim.toLowerCase()}`;
}

// Regex que captura o padrao da voz passiva.
// Grupos:
//   1: sujeito (até "foi/era")
//   2: o auxiliar ("foi", "era", "fora")
//   3: o particípio
//   4: a preposicao + agente ("por", "pelo", "pela", ...)
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

      const agenteTrim = (agente || '').trim();
      if (agenteTrim.length < 2) return full;

      const sujeitoTrim = (sujeito || '').trim();
      if (sujeitoTrim.length < 3) return full;

      const agenteFormatado = buildAgent(prep, agenteTrim);
      // Sujeito vai pro fim da frase, em minuscula no inicio (se nao for nome proprio)
      const sujeitoFirstChar = sujeitoTrim.charAt(0);
      const sujeitoIsProperLike =
        sujeitoFirstChar === sujeitoFirstChar.toUpperCase() &&
        sujeitoFirstChar !== sujeitoFirstChar.toLowerCase() &&
        // Heuristica: se o sujeito comeca com artigo, e substantivo comum
        !/^(O|A|Os|As|Um|Uma|Uns|Umas)\s/.test(sujeitoTrim);
      const sujeitoFinal = sujeitoIsProperLike
        ? sujeitoTrim
        : sujeitoTrim.charAt(0).toLowerCase() + sujeitoTrim.slice(1);

      const replacement = `${agenteFormatado} ${conjugated} ${sujeitoFinal}`;

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
