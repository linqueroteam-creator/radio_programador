/**
 * REESCRITOR — Transformer: Quebra de clausulas longas
 *
 * Frases muito longas perdem clareza. Esse transformer detecta frases
 * com mais de N palavras e tenta quebra-las em duas frases independentes,
 * usando como "ponto de quebra" conectores apropriados.
 *
 * Estrategia conservadora:
 *   - Soh quebra se a frase tiver > MAX_WORDS (default 25 palavras)
 *   - Soh quebra em conectores que aceitam virar inicio de frase
 *   - Soh quebra UMA vez por frase (evita fragmentar demais)
 *
 * @module rules/clauseSplit
 */

const MAX_WORDS = 25;

// Padroes de quebra: conectores que aceitam virar inicio de frase em PT-BR.
// Ordem importa — testamos do mais restritivo pro mais geral.
const SPLIT_PATTERNS = [
  { from: ', no entanto,', to: '. No entanto,' },
  { from: ', no entanto', to: '. No entanto,' },
  { from: ', porem,', to: '. Porem,' },
  { from: ', porem', to: '. Porem,' },
  { from: ', porém,', to: '. Porém,' },
  { from: ', porém', to: '. Porém,' },
  { from: ', contudo,', to: '. Contudo,' },
  { from: ', contudo', to: '. Contudo,' },
  { from: ', entao,', to: '. Entao,' },
  { from: ', entao', to: '. Entao,' },
  { from: ', então,', to: '. Então,' },
  { from: ', então', to: '. Então,' },
  { from: ', portanto,', to: '. Portanto,' },
  { from: ', portanto', to: '. Portanto,' },
  { from: ', mas ', to: '. Mas ' },
  { from: ', e por isso ', to: '. Por isso ' },
];

function wordCount(s) {
  if (!s) return 0;
  return (s.match(/[a-zA-ZàáâãäéêëíïóôõöúüçÀÁÂÃÄÉÊËÍÏÓÔÕÖÚÜÇñÑ]+/g) || []).length;
}

/**
 * Quebra clausulas longas em duas frases.
 * @param {string} text
 * @returns {{result:string, changes:Array}}
 */
export function splitLongClauses(text) {
  if (!text) return { result: text || '', changes: [] };
  const changes = [];

  // Divide por sentencas (regra simples: ponto/!/?)
  const SENTENCE_REGEX = /([^.!?]+[.!?]+|[^.!?]+$)/g;
  const sentences = [];
  let m;
  while ((m = SENTENCE_REGEX.exec(text)) !== null) {
    sentences.push({ text: m[1], start: m.index });
  }

  if (sentences.length === 0) {
    return { result: text, changes: [] };
  }

  const transformed = sentences.map(s => {
    if (wordCount(s.text) <= MAX_WORDS) return s.text;

    let working = s.text;
    for (const p of SPLIT_PATTERNS) {
      const idx = working.toLowerCase().indexOf(p.from.toLowerCase());
      if (idx > 10) {
        const afterIdx = idx + p.from.length;
        if (afterIdx < working.length - 5) {
          const before = working.slice(0, idx);
          const after = working.slice(idx + p.from.length);
          const newSentence = before + p.to + after;
          changes.push({
            from: working.trim(),
            to: newSentence.trim(),
            rule: 'clause:split',
            start: s.start,
            end: s.start + working.length,
          });
          working = newSentence;
          break;
        }
      }
    }
    return working;
  });

  return { result: transformed.join(''), changes };
}

export default splitLongClauses;
