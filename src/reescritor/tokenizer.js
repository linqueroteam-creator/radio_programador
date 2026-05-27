/**
 * REESCRITOR — Tokenizador para portugues brasileiro
 *
 * Quebra o texto em tokens preservando a posicao original (offset, length),
 * para que as transformacoes possam ser aplicadas sem perder o ancoramento
 * com o texto original.
 *
 * Tipos de token:
 *  - 'word'   palavras (incluindo acentos e hifen interno: "guarda-chuva")
 *  - 'punct'  pontuacao (.,;:!?"'(){}[])
 *  - 'space'  espacos em branco e quebras de linha
 *  - 'other'  qualquer outra coisa (numeros, simbolos)
 *
 * Decisoes de design (PT-BR):
 *  - Hifen interno e parte da palavra ("guarda-chuva", "bem-vindo")
 *  - Apostrofo e parte da palavra ("d'agua")
 *  - Numeros sao 'other', nao 'word' (nao queremos sinonimar numeros)
 *  - Pontuacao final (".!?") e separada do ultimo token de palavra
 *
 * Estrategia:
 *  - Regex unico com captura por tipo, varrendo da esquerda pra direita
 *  - O(n) — passa uma vez pelo texto
 *
 * @module tokenizer
 */

// Caracteres validos dentro de uma palavra portuguesa (com acentos e hifen interno)
const WORD_CHARS = "a-zA-ZàáâãäéêëíïóôõöúüçÀÁÂÃÄÉÊËÍÏÓÔÕÖÚÜÇñÑ";
const TOKEN_REGEX = new RegExp(
  // 1) palavra com possivel hifen interno OU apostrofo
  `([${WORD_CHARS}]+(?:[-'][${WORD_CHARS}]+)*)` +
  // 2) pontuacao
  `|([.,;:!?"\\'\\(\\)\\[\\]{}…—–-])` +
  // 3) espaco em branco (incluindo quebras de linha)
  `|(\\s+)` +
  // 4) qualquer outra coisa (numeros, simbolos, emojis)
  `|(\\S)`,
  'g'
);

/**
 * Tokeniza um texto em PT-BR.
 * @param {string} text
 * @returns {Array<{type:'word'|'punct'|'space'|'other', text:string, lower:string, start:number, end:number}>}
 */
export function tokenize(text) {
  if (typeof text !== 'string' || text.length === 0) return [];
  const tokens = [];
  let m;
  TOKEN_REGEX.lastIndex = 0;
  while ((m = TOKEN_REGEX.exec(text)) !== null) {
    const [matched, w, p, s, o] = m;
    const start = m.index;
    const end = start + matched.length;
    let type, value;
    if (w !== undefined) { type = 'word'; value = w; }
    else if (p !== undefined) { type = 'punct'; value = p; }
    else if (s !== undefined) { type = 'space'; value = s; }
    else { type = 'other'; value = o; }
    tokens.push({ type, text: value, lower: type === 'word' ? value.toLowerCase() : value, start, end });
  }
  return tokens;
}

/**
 * Reconstroi o texto original a partir de tokens.
 * Util para confirmar que a tokenizacao e perfeita (cada token preserva
 * sua posicao original).
 */
export function detokenize(tokens) {
  if (!tokens || tokens.length === 0) return '';
  return tokens.map(t => t.text).join('');
}

/**
 * Aplica uma lista de substituicoes a um texto, recebendo entradas no formato:
 *   { from: string, to: string, case_sensitive?: boolean, only_if_word?: boolean }
 *
 * Por padrao:
 *  - case-insensitive
 *  - respeita word boundary (so substitui se "from" estiver isolado por espaco/pontuacao)
 *  - preserva capitalizacao do original (Maiuscula -> Maiuscula, MAIUSCULA -> MAIUSCULA, minuscula -> minuscula)
 *
 * Retorna o texto modificado e a lista de mudancas aplicadas (com posicoes).
 *
 * @param {string} text
 * @param {Array<{from:string, to:string, case_sensitive?:boolean, only_if_word?:boolean}>} entries
 * @returns {{result:string, changes:Array<{from:string,to:string,start:number,end:number}>}}
 */
export function applySubstitutions(text, entries) {
  if (!text || !Array.isArray(entries) || entries.length === 0) {
    return { result: text || '', changes: [] };
  }

  // Ordena entries por tamanho da chave 'from' (decrescente) para que
  // multipalavras venham antes de palavras isoladas, evitando que
  // "vou" capture antes de "vou estar".
  const sorted = [...entries].sort((a, b) => b.from.length - a.from.length);

  // Constroi um regex unificado com alternativas escapadas.
  // Limita o tamanho pra evitar regex gigantes; processa em lotes se necessario.
  const BATCH = 100;
  let working = text;
  const changes = [];

  for (let i = 0; i < sorted.length; i += BATCH) {
    const slice = sorted.slice(i, i + BATCH);
    const indexed = slice.map((e, idx) => ({ ...e, _idx: idx }));
    const escaped = indexed.map(e => escapeRegex(e.from)).join('|');
    const regex = new RegExp(
      // Word boundary opcional dependendo das opcoes individuais — fazemos por entrada
      // mas a primeira passagem usa boundary geral
      `(^|[^${WORD_CHARS}])(${escaped})(?=$|[^${WORD_CHARS}])`,
      'gi'
    );

    working = working.replace(regex, (full, prefix, captured, offset) => {
      // Identifica qual entrada bateu (case-insensitive)
      const lcCaptured = captured.toLowerCase();
      const entry = indexed.find(e => e.from.toLowerCase() === lcCaptured) || indexed[0];
      const replacement = preserveCapitalization(captured, entry.to);
      const startInWorking = offset + prefix.length;
      const endInWorking = startInWorking + captured.length;
      changes.push({
        from: captured,
        to: replacement,
        start: startInWorking,
        end: endInWorking,
      });
      return prefix + replacement;
    });
  }

  return { result: working, changes };
}

/**
 * Escapa caracteres especiais de regex em uma string.
 */
function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Preserva a capitalizacao do original ao aplicar a substituicao.
 *  - "Casa" -> "Vivenda"   (primeira maiuscula)
 *  - "CASA" -> "VIVENDA"   (tudo maiusculo)
 *  - "casa" -> "vivenda"   (tudo minusculo, default)
 */
export function preserveCapitalization(original, replacement) {
  if (!original || !replacement) return replacement;
  // tudo maiusculo
  if (original === original.toUpperCase() && original.length > 1) {
    return replacement.toUpperCase();
  }
  // primeira maiuscula
  const first = original[0];
  if (first && first === first.toUpperCase() && first !== first.toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  // tudo minusculo (default)
  return replacement;
}

/**
 * Retorna apenas as palavras de um texto, preservando ordem.
 */
export function words(text) {
  return tokenize(text).filter(t => t.type === 'word').map(t => t.text);
}

/**
 * Conta palavras (util pra meta de "modo conciso").
 */
export function wordCount(text) {
  return words(text).length;
}
