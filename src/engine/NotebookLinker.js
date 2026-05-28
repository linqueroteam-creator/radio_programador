/**
 * NotebookLinker — Vincula nota órfã ao caderno mais provável (PR J)
 *
 * 100% local, sem IA externa. Usa heurística de score combinando:
 *   - 50% similaridade textual com a média dos conteúdos do caderno (cosine)
 *   - 30% compatibilidade de área da vida (caderno.lifeArea === nota.inferredLifeArea)
 *   - 20% palavras-chave em comum (se caderno tem keywords)
 *
 * Threshold: confidence >= 0.6 → vincula. Abaixo, retorna null (nota fica órfã).
 *
 * Doc: docs/HIERARQUIA-AREAS-PROJETOS-CADERNOS-NOTAS.md (4.1, função 2)
 *
 * REGRAS INVIOLÁVEIS:
 *  - Nunca decide "no chute": se score < 0.6, retorna null
 *  - Toda decisão é reversível (usuário pode mover a nota depois)
 *  - Não modifica os dados de entrada
 */

const STOPWORDS = new Set([
  // pronomes / artigos / preposições / verbos auxiliares comuns
  'a', 'o', 'as', 'os', 'um', 'uma', 'uns', 'umas',
  'de', 'do', 'da', 'dos', 'das', 'no', 'na', 'nos', 'nas',
  'em', 'por', 'pelo', 'pela', 'pelos', 'pelas',
  'com', 'sem', 'sob', 'sobre', 'entre', 'até',
  'que', 'qual', 'quem', 'quando', 'onde', 'como',
  'e', 'ou', 'mas', 'porém', 'também', 'tambem',
  'eu', 'tu', 'ele', 'ela', 'nós', 'nos', 'vós', 'eles', 'elas',
  'meu', 'minha', 'seu', 'sua', 'nosso', 'nossa',
  'é', 'são', 'foi', 'era', 'ser', 'estar', 'tem', 'ter', 'tinha',
  'esse', 'essa', 'isso', 'aquele', 'aquela', 'aquilo', 'este', 'esta',
  'já', 'ainda', 'só', 'apenas', 'muito', 'pouco', 'todo', 'toda', 'todos', 'todas',
  'para', 'pra', 'pro', 'foi', 'mais', 'menos', 'bem', 'mal',
  'não', 'sim', 'aí', 'ali', 'lá', 'aqui', 'então', 'agora', 'hoje', 'ontem', 'amanhã',
]);

function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Tokeniza texto: lowercase, remove pontuação, filtra stopwords e palavras curtas.
 */
function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !STOPWORDS.has(w));
}

/**
 * Bag-of-words: { token: frequency }.
 */
function bagOfWords(tokens) {
  const bag = {};
  tokens.forEach(t => { bag[t] = (bag[t] || 0) + 1; });
  return bag;
}

/**
 * Cosine similarity entre dois bags de palavras. Retorna 0..1.
 */
function cosineSimilarity(bagA, bagB) {
  const keysA = Object.keys(bagA);
  const keysB = Object.keys(bagB);
  if (keysA.length === 0 || keysB.length === 0) return 0;
  let dot = 0;
  keysA.forEach(k => {
    if (bagB[k]) dot += bagA[k] * bagB[k];
  });
  const magA = Math.sqrt(keysA.reduce((s, k) => s + bagA[k] * bagA[k], 0));
  const magB = Math.sqrt(keysB.reduce((s, k) => s + bagB[k] * bagB[k], 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

/**
 * Extrai bag-of-words de uma nota.
 */
function noteBag(note) {
  if (!note) return {};
  const text = (note.title || '') + ' ' + stripHtml(note.content || '');
  return bagOfWords(tokenize(text));
}

/**
 * Constrói uma "bag agregada" do caderno juntando todas as notas dentro dele.
 */
function notebookAggregateBag(notebookId, allNotes) {
  const notesInside = (allNotes || []).filter(n =>
    n && n.notebookId === notebookId && !n.isTrash && !n.isArchived
  );
  const bag = {};
  notesInside.forEach(n => {
    const text = (n.title || '') + ' ' + stripHtml(n.content || '');
    tokenize(text).forEach(t => { bag[t] = (bag[t] || 0) + 1; });
  });
  return { bag, count: notesInside.length };
}

/**
 * Vincula uma nota ao caderno mais provável.
 *
 * @param {Object} note — nota órfã (ou candidata a vinculação)
 * @param {Array} notebooks — lista de cadernos disponíveis
 * @param {Array} allNotes — todas as notas do app (pra calcular agregado dos cadernos)
 * @returns {{ notebookId, score, reasons } | null}
 *          null se nenhum caderno atinge confidence >= 0.6
 */
export function linkNoteToNotebook(note, notebooks, allNotes) {
  if (!note || !Array.isArray(notebooks) || notebooks.length === 0) return null;

  const noteBagWords = noteBag(note);
  if (Object.keys(noteBagWords).length === 0) return null;

  const candidates = [];

  notebooks.forEach(nb => {
    if (!nb || !nb.id) return;
    const reasons = [];
    let score = 0;

    // === COMPONENTE 1 (50%): similaridade textual com agregado do caderno ===
    const { bag: nbBag, count } = notebookAggregateBag(nb.id, allNotes);
    let textSim = 0;
    if (count > 0) {
      textSim = cosineSimilarity(noteBagWords, nbBag);
      if (textSim > 0.15) {
        reasons.push(`vocabulário parecido (${Math.round(textSim * 100)}%)`);
      }
    }
    score += textSim * 0.5;

    // === COMPONENTE 2 (30%): área da vida compatível ===
    const noteArea = note.lifeArea !== 'outros' ? note.lifeArea : (note.inferredLifeArea || null);
    if (noteArea && nb.lifeArea && noteArea === nb.lifeArea && noteArea !== 'outros') {
      score += 0.3;
      reasons.push(`mesma área (${noteArea})`);
    } else if (noteArea && nb.lifeArea === 'outros') {
      // caderno genérico — só leve afinidade
      score += 0.05;
    }

    // === COMPONENTE 3 (20%): keywords do caderno presentes na nota ===
    if (Array.isArray(nb.keywords) && nb.keywords.length > 0) {
      const noteText = (note.title + ' ' + stripHtml(note.content)).toLowerCase();
      const matches = nb.keywords.filter(k => k && noteText.includes(k.toLowerCase()));
      if (matches.length > 0) {
        const ratio = Math.min(1, matches.length / nb.keywords.length);
        score += ratio * 0.2;
        reasons.push(`palavras-chave: ${matches.slice(0, 3).join(', ')}`);
      }
    }

    // Empate-quebrador suave: caderno com mais conteúdo ganha levemente
    // (pra evitar empurrar pra cadernos quase vazios). Bonus de 0..0.05.
    if (count > 0) {
      score += Math.min(0.05, count * 0.005);
    }

    if (score > 0) {
      candidates.push({ notebookId: nb.id, score, reasons });
    }
  });

  if (candidates.length === 0) return null;

  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];

  // Threshold inviolável: se não tem 60% de confiança, NÃO vincula.
  // Spec 4.3 — "se confiança < 0.6, deixa órfã. Não chuta."
  if (best.score < 0.6) return null;

  return {
    notebookId: best.notebookId,
    score: Math.round(best.score * 100) / 100,
    reasons: best.reasons,
  };
}

// Exports utilitários (úteis pra testes e pro ConnectionDetector reusar)
export { tokenize, bagOfWords, cosineSimilarity, noteBag, stripHtml };

export default { linkNoteToNotebook };
