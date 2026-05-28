/**
 * LifeAreaSuggester — Motor local de sugestão de área da vida
 *
 * Detecta palavras-chave no título/conteúdo de um Pulso e sugere
 * a área da vida mais provável. 100% local, sem IA externa, sem rede.
 *
 * Uso:
 *   import { suggestLifeArea } from './LifeAreaSuggester';
 *   const suggestion = suggestLifeArea(note);
 *   // { areaId: 'saude', confidence: 0.85, keywords: ['treino', 'academia'] }
 *
 * Regras:
 * - Se confiança < 0.3, retorna null (sem sugestão forte o suficiente)
 * - Se nota já tem lifeArea != 'outros', retorna null (já classificada)
 * - Aceita tanto título quanto conteúdo HTML stripped
 *
 * Doc: estrutura_neurocognitiva_mestre/areas-da-vida.md
 */

// === Léxicos de palavras-chave por área ===
// Cada array contém termos em português (lowercase) que sinalizam a área.
// Termos mais específicos = mais peso.

const KEYWORDS = {
  saude: [
    'treino', 'academia', 'exercício', 'exercicio', 'corrida', 'musculação',
    'dieta', 'alimentação', 'nutrição', 'nutricao', 'vitamina', 'suplemento',
    'sono', 'dormir', 'insônia', 'insonia', 'médico', 'medico', 'consulta',
    'exame', 'saúde', 'saude', 'corpo', 'peso', 'emagrecimento',
    'yoga', 'meditação', 'medicação', 'medicacao', 'remédio', 'remedio',
    'hospital', 'clínica', 'clinica', 'fisioterapia', 'alongamento',
  ],
  emocoes: [
    'sentimento', 'emoção', 'emocao', 'ansiedade', 'terapia', 'terapeuta',
    'psicólogo', 'psicologo', 'psicóloga', 'autoestima', 'tristeza',
    'alegria', 'medo', 'raiva', 'gratidão', 'gratidao', 'diário',
    'reflexão', 'reflexao', 'desabafo', 'chorar', 'felicidade',
    'burnout', 'estresse', 'stress', 'paz', 'bem-estar', 'sonho',
  ],
  intelectual: [
    'estudo', 'estudar', 'livro', 'leitura', 'curso', 'aula', 'aprender',
    'conhecimento', 'artigo', 'pesquisa', 'faculdade', 'universidade',
    'idioma', 'inglês', 'ingles', 'programação', 'programacao', 'código',
    'certificação', 'certificado', 'resumo', 'conceito', 'teoria',
    'hipótese', 'hipotese', 'tese', 'dissertação', 'palestra',
  ],
  carreira: [
    'trabalho', 'emprego', 'empresa', 'reunião', 'reuniao', 'cliente',
    'projeto', 'deadline', 'prazo', 'meta profissional', 'promoção',
    'curriculo', 'currículo', 'entrevista', 'salário', 'salario',
    'freelance', 'portfolio', 'portfólio', 'networking', 'carreira',
    'colega', 'chefe', 'líder', 'lider', 'equipe', 'feedback',
  ],
  financas: [
    'dinheiro', 'investimento', 'investir', 'ação', 'ações', 'bolsa',
    'poupança', 'poupanca', 'orçamento', 'orcamento', 'gasto', 'despesa',
    'receita', 'renda', 'dividendo', 'criptomoeda', 'bitcoin',
    'financeiro', 'financeira', 'banco', 'conta', 'fatura', 'cartão',
    'empréstimo', 'emprestimo', 'dívida', 'divida', 'economia',
  ],
  relacoes: [
    'família', 'familia', 'pai', 'mãe', 'mae', 'filho', 'filha',
    'irmão', 'irmao', 'irmã', 'namorada', 'namorado', 'esposa', 'esposo',
    'amigo', 'amiga', 'amizade', 'relacionamento', 'casal', 'namoro',
    'casamento', 'aniversário', 'aniversario', 'presente', 'conversa',
    'conflito', 'perdão', 'perdao', 'vizinho', 'comunidade',
  ],
  espiritual: [
    'espiritual', 'oração', 'oracao', 'meditação', 'meditacao', 'deus',
    'fé', 'fe', 'propósito', 'proposito', 'sentido', 'alma', 'igreja',
    'templo', 'biblia', 'bíblia', 'mandala', 'chakra', 'universo',
    'transcendência', 'mindfulness', 'contemplação', 'silêncio',
    'retiro', 'valor', 'valores', 'missão', 'missao', 'vocação',
  ],
  lar: [
    'casa', 'apartamento', 'lar', 'cozinha', 'quarto', 'banheiro',
    'decoração', 'decoracao', 'reforma', 'mudança', 'mudanca', 'móvel',
    'movel', 'limpeza', 'organização', 'organizacao', 'jardim',
    'viagem', 'hotel', 'airbnb', 'voo', 'passagem', 'mala',
    'vizinhança', 'condomínio', 'condominio', 'aluguel', 'hipoteca',
  ],
  lazer: [
    'hobby', 'arte', 'música', 'musica', 'violão', 'violao', 'piano',
    'filme', 'série', 'serie', 'netflix', 'jogo', 'game', 'desenho',
    'pintura', 'fotografia', 'dança', 'danca', 'esporte', 'futebol',
    'corrida', 'trilha', 'natureza', 'praia', 'parque', 'diversão',
    'criatividade', 'costura', 'culinária', 'culinaria', 'receita',
  ],
  crescimento: [
    'crescimento', 'desenvolvimento', 'hábito', 'habito', 'rotina',
    'autoconhecimento', 'meta', 'objetivo', 'disciplina', 'foco',
    'produtividade', 'planejamento', 'visão', 'visao', 'sonho grande',
    'transformação', 'transformacao', 'evolução', 'evolucao', 'mudança',
    'identidade', 'quem sou', 'futuro', 'legado', 'propósito de vida',
  ],
};

// Pesos: termos mais longos (compostos) valem mais
function termWeight(term) {
  if (term.includes(' ')) return 2;   // termo composto ("meta profissional") = peso 2
  if (term.length >= 8) return 1.2;   // termo longo ("suplemento") = peso 1.2
  return 1;
}

/**
 * Extrai texto puro de HTML (remove tags).
 * Leve e defensivo.
 */
function stripHtml(html) {
  if (!html || typeof html !== 'string') return '';
  return html.replace(/<[^>]*>/g, ' ').replace(/&[^;]+;/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Sugere a área da vida mais provável para uma nota.
 *
 * @param {Object} note — objeto da nota com title, content, lifeArea
 * @returns {{ areaId: string, confidence: number, keywords: string[] } | null}
 */
export function suggestLifeArea(note) {
  if (!note) return null;
  // Se já foi classificada manualmente, não sugerir
  if (note.lifeArea && note.lifeArea !== 'outros') return null;

  const text = [
    (note.title || ''),
    stripHtml(note.content || ''),
  ].join(' ').toLowerCase();

  if (text.length < 5) return null; // muito curto pra sugerir

  // Pontuação por área
  const scores = {};
  const matchedKeywords = {};

  Object.entries(KEYWORDS).forEach(([areaId, terms]) => {
    let score = 0;
    const matched = [];
    terms.forEach((term) => {
      // Busca com word boundary aproximado (espaço ou início/fim)
      const regex = new RegExp(`(?:^|\\s|[.,;!?])${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|\\s|[.,;!?])`, 'i');
      if (regex.test(' ' + text + ' ')) {
        score += termWeight(term);
        matched.push(term);
      }
    });
    if (score > 0) {
      scores[areaId] = score;
      matchedKeywords[areaId] = matched;
    }
  });

  // Selecionar área com maior score
  const entries = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) return null;

  const [bestAreaId, bestScore] = entries[0];
  const secondScore = entries.length > 1 ? entries[1][1] : 0;

  // Normalizar confiança: baseado em score absoluto + diferença pro segundo
  const confidence = Math.min(1, (bestScore / 4) * (1 + (bestScore - secondScore) / Math.max(bestScore, 1)));

  if (confidence < 0.3) return null; // muito fraco

  return {
    areaId: bestAreaId,
    confidence: Math.round(confidence * 100) / 100,
    keywords: matchedKeywords[bestAreaId] || [],
  };
}

/**
 * Versão batch: sugere área para múltiplas notas.
 * Retorna mapa { noteId: suggestion | null }
 */
export function suggestLifeAreas(notes) {
  const results = {};
  if (!Array.isArray(notes)) return results;
  notes.forEach((note) => {
    if (!note || !note.id) return;
    results[note.id] = suggestLifeArea(note);
  });
  return results;
}

export default { suggestLifeArea, suggestLifeAreas };
