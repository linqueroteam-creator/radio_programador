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
 * Transforma um verbo do gerundio (-ando/-endo/-indo) para o futuro do
 * presente do indicativo, conjugado conforme a pessoa indicada.
 *
 * Pessoas suportadas:
 *  - '1s'  1a pessoa singular: -ei  ("verificarei")
 *  - '3s'  3a pessoa singular: -a   ("verificara")
 *  - '1p'  1a pessoa plural:   -emos ("verificaremos")
 *  - '3p'  3a pessoa plural:   -ao  ("verificarao")
 *
 * Cobre verbos irregulares classicos: fazer, dizer, trazer, por (-pondo).
 *
 * @param {string} gerund palavra em gerundio
 * @param {'1s'|'3s'|'1p'|'3p'} [person='3s'] pessoa/numero do verbo conjugado
 * @returns {string|null} forma conjugada no futuro, ou null se nao puder converter
 */
export function gerundToFuture(gerund, person = '3s') {
  if (!gerund || typeof gerund !== 'string') return null;
  const g = gerund.toLowerCase();

  const FUTURE_IRREGULARES = {
    'fazendo':  { '1s': 'farei',   '3s': 'fará',   '1p': 'faremos',   '3p': 'farão' },
    'dizendo':  { '1s': 'direi',   '3s': 'dirá',   '1p': 'diremos',   '3p': 'dirão' },
    'trazendo': { '1s': 'trarei',  '3s': 'trará',  '1p': 'traremos',  '3p': 'trarão' },
    'pondo':    { '1s': 'porei',   '3s': 'porá',   '1p': 'poremos',   '3p': 'porão' },
    'tendo':    { '1s': 'terei',   '3s': 'terá',   '1p': 'teremos',   '3p': 'terão' },
    'vindo':    { '1s': 'virei',   '3s': 'virá',   '1p': 'viremos',   '3p': 'virão' },
    'sendo':    { '1s': 'serei',   '3s': 'será',   '1p': 'seremos',   '3p': 'serão' },
    'indo':     { '1s': 'irei',    '3s': 'irá',    '1p': 'iremos',    '3p': 'irão' },
    'vendo':    { '1s': 'verei',   '3s': 'verá',   '1p': 'veremos',   '3p': 'verão' },
    'lendo':    { '1s': 'lerei',   '3s': 'lerá',   '1p': 'leremos',   '3p': 'lerão' },
    'mantendo': { '1s': 'manterei', '3s': 'manterá', '1p': 'manteremos', '3p': 'manterão' },
    'detendo':  { '1s': 'deterei', '3s': 'deterá', '1p': 'deteremos', '3p': 'deterão' },
    'obtendo':  { '1s': 'obterei', '3s': 'obterá', '1p': 'obteremos', '3p': 'obterão' },
  };

  if (FUTURE_IRREGULARES[g] && FUTURE_IRREGULARES[g][person]) {
    return preserveCase(gerund, FUTURE_IRREGULARES[g][person]);
  }

  const infinitive = gerundToInfinitive(g);
  if (!infinitive) return null;

  const FUTURE_ENDINGS = { '1s': 'ei', '3s': 'á', '1p': 'emos', '3p': 'ão' };
  const ending = FUTURE_ENDINGS[person] || FUTURE_ENDINGS['3s'];

  // Remove circunflexo do "pôr" (caso raro que ja foi tratado acima, mas defensivo)
  const stem = infinitive.toLowerCase().replace(/^pôr$/, 'por');
  return preserveCase(gerund, stem + ending);
}

/**
 * Transforma um verbo do gerundio para o particípio passado.
 *
 *  "revisando" -> "revisado"
 *  "vendendo"  -> "vendido"
 *  "abrindo"   -> "aberto" (irregular)
 *
 * Usado pelos padroes de gerundismo composto ("tenho estado X-ndo" -> "tenho X-do").
 *
 * @param {string} gerund palavra em gerundio
 * @returns {string|null} particípio masculino singular, ou null se nao puder converter
 */
export function gerundToParticiple(gerund) {
  if (!gerund || typeof gerund !== 'string') return null;
  const g = gerund.toLowerCase();

  const IRREGULARES = {
    'fazendo': 'feito',
    'dizendo': 'dito',
    'pondo':   'posto',
    'vendo':   'visto',
    'escrevendo': 'escrito',
    'abrindo':  'aberto',
    'cobrindo': 'coberto',
    'descobrindo': 'descoberto',
    'pagando':  'pago',
    'pegando':  'pego',
    'ganhando': 'ganho',
    'gastando': 'gasto',
    'trazendo': 'trazido',
  };
  if (IRREGULARES[g]) return preserveCase(gerund, IRREGULARES[g]);

  if (g.endsWith('ando') && g.length >= 5) return preserveCase(gerund, g.slice(0, -4) + 'ado');
  if (g.endsWith('endo') && g.length >= 5) return preserveCase(gerund, g.slice(0, -4) + 'ido');
  if (g.endsWith('indo') && g.length >= 5) return preserveCase(gerund, g.slice(0, -4) + 'ido');
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
