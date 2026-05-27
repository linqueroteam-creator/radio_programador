/**
 * REESCRITOR — POS-Lite (identificador morfologico leve)
 *
 * Heuristica baseada em sufixos para classificar palavras em PT-BR sem
 * precisar de modelo treinado. NAO e um POS tagger profissional. E uma
 * camada de "dica" suficiente para guiar transformacoes simples.
 *
 * Categorias retornadas:
 *  - 'verbo-infinitivo'      "fazer", "correr", "partir"
 *  - 'verbo-gerundio'        "fazendo", "correndo", "partindo"
 *  - 'verbo-particicpio'     "feito", "corrido", "partido" (heuristica fraca)
 *  - 'verbo-conjugado'       qualquer verbo identificado por padrao morfologico
 *  - 'adjetivo'              "bonito", "rapido", "vermelho" (heuristica)
 *  - 'adverbio'              "rapidamente", "claramente"
 *  - 'substantivo-abstrato'  "criacao", "felicidade", "movimento"
 *  - 'desconhecido'          quando nada bate
 *
 * @module posLite
 */

const VOGAIS = 'aeiouáéíóúâêôãõ';

/**
 * Classifica uma palavra usando heuristica de sufixos.
 * @param {string} word
 * @returns {string} categoria
 */
export function classify(word) {
  if (!word || typeof word !== 'string') return 'desconhecido';
  const w = word.toLowerCase().trim();
  if (w.length < 2) return 'desconhecido';

  // === Adverbios (-mente) ===
  if (w.endsWith('mente') && w.length > 6) return 'adverbio';

  // === Verbos no gerundio (-ando, -endo, -indo) ===
  if (/(?:ando|endo|indo)$/.test(w) && w.length > 5) return 'verbo-gerundio';

  // === Verbos no infinitivo (-ar, -er, -ir) ===
  if (/(?:ar|er|ir)$/.test(w) && w.length >= 3) {
    // Filtros: evita falsos positivos como "para", "este", "abrir" (esse e verbo)
    // "para" termina em "ar" mas e preposicao; resolveremos por stopwords no caller
    return 'verbo-infinitivo';
  }

  // === Substantivos abstratos (-cao, -sao, -dade, -mento, -agem) ===
  if (/(?:cao|ção|sao|são|dade|mento|agem)$/.test(w) && w.length > 4) return 'substantivo-abstrato';

  // === Adjetivos (-oso/osa, -ivel, -avel, -ico/ica, -ente) ===
  if (/(?:oso|osa|ivel|ível|avel|ável|ico|ica|ente|ento|ado|ada|ido|ida)$/.test(w) && w.length > 3) {
    // -ado/-ada/-ido/-ida tambem podem ser participio. Marcamos como adjetivo aqui;
    // o caller pode refinar pelo contexto.
    return 'adjetivo';
  }

  return 'desconhecido';
}

/**
 * Transforma um verbo do gerundio (-ando/-endo/-indo) para o infinitivo
 * (-ar/-er/-ir). Usado pelo transformer de gerundismo.
 *
 * @param {string} gerund palavra em gerundio
 * @returns {string|null} infinitivo correspondente, ou null se nao puder converter
 */
export function gerundToInfinitive(gerund) {
  if (!gerund || typeof gerund !== 'string') return null;
  const g = gerund.toLowerCase();

  // Excecoes irregulares conhecidas (lista pequena, expansao futura)
  const IRREGULARES = {
    'pondo': 'pôr',
    'tendo': 'ter',
    'vindo': 'vir',
    'sendo': 'ser',
    'indo': 'ir',
    'rindo': 'rir',
    'fazendo': 'fazer',
    'dizendo': 'dizer',
    'trazendo': 'trazer',
    'lendo': 'ler',
    'crendo': 'crer',
    'vendo': 'ver',
    'caindo': 'cair',
    'saindo': 'sair',
    'doendo': 'doer',
    'pedindo': 'pedir',
    'medindo': 'medir',
    'ouvindo': 'ouvir',
    'sorrindo': 'sorrir',
    'mantendo': 'manter',
    'detendo': 'deter',
    'obtendo': 'obter',
    'dormindo': 'dormir',
  };
  if (IRREGULARES[g]) return preserveCase(gerund, IRREGULARES[g]);

  // Regras regulares
  if (g.endsWith('ando') && g.length >= 5) {
    return preserveCase(gerund, g.slice(0, -4) + 'ar');
  }
  if (g.endsWith('endo') && g.length >= 5) {
    return preserveCase(gerund, g.slice(0, -4) + 'er');
  }
  if (g.endsWith('indo') && g.length >= 5) {
    return preserveCase(gerund, g.slice(0, -4) + 'ir');
  }
  return null;
}

/**
 * Detecta se um token e provavelmente verbo na 3a pessoa do singular,
 * indicador classico de voz passiva ("foi feito por X", "e analisado por Y").
 *
 * Heuristica simples; usado pelo voice transformer.
 */
export function looksLikeParticiple(word) {
  if (!word) return false;
  const w = word.toLowerCase();
  return /(?:ado|ada|ido|ida|ados|adas|idos|idas|to|ta|so|sa)$/.test(w) && w.length > 3;
}

function preserveCase(source, replacement) {
  if (!source) return replacement;
  if (source === source.toUpperCase()) return replacement.toUpperCase();
  if (source[0] === source[0].toUpperCase() && source[0] !== source[0].toLowerCase()) {
    return replacement[0].toUpperCase() + replacement.slice(1);
  }
  return replacement;
}

/**
 * Estima a "complexidade" de uma palavra. Usado pelo modo Simples para
 * priorizar substituicoes pelas palavras mais "dificeis".
 *  - quantidade de silabas (aproximada por contagem de vogais)
 *  - tamanho em caracteres
 *  - tem sufixo erudito (-mente, -izar, -ssimo, -izacao, -ico)
 *
 * @param {string} word
 * @returns {number} score (>= 1)
 */
export function complexityScore(word) {
  if (!word) return 0;
  const w = word.toLowerCase();
  const len = w.length;
  let syllables = 0;
  let prevVowel = false;
  for (let i = 0; i < w.length; i++) {
    const c = w[i];
    const isVowel = VOGAIS.includes(c);
    if (isVowel && !prevVowel) syllables++;
    prevVowel = isVowel;
  }
  let score = len + syllables * 1.5;
  if (/mente$/.test(w)) score += 2;
  if (/(?:cao|ção|sao|são|dade)$/.test(w)) score += 1.5;
  if (/(?:izar|izado|izacao|ização)$/.test(w)) score += 2;
  if (/(?:issimo|íssimo|errimo|érrimo)$/.test(w)) score += 2;
  return score;
}
